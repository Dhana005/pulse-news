import { NextRequest, NextResponse } from "next/server";
import { runOpinionIngestion } from "@/lib/ingest/opinion";

// Same shared-secret pattern as /api/ingest. Scheduled every 2 hours (see
// supabase/migrations/0011_opinion_ingest.sql) — both sources publish at
// most a few times a week, not continuously like news.
export async function POST(request: NextRequest) {
  const secret = process.env.INGEST_SECRET;
  const provided = request.headers.get("x-ingest-secret");
  if (!secret || provided !== secret) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const result = await runOpinionIngestion();
  return NextResponse.json(result);
}
