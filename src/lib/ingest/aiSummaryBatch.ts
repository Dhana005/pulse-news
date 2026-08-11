import type { SupabaseClient } from "@supabase/supabase-js";

// Batch-mode replacement for the old synchronous per-article rewriteDescription
// calls in aiSummary.ts (no longer invoked from the ingest pipeline — see
// run.ts) — Gemini's Batch API is 50% cheaper for both input and output
// tokens. Batch jobs are asynchronous: submit now, results ready later
// (verified empirically against the real API: ~90s for a 2-item test batch;
// target SLA up to 24h for larger ones), so this is a submit-and-poll cycle
// spread across cron runs, not a single blocking call. See
// supabase/migrations/0017_ai_summary_batching.sql for the tracking schema.
// Called by scripts/ai-summary-batch.ts locally and the ai-summary-batch
// edge function in production — kept in sync by hand, same reasoning as
// aiSummary.ts/images.ts.

const TEXT_MODEL = "gemini-3.1-flash-lite";
const BATCH_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${TEXT_MODEL}:batchGenerateContent`;

// Kill switch — flip to true to disable submitting new batches. Existing
// in-flight batches still get polled/collected either way, so a paid job
// never gets stranded.
const AI_SUMMARY_DISABLED = false;

const MAX_CANDIDATES_PER_BATCH = 200;

// Same reasoning and value as aiSummary.ts's MAX_DEK_INPUT_CHARS — some
// NewsData.io sources return their full article body as "description"
// (seen up to 15,435 chars), which is far more than a 2-3 sentence rewrite
// needs as source material.
const MAX_DEK_INPUT_CHARS = 500;

function buildRewritePrompt(headline: string, dek: string): string {
  const truncatedDek =
    dek.length > MAX_DEK_INPUT_CHARS ? dek.slice(0, MAX_DEK_INPUT_CHARS) + "…" : dek;
  return (
    "Write an original Tamil news summary for a news aggregator site, based only on the facts in the " +
    "headline and original summary below. Do not invent any facts, numbers, names, dates, or quotes that " +
    "are not present in the source material below — this is the single most important rule.\n\n" +
    "If the source material below has enough detail, write it as 2 short paragraphs (roughly 4-6 sentences " +
    "total) explaining what happened, using only the facts given. If the source material is very brief " +
    "(e.g. barely more than the headline), do not pad it with invented detail — instead write a single " +
    "well-formed paragraph of 2-3 sentences that faithfully expresses the same facts in your own words.\n\n" +
    "If the original summary below is in English or mixed English/Tamil, translate it to Tamil as part of " +
    "the rewrite. Do not copy sentences verbatim from the original summary — express it in your own words " +
    "while preserving every fact exactly.\n\n" +
    "Reply with the Tamil summary text only — no preamble, no headings, no quotes, no language other than " +
    "Tamil. Separate paragraphs with a blank line.\n\n" +
    `Headline: ${headline}\nOriginal summary: ${truncatedDek}`
  );
}

interface CandidateRow {
  slug: string;
  headline: string;
  dek: string;
}

// Submits one new batch job if none is currently in flight (checked by the
// caller — see runAiSummaryBatchCycle below). Marks the selected rows'
// ai_summary_batch_name so the next cycle's candidate query skips them.
async function submitBatch(supabase: SupabaseClient, apiKey: string): Promise<number> {
  const { data: candidates, error: fetchError } = await supabase
    .from("articles")
    .select("slug,headline,dek")
    .not("source_url", "is", null)
    .not("dek", "is", null)
    .neq("dek", "")
    .is("ai_summary", null)
    .is("ai_summary_batch_name", null)
    .order("published_at", { ascending: false })
    .limit(MAX_CANDIDATES_PER_BATCH);
  if (fetchError) throw fetchError;
  if (!candidates || candidates.length === 0) return 0;

  const requests = (candidates as CandidateRow[]).map((row) => ({
    request: { contents: [{ parts: [{ text: buildRewritePrompt(row.headline, row.dek) }] }] },
    metadata: { key: row.slug },
  }));

  const res = await fetch(BATCH_ENDPOINT, {
    method: "POST",
    headers: { "x-goog-api-key": apiKey, "Content-Type": "application/json" },
    body: JSON.stringify({
      batch: {
        display_name: `ai-summary-${new Date().toISOString()}`,
        input_config: { requests: { requests } },
      },
    }),
    signal: AbortSignal.timeout(30000),
  });
  if (!res.ok) throw new Error(`batch submit failed: HTTP ${res.status} ${await res.text()}`);
  const json = await res.json();
  const batchName: string | undefined = json?.name;
  if (!batchName) throw new Error(`batch submit returned no name: ${JSON.stringify(json)}`);

  const { error: insertError } = await supabase.from("ai_summary_batches").insert({
    batch_name: batchName,
    status: "pending",
    request_count: requests.length,
  });
  if (insertError) throw insertError;

  const slugs = (candidates as CandidateRow[]).map((row) => row.slug);
  const { error: markError } = await supabase
    .from("articles")
    .update({ ai_summary_batch_name: batchName })
    .in("slug", slugs);
  if (markError) throw markError;

  return requests.length;
}

interface InlinedResponseItem {
  response?: {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  metadata?: { key?: string };
  error?: { message?: string };
}

// Polls every batch currently marked 'pending' in our own tracking table
// (not Gemini's list endpoint — our DB is the source of truth for "which
// batches did we submit"). Collects results for any that finished, and
// un-marks articles from any that failed so they're retried next cycle.
async function pollAndCollectBatches(supabase: SupabaseClient, apiKey: string): Promise<{ polled: number; collected: number }> {
  const { data: pendingBatches, error: fetchError } = await supabase
    .from("ai_summary_batches")
    .select("id,batch_name")
    .eq("status", "pending");
  if (fetchError) throw fetchError;
  if (!pendingBatches || pendingBatches.length === 0) return { polled: 0, collected: 0 };

  let collected = 0;
  for (const batch of pendingBatches) {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/${batch.batch_name}`, {
      headers: { "x-goog-api-key": apiKey },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) continue; // transient — retry next cycle
    const json = await res.json();
    const state: string | undefined = json?.metadata?.state;

    if (state === "BATCH_STATE_SUCCEEDED") {
      const items: InlinedResponseItem[] =
        json?.response?.inlinedResponses?.inlinedResponses ?? [];
      for (const item of items) {
        const slug = item.metadata?.key;
        const text = item.response?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
        if (!slug || !text) continue;
        await supabase
          .from("articles")
          .update({ ai_summary: text, ai_summary_batch_name: null })
          .eq("slug", slug);
      }
      await supabase
        .from("ai_summary_batches")
        .update({ status: "succeeded", completed_at: new Date().toISOString() })
        .eq("id", batch.id);
      collected += items.length;
    } else if (state === "BATCH_STATE_FAILED" || state === "BATCH_STATE_CANCELLED" || state === "BATCH_STATE_EXPIRED") {
      await supabase
        .from("articles")
        .update({ ai_summary_batch_name: null })
        .eq("ai_summary_batch_name", batch.batch_name);
      await supabase
        .from("ai_summary_batches")
        .update({ status: "failed", completed_at: new Date().toISOString() })
        .eq("id", batch.id);
    }
    // else PENDING/RUNNING — leave as is, check again next cycle
  }

  return { polled: pendingBatches.length, collected };
}

export async function runAiSummaryBatchCycle(
  supabase: SupabaseClient,
): Promise<{ polled: number; collected: number; submitted: number }> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return { polled: 0, collected: 0, submitted: 0 };

  const { polled, collected } = await pollAndCollectBatches(supabase, apiKey);

  // Only ever one batch in flight at a time — keeps tracking simple and
  // avoids submitting the same backlog into two overlapping batches.
  const { count: pendingCount } = await supabase
    .from("ai_summary_batches")
    .select("id", { count: "exact", head: true })
    .eq("status", "pending");
  const hasPending = (pendingCount ?? 0) > 0;

  let submitted = 0;
  if (!AI_SUMMARY_DISABLED && !hasPending) {
    submitted = await submitBatch(supabase, apiKey);
  }

  return { polled, collected, submitted };
}
