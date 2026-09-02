import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function checkPassword(request: NextRequest): boolean {
  const adminPassword = process.env.POSTER_ADMIN_PASSWORD;
  return Boolean(adminPassword) && request.headers.get("x-admin-password") === adminPassword;
}

function supabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase service credentials.");
  return createClient(url, key);
}

// Same convention as run.ts/opinion.ts's slugFor — plain Web Crypto SHA-1.
async function slugFor(input: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-1", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 12);
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!checkPassword(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const body = await request.json();
  const action = body.action as "approve" | "reject";
  const supabase = supabaseAdmin();

  const { data: draft, error: fetchError } = await supabase
    .from("editorial_drafts")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 500 });
  if (!draft) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (draft.status !== "pending") return NextResponse.json({ error: "already reviewed" }, { status: 409 });

  if (action === "reject") {
    const { error } = await supabase
      .from("editorial_drafts")
      .update({ status: "rejected", reviewed_at: new Date().toISOString() })
      .eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (action === "approve") {
    // The reviewer's final (possibly edited) text — never publish the raw
    // AI draft sight-unseen, only what actually passed through /admin/drafts.
    const headline: string = typeof body.headline === "string" ? body.headline : draft.headline;
    const paragraphs: string[] = Array.isArray(body.paragraphs) ? body.paragraphs : draft.body;
    const firstPara = paragraphs[0] ?? "";
    const dek = firstPara.length > 200 ? `${firstPara.slice(0, 199).trimEnd()}…` : firstPara;

    // Pulls a real photo from one of the synthesized source articles rather
    // than always leaving image_url null — every editorial article was
    // publishing with a broken/placeholder image before this, since nothing
    // populated it. Same "use the publisher's own image" pattern already in
    // use for ordinary aggregator articles elsewhere on the site.
    let imageUrl: string | null = null;
    if (draft.source_article_ids?.length > 0) {
      const { data: sourceArticles } = await supabase
        .from("articles")
        .select("image_url")
        .in("id", draft.source_article_ids)
        .not("image_url", "is", null)
        .limit(1);
      imageUrl = sourceArticles?.[0]?.image_url ?? null;
    }

    const slug = `ed-${await slugFor(id)}`;
    const { data: inserted, error: insertError } = await supabase
      .from("articles")
      .insert({
        slug,
        category_key: draft.category_key,
        content_type: draft.content_type,
        language: "ta",
        headline,
        dek,
        body: paragraphs,
        // No source_url — this renders as genuinely original content on the
        // article page (no outbound "read more" link, no source line), see
        // that page's `article.sourceUrl ? ... : ...` branch.
        source: "PulseNews ஆசிரியர் குழு",
        source_url: null,
        author: "PulseNews ஆசிரியர் குழு",
        published_at: new Date().toISOString(),
        has_video: false,
        video_url: null,
        image_url: imageUrl,
        tags: [draft.category_key, "editorial"],
      })
      .select("id")
      .single();
    if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 });

    const { error: updateError } = await supabase
      .from("editorial_drafts")
      .update({
        status: "approved",
        reviewed_at: new Date().toISOString(),
        published_article_id: inserted.id,
        headline,
        body: paragraphs,
      })
      .eq("id", id);
    if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });

    return NextResponse.json({ ok: true, articleId: inserted.id, slug, category: draft.category_key });
  }

  return NextResponse.json({ error: "invalid action" }, { status: 400 });
}
