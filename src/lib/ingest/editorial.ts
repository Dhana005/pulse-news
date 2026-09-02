import { createClient } from "@supabase/supabase-js";
import { CATEGORIES } from "../categories";

// Drafts a genuinely original article by combining multiple sources'
// coverage of the same real-world story — the "AI-assisted-but-heavily-
// edited" content path decided on 2026-09-02, after an audit found the
// entire site was rewrite-and-link-out aggregation with zero independently-
// written content anywhere, which is very likely the real driver behind
// AdSense's repeated "insufficient content or content quality" rejection.
//
// Nothing this module produces ever reaches `articles` (and therefore the
// live site) on its own — it only inserts into `editorial_drafts` as
// 'pending'. A human must review and approve each one via /admin/drafts
// (see src/app/api/admin/drafts/[id]/route.ts) before it publishes. This
// is the whole point: an unreviewed AI-generated article is the same
// problem in different clothes, and Google's spam policies treat
// unsupervised scaled AI content as a worse violation than plain thin
// content.

const TEXT_MODEL = "gemini-3.1-flash-lite";
const LOOKBACK_HOURS = 36;
const MAX_CANDIDATES_PER_CATEGORY = 25;
const MIN_SOURCES_PER_CLUSTER = 2;

interface CandidateRow {
  id: string;
  headline: string;
  dek: string | null;
  ai_summary: string | null;
  source: string | null;
  source_url: string | null;
  category_key: string;
  published_at: string;
}

function supabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase service credentials.");
  return createClient(url, key);
}

