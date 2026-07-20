import { NextRequest, NextResponse } from "next/server";
import { runIngestion } from "@/lib/ingest/run";

// Triggered by an external scheduler (Vercel Cron once deployed). Protected
// by a shared secret so this can't be used to hammer publisher RSS feeds
// from the public internet.
export async function POST(request: NextRequest) {
  const secret = process.env.INGEST_SECRET;
  const provided = request.headers.get("x-ingest-secret");
  if (!secret || provided !== secret) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const result = await runIngestion({
    skipRss: searchParams.get("skipRss") === "true",
    skipNewsData: searchParams.get("skipNewsData") === "true",
  });
  return NextResponse.json(result);
}
