import { NextRequest, NextResponse } from "next/server";
import { generateEditorialDrafts } from "@/lib/ingest/editorial";

// Same shared admin password as /admin/poster (POSTER_ADMIN_PASSWORD) —
// both are the same "internal admin tool" trust boundary, no need for a
// second secret. Checked via header rather than form-data since this route
// takes no file upload, unlike generate-poster.
function checkPassword(request: NextRequest): boolean {
  const adminPassword = process.env.POSTER_ADMIN_PASSWORD;
  return Boolean(adminPassword) && request.headers.get("x-admin-password") === adminPassword;
}

export async function POST(request: NextRequest) {
  if (!checkPassword(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  try {
    const result = await generateEditorialDrafts();
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
