import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { isValidCategory } from "@/lib/categories";

// Fire-and-forget view counter, called by the client-side ViewTracker on
// article pages. Public (no secret) since real visitors call it, but scoped
// tight: only increments an existing (category, slug) row by 1, nothing else.
export async function POST(request: NextRequest) {
  const { category, slug } = await request.json().catch(() => ({}));
  if (typeof category !== "string" || typeof slug !== "string" || !isValidCategory(category) || !slug) {
    return NextResponse.json({ error: "invalid category/slug" }, { status: 400 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    return NextResponse.json({ error: "server misconfigured" }, { status: 500 });
  }
  const supabase = createClient(url, serviceKey);
  const { error } = await supabase.rpc("increment_article_view", { p_category: category, p_slug: slug });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
