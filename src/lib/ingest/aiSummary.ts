// Paraphrases (and translates, when needed) an aggregated article's dek so
// the article page can show a description without linking out to the
// publisher. No-op without GEMINI_API_KEY, same fallback-quietly pattern as
// images.ts in this directory. Called once per article at ingest time —
// see generateAiSummaries in run.ts — not per page view.

const TEXT_MODEL = "gemini-3.1-flash-lite";

// Kill switch — flip to false to re-enable. Turned off since the article
// page now only displays the publisher-provided dek, not this AI rewrite.
const AI_SUMMARY_DISABLED = true;

function buildRewritePrompt(headline: string, dek: string): string {
  return (
    "Rewrite the following news summary, in your own words, as a Tamil summary for a news aggregator site. " +
    "If the original summary below is in English or mixed English/Tamil, translate it to Tamil as part of the rewrite. " +
    "Paraphrase — do not copy sentences verbatim — but preserve every fact exactly. " +
    "Keep it to 1-2 sentences, roughly the same length as the original. " +
    "Reply with the rewritten Tamil summary only — no preamble, no quotes, no language other than Tamil.\n\n" +
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
