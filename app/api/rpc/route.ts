import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

export async function POST(request: NextRequest) {
  const url = process.env.ALCHEMY_API_URL_ETH_MAINNET;
  if (!url) {
    return NextResponse.json(
      { error: "Missing ALCHEMY_API_URL_ETH_MAINNET in server env" },
      { status: 500 }
    );
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const upstream = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
    cache: "no-store",
  });

  let data: any = null;
  try {
    data = await upstream.json();
  } catch {
    return NextResponse.json(
      { error: "Upstream returned non-JSON", status: upstream.status },
      { status: 502 }
    );
  }

  return NextResponse.json(data, {
    status: upstream.ok ? 200 : upstream.status || 502,
    headers: { "cache-control": "no-store" },
  });
}


