import { NextRequest, NextResponse } from "next/server";
import { readStrategyDocAsset } from "@/lib/strategy-docs";

export async function GET(request: NextRequest) {
  const file = request.nextUrl.searchParams.get("file");
  if (!file) {
    return NextResponse.json({ error: "Missing file" }, { status: 400 });
  }

  const asset = await readStrategyDocAsset(file);
  if (!asset) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return new NextResponse(new Uint8Array(asset.bytes), {
    headers: {
      "Content-Type": asset.contentType,
      "Cache-Control": "public, max-age=3600",
    },
  });
}
