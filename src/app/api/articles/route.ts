import { NextRequest, NextResponse } from "next/server";
import { getCategoryArticles } from "@/lib/data";
import { isValidCategory } from "@/lib/categories";

const PAGE_SIZE = 6;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category") ?? "";
  const page = Math.max(1, Number(searchParams.get("page") ?? "1"));

  if (!isValidCategory(category)) {
    return NextResponse.json({ error: "invalid category" }, { status: 400 });
  }

  const offset = (page - 1) * PAGE_SIZE;
  const articles = await getCategoryArticles(category, PAGE_SIZE, offset);
  return NextResponse.json({ articles, hasMore: articles.length === PAGE_SIZE });
}
