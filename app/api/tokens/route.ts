import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

const DATA_BASE = "https://api.g.alchemy.com/data/v1";

// Simple 0x-address validation
function isAddress(v: string) {
  return /^0x[a-fA-F0-9]{40}$/.test(v);
}

// Format atomic balance string to a human decimal string using BigInt
function formatUnits(atomic: string, decimals: number): string {
  // Handle both hex (0x...) and decimal string formats
  let bi: bigint;
  if (atomic.startsWith('0x')) {
    // Hex format from Alchemy API
    bi = BigInt(atomic);
  } else if (/^\d+$/.test(atomic)) {
    // Decimal string format
    bi = BigInt(atomic);
  } else {
    return "0";
  }
  
  const d = Math.max(0, Math.min(36, Number.isFinite(decimals) ? decimals : 18));
  const base = 10n ** BigInt(d);
  const whole = bi / base;
  const frac = bi % base;
  if (frac === 0n) return whole.toString();
  let fracStr = frac.toString().padStart(d, "0");
  // trim trailing zeros
  fracStr = fracStr.replace(/0+$/, "");
  return `${whole.toString()}.${fracStr}`;
}

// Parse a human decimal string to Number for display/sorting (safe enough for UI)
function toNumber(dec: string): number {
  // Limit to ~15 significant digits to avoid FP weirdness in UI
  const trimmed = dec.length > 24 ? dec.slice(0, 24) : dec;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : 0;
}

function pickUsdPrice(tokenPrices?: { currency: string; value: string }[]) {
  const p = tokenPrices?.find((x) => x.currency?.toLowerCase() === "usd");
  if (!p) return null;
  const num = Number(p.value);
  return Number.isFinite(num) ? num : null;
}

export async function POST(req: NextRequest) {
  try {
    const { address } = await req.json();
    
    if (typeof address !== "string" || !isAddress(address)) {
      return NextResponse.json({ error: "Invalid or missing address" }, { status: 400 });
    }

    const apiKey = process.env.ALCHEMY_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Missing ALCHEMY_API_KEY" }, { status: 500 });
    }

    // Fetch all pages from Tokens By Wallet for ETH Mainnet
    const url = `${DATA_BASE}/${apiKey}/assets/tokens/by-address`;
    const baseBody: any = {
      addresses: [{ address, networks: ["eth-mainnet"] }],
      withMetadata: true,
      withPrices: true,
      includeNativeTokens: true,
      includeErc20Tokens: true,
    };

    const tokens: any[] = [];
    let pageKey: string | undefined = undefined;

    do {
      const body = pageKey ? { ...baseBody, pageKey } : baseBody;
      const r = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
        cache: "no-store",
      });

      if (!r.ok) {
        const text = await r.text();
        return NextResponse.json({ error: "Alchemy Data error", detail: text }, { status: 502 });
      }

      const j = await r.json();
      const pageTokens = (j?.data?.tokens ?? []) as any[];
      tokens.push(...pageTokens);
      pageKey = j?.data?.pageKey || undefined;
    } while (pageKey);

    const positions = tokens
      .map((t) => {
        const meta = t.tokenMetadata ?? {};
        const decimals =
          typeof meta.decimals === "number" && meta.decimals !== null
            ? meta.decimals
            : meta.decimals !== null && Number.isFinite(Number(meta.decimals))
            ? Number(meta.decimals)
            : 18;

        const atomic = String(t.tokenBalance ?? "0"); // base-10 atomic units
        const balanceStr = formatUnits(atomic, decimals);
        const balanceNum = toNumber(balanceStr);

        const priceUsd = pickUsdPrice(t.tokenPrices) ?? null;
        const valueUsd = priceUsd != null ? balanceNum * priceUsd : null;

        return {
          network: t.network || "eth-mainnet",
          contractAddress: t.tokenAddress ?? null, // null = native ETH
          symbol: meta.symbol ?? (t.tokenAddress ? "TOKEN" : "ETH"),
          name: meta.name ?? null,
          logo: meta.logo ?? null,
          decimals,
          balance: balanceStr, // human-readable string, exact
          priceUsd,
          valueUsd,
        };
      })
      // keep dust if you want; here we hide zeros
      .filter((p) => toNumber(p.balance) > 0)
      .sort((a, b) => (b.valueUsd ?? 0) - (a.valueUsd ?? 0));

    const totalValue = positions.reduce((acc, p) => acc + (p.valueUsd ?? 0), 0);

    return NextResponse.json(
      {
        address,
        network: "eth-mainnet",
        positions,
        totalValue,
        endpoints: {
          rpcProxy: "/api/rpc",
          rpcUpstreamTemplate: "https://eth-mainnet.g.alchemy.com/v2/<KEY>",
          tokensByWallet: "POST https://api.g.alchemy.com/data/v1/:apiKey/assets/tokens/by-address",
        },
        computedAt: new Date().toISOString(),
      },
      { headers: { "cache-control": "no-store" } }
    );
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "Unexpected error" }, { status: 400 });
  }
}


export async function GET() {
  return Response.json({
    success: true,
    message: "Hello from Next.js API route",
    time: new Date().toISOString(),
  });
}
