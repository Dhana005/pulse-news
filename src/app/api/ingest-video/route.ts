import { NextRequest, NextResponse } from "next/server";
import { runVideoIngestion } from "@/lib/ingest/video";

// Same shared-secret pattern as /api/ingest. Scheduled every 30 min (see
// supabase/migrations/0010_video_ingest.sql) — YouTube's feed has no rate
// limit like NewsData.io does, so it can run about as often as RSS news.
export async function POST(request: NextRequest) {
  const secret = process.env.INGEST_SECRET;
  const provided = request.headers.get("x-ingest-secret");
  if (!secret || provided !== secret) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const result = await runVideoIngestion();
  return NextResponse.json(result);
}