async function callGemini(prompt: string, apiKey: string): Promise<string | null> {
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/${TEXT_MODEL}:generateContent`,
      {
        method: "POST",
        headers: { "x-goog-api-key": apiKey, "Content-Type": "application/json" },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
        signal: AbortSignal.timeout(30000),
      },
    );
    if (!res.ok) return null;
    const json = await res.json();
    const text = json?.candidates?.[0]?.content?.parts?.[0]?.text;
    return typeof text === "string" ? text.trim() : null;
  } catch {
    return null;
  }
}

// Gemini sometimes wraps JSON in ```json fences despite instructions not to.
function extractJson(text: string): unknown {
  const cleaned = text
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/, "")
    .replace(/```\s*$/, "")
    .trim();
  return JSON.parse(cleaned);
}

async function findClustersInCategory(candidates: CandidateRow[], apiKey: string): Promise<number[][]> {
  if (candidates.length < MIN_SOURCES_PER_CLUSTER) return [];

  const listing = candidates
    .map((c, i) => `${i}. [${c.source ?? "?"}] ${c.headline} — ${(c.ai_summary || c.dek || "").slice(0, 200)}`)
    .join("\n");

  const prompt =
    "You are grouping Tamil news article listings by real-world story. Below is a numbered list of " +
    "recent articles (source in brackets, then headline, then a short summary) from one category.\n\n" +
    "Find groups of 2 or more articles that are clearly reporting on the SAME specific real-world event " +
    "or story — not just the same general topic. Only group articles whose [source] differs from each " +
    "other within the group (articles from the same source covering the same event don't count — the goal " +
    "is multi-source coverage of one story). Be conservative: if you're not confident two articles are " +
    "about the exact same event, do not group them.\n\n" +
    "Reply with ONLY a JSON array of arrays of the 0-based indices, one inner array per group, e.g. " +
    "[[2,5,9],[1,7]]. If there are no qualifying groups, reply with [].\n\n" +
    listing;

  const text = await callGemini(prompt, apiKey);
  if (!text) return [];
  try {
    const parsed = extractJson(text);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (group): group is number[] =>
        Array.isArray(group) &&
        group.length >= MIN_SOURCES_PER_CLUSTER &&
        group.every((n) => Number.isInteger(n) && n >= 0 && n < candidates.length),
    );
  } catch {
    return [];
  }
}

interface DraftResult {
  headline: string;
  paragraphs: string[];
}

async function synthesizeDraft(sources: CandidateRow[], apiKey: string): Promise<DraftResult | null> {
  const sourceBlocks = sources
    .map(
      (s, i) =>
        `Source ${i + 1} (${s.source ?? "unknown"}):\nHeadline: ${s.headline}\nDetails: ${
          s.ai_summary || s.dek || "(no summary available)"
        }`,
    )
    .join("\n\n");

  const prompt =
    "Write an original Tamil news article by combining and cross-referencing the following sources, " +
    "which all report on the same real-world event. Use only facts present in the sources below — do not " +
    "invent any fact, number, name, date, or quote not present in this material. This is the single most " +
    "important rule. Where sources give different details about the same event, combine them into a " +
    "fuller picture; where they overlap, don't repeat the same fact twice.\n\n" +
    "Structure: an opening paragraph stating what happened, then 2-4 more paragraphs covering further " +
    "detail, context, and why it matters — but only using material actually present in the sources, never " +
    "invented background. Write in your own words throughout — do not copy sentences verbatim from any " +
    "source. Plain paragraphs only, no headers, no bullet points, no markdown.\n\n" +
    'Reply with ONLY a JSON object: {"headline": "...", "paragraphs": ["...", "..."]} — headline is a ' +
    "fresh Tamil headline for this combined piece (not copied from any one source), paragraphs is the " +
    "array of body paragraphs as plain strings.\n\n" +
    sourceBlocks;

  const text = await callGemini(prompt, apiKey);
  if (!text) return null;
  try {
    const parsed = extractJson(text) as { headline?: unknown; paragraphs?: unknown };
    if (
      typeof parsed.headline !== "string" ||
      !Array.isArray(parsed.paragraphs) ||
      parsed.paragraphs.length === 0 ||
      parsed.paragraphs.some((p) => typeof p !== "string")
    ) {
      return null;
    }
    return { headline: parsed.headline, paragraphs: parsed.paragraphs as string[] };
  } catch {
    return null;
  }
}

export interface GenerateDraftsResult {
  categoriesScanned: number;
  clustersFound: number;
  draftsCreated: number;
  errors: string[];
}

export async function generateEditorialDrafts(): Promise<GenerateDraftsResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("Missing GEMINI_API_KEY.");
  const supabase = supabaseAdmin();

  const since = new Date(Date.now() - LOOKBACK_HOURS * 60 * 60 * 1000).toISOString();
  const errors: string[] = [];
  let clustersFound = 0;
  let draftsCreated = 0;

  // Source article rows already claimed by an existing pending/approved
  // draft, so re-running generation doesn't propose the same story twice.
  const { data: existingDrafts, error: existingError } = await supabase
    .from("editorial_drafts")
    .select("source_article_ids")
    .in("status", ["pending", "approved"]);
  if (existingError) throw existingError;
  const claimed = new Set((existingDrafts ?? []).flatMap((d) => d.source_article_ids as string[]));

  for (const category of CATEGORIES) {
    const { data, error } = await supabase
      .from("articles")
      .select("id, headline, dek, ai_summary, source, source_url, category_key, published_at")
      .eq("category_key", category.key)
      .eq("has_video", false)
      .not("source_url", "is", null)
      .gt("published_at", since)
      .order("published_at", { ascending: false })
      .limit(MAX_CANDIDATES_PER_CATEGORY);

    if (error) {
      errors.push(`${category.key}: ${error.message}`);
      continue;
    }
    const candidates = ((data ?? []) as CandidateRow[]).filter((c) => !claimed.has(c.id));
    if (candidates.length < MIN_SOURCES_PER_CLUSTER) continue;

    const clusters = await findClustersInCategory(candidates, apiKey);
    const contentType = category.key === "cinema" ? "cinema" : "news";

    for (const indices of clusters) {
      const clusterRows = indices.map((i) => candidates[i]);
      if (clusterRows.some((r) => claimed.has(r.id))) continue;
      const distinctSources = new Set(clusterRows.map((r) => r.source));
      if (distinctSources.size < MIN_SOURCES_PER_CLUSTER) continue;

      clustersFound++;
      const draft = await synthesizeDraft(clusterRows, apiKey);
      if (!draft) {
        errors.push(`${category.key}: synthesis failed for cluster [${indices.join(",")}]`);
        continue;
      }

      const sourceRefs = clusterRows.map((r) => ({ name: r.source, url: r.source_url, headline: r.headline }));

      const { error: insertError } = await supabase.from("editorial_drafts").insert({
        headline: draft.headline,
        category_key: category.key,
        content_type: contentType,
        body: draft.paragraphs,
        source_refs: sourceRefs,
        source_article_ids: clusterRows.map((r) => r.id),
        status: "pending",
      });
      if (insertError) {
        errors.push(`${category.key}: insert failed — ${insertError.message}`);
        continue;
      }
      draftsCreated++;
      clusterRows.forEach((r) => claimed.add(r.id));
    }
  }

  return { categoriesScanned: CATEGORIES.length, clustersFound, draftsCreated, errors };
}
