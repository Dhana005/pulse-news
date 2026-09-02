import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function checkPassword(request: NextRequest): boolean {
  const adminPassword = process.env.POSTER_ADMIN_PASSWORD;
  return Boolean(adminPassword) && request.headers.get("x-admin-password") === adminPassword;
}

export async function GET(request: NextRequest) {
  if (!checkPassword(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return NextResponse.json({ error: "missing Supabase credentials" }, { status: 500 });
  const supabase = createClient(url, key);

  const { data, error } = await supabase
    .from("editorial_drafts")
    .select("*")
    .eq("status", "pending")
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ drafts: data });
}
