// Writes an original Tamil summary of an aggregated article's dek so the
// article page can show real on-site content, not just a teaser + outbound
// link (AdSense flags pages whose only content is a link to another site as
// "insufficient content" — see the article page's "PulseNews சுருக்கம்"
// block). No-op without GEMINI_API_KEY, same fallback-quietly pattern as
// images.ts in this directory. Called once per article at ingest time —
// see generateAiSummaries in run.ts — not per page view.

const TEXT_MODEL = "gemini-3.1-flash-lite";

// Kill switch — flip to true to disable again.
const AI_SUMMARY_DISABLED = false;

function buildRewritePrompt(headline: string, dek: string): string {
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
    `Headline: ${headline}\nOriginal summary: ${dek}`
  );
}

export async function rewriteDescription(headline: string, dek: string): Promise<string | null> {
  if (AI_SUMMARY_DISABLED) return null;
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || !dek) return null;

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/${TEXT_MODEL}:generateContent`,
      {
        method: "POST",
        headers: { "x-goog-api-key": apiKey, "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: buildRewritePrompt(headline, dek) }] }],
        }),
        signal: AbortSignal.timeout(15000),
      },
    );
    if (!res.ok) return null;

    const json = await res.json();
    const text = json?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    return text || null;
  } catch {
    return null;
  }
}
