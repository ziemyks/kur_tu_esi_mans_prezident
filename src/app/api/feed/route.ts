import { NextResponse } from "next/server";
import { getFeed } from "@/lib/feeds";

export const revalidate = 600;

export async function GET() {
  const data = await getFeed();
  return NextResponse.json(data, {
    headers: { "Cache-Control": "s-maxage=600, stale-while-revalidate=1200" },
  });
}
