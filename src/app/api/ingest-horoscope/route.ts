import { NextRequest, NextResponse } from "next/server";
import { runHoroscopeIngestion } from "@/lib/ingest/horoscope";

// Same shared-secret pattern as /api/ingest. Triggered once a day (see
// supabase/migrations/0009_horoscope_ingest.sql) since rasi palan content
// only refreshes daily at the source, unlike news.
export async function POST(request: NextRequest) {
  const secret = process.env.INGEST_SECRET;
  const provided = request.headers.get("x-ingest-secret");
  if (!secret || provided !== secret) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const result = await runHoroscopeIngestion();
  return NextResponse.json(result);
}
