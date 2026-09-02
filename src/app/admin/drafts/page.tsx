"use client";

import { useState } from "react";

interface SourceRef {
  name: string | null;
  url: string | null;
  headline: string;
}

interface Draft {
  id: string;
  headline: string;
  category_key: string;
  content_type: string;
  body: string[];
  source_refs: SourceRef[];
  created_at: string;
}

interface GenerateResult {
  categoriesScanned: number;
  clustersFound: number;
  draftsCreated: number;
  errors: string[];
}

// Editorial draft review queue — see src/lib/ingest/editorial.ts. Nothing
// here reaches the live site until a human explicitly approves it: this
// page IS the human-in-the-loop step, not a convenience wrapper around
// auto-publishing.
export default function DraftsReviewPage() {
  const [password, setPassword] = useState("");
  const [drafts, setDrafts] = useState<Draft[] | null>(null);
  const [edits, setEdits] = useState<Record<string, { headline: string; body: string }>>({});
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [genResult, setGenResult] = useState<GenerateResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [publishedNotes, setPublishedNotes] = useState<Record<string, string>>({});

  function authHeaders() {
    return { "x-admin-password": password, "Content-Type": "application/json" };
  }

  async function loadDrafts() {
    if (!password) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/drafts", { headers: authHeaders() });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load drafts.");
      setDrafts(json.drafts);
      const nextEdits: Record<string, { headline: string; body: string }> = {};
      for (const d of json.drafts as Draft[]) {
        nextEdits[d.id] = { headline: d.headline, body: d.body.join("\n\n") };
      }
      setEdits(nextEdits);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load drafts.");
    } finally {
      setLoading(false);
    }
  }

  async function generateDrafts() {
    if (!password) return;
    setGenerating(true);
    setError(null);
    setGenResult(null);
    try {
      const res = await fetch("/api/admin/drafts/generate", { method: "POST", headers: authHeaders() });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Generation failed.");
      setGenResult(json);
      await loadDrafts();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed.");
    } finally {
      setGenerating(false);
    }
  }

  async function review(id: string, action: "approve" | "reject") {
    setBusyId(id);
    setError(null);
    try {
      const payload =
        action === "approve"
          ? {
              action,
              headline: edits[id]?.headline,
              paragraphs: (edits[id]?.body ?? "")
                .split(/\n\s*\n/)
                .map((p) => p.trim())
                .filter(Boolean),
            }
          : { action };

      const res = await fetch(`/api/admin/drafts/${id}`, {
        method: "PATCH",
        headers: authHeaders(),
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Action failed.");

      if (action === "approve") {
        setPublishedNotes((prev) => ({ ...prev, [id]: `/ta/${json.category}/${json.slug}` }));
      }
      setDrafts((prev) => (prev ?? []).filter((d) => d.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action failed.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="max-w-[760px] w-full mx-auto px-4 py-10">
      <h1 className="text-[24px] font-bold mb-2">Editorial Draft Review</h1>
      <p className="text-[13.5px] text-text-muted mb-6">
        AI drafts combine 2+ sources covering the same story into one original piece. Nothing publishes until
        you approve it here — edit freely before approving.
      </p>

      <div className="flex gap-2 mb-6">
        <input
          type="password"
          placeholder="Admin password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="border border-border rounded-lg px-3 py-2 bg-surface flex-1"
        />
        <button
          type="button"
          onClick={loadDrafts}
          disabled={!password || loading}
          className="rounded-lg px-4 py-2 font-semibold disabled:opacity-50"
          style={{ background: "var(--accent)", color: "var(--accent-text)" }}
        >
          {loading ? "Loading…" : "Load drafts"}
        </button>
        <button
          type="button"
          onClick={generateDrafts}
          disabled={!password || generating}
          className="rounded-lg px-4 py-2 font-semibold border border-border disabled:opacity-50"
        >
          {generating ? "Generating… (can take a minute)" : "Generate new drafts"}
        </button>
      </div>

      {error && <p className="text-[14px] text-red-600 mb-4">{error}</p>}

      {genResult && (
        <p className="text-[13px] text-text-muted mb-6">
          Scanned {genResult.categoriesScanned} categories, found {genResult.clustersFound} multi-source story
          clusters, created {genResult.draftsCreated} drafts.
          {genResult.errors.length > 0 && ` (${genResult.errors.length} errors — see server logs.)`}
        </p>
      )}

      {drafts && drafts.length === 0 && (
        <p className="text-[14px] text-text-muted">No pending drafts. Click "Generate new drafts" to look for some.</p>
      )}

      <div className="flex flex-col gap-6">
        {drafts?.map((d) => (
          <div key={d.id} className="border border-border rounded-lg p-4 flex flex-col gap-3">
            <div className="flex items-center gap-2 text-[12px] text-text-faint">
              <span className="px-2 py-0.5 rounded-full bg-surface border border-border">{d.category_key}</span>
              <span>{new Date(d.created_at).toLocaleString()}</span>
            </div>

            <input
              value={edits[d.id]?.headline ?? ""}
              onChange={(e) => setEdits((prev) => ({ ...prev, [d.id]: { ...prev[d.id], headline: e.target.value } }))}
              className="border border-border rounded-lg px-3 py-2 bg-surface font-semibold text-[15px]"
            />

            <textarea
              value={edits[d.id]?.body ?? ""}
              onChange={(e) => setEdits((prev) => ({ ...prev, [d.id]: { ...prev[d.id], body: e.target.value } }))}
              rows={10}
              className="border border-border rounded-lg px-3 py-2 bg-surface text-[14.5px] leading-[1.6]"
            />

            <div className="text-[12.5px] text-text-faint">
              <span className="font-semibold">Sources: </span>
              {d.source_refs.map((s, i) => (
                <span key={i}>
                  {i > 0 && ", "}
                  {s.url ? (
                    <a href={s.url} target="_blank" rel="noopener noreferrer" className="text-accent">
                      {s.name ?? "source"}
                    </a>
                  ) : (
                    s.name ?? "source"
                  )}
                </span>
              ))}
            </div>

            {publishedNotes[d.id] ? (
              <p className="text-[13.5px] text-green-700">
                Published:{" "}
                <a href={publishedNotes[d.id]} target="_blank" rel="noopener noreferrer" className="underline">
                  {publishedNotes[d.id]}
                </a>
              </p>
            ) : (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => review(d.id, "approve")}
                  disabled={busyId === d.id}
                  className="rounded-lg px-4 py-2 font-semibold disabled:opacity-50"
                  style={{ background: "var(--accent)", color: "var(--accent-text)" }}
                >
                  {busyId === d.id ? "Working…" : "Approve & publish"}
                </button>
                <button
                  type="button"
                  onClick={() => review(d.id, "reject")}
                  disabled={busyId === d.id}
                  className="rounded-lg px-4 py-2 font-semibold border border-border disabled:opacity-50"
                >
                  Reject
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
