"use client";

import { useMemo, useState } from "react";

function usd(n: number) {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 2,
    }).format(n);
  } catch {
    return n.toFixed(2);
  }
}

export default function Page() {
  const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<any | null>(null);
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const total = data?.totalValue ?? 0;
  const tokenCount = data?.positions?.length ?? 0;

  async function load() {
    setLoading(true);
    setError(null);
    setData(null);
    try {
      const r = await fetch("/api/tokens", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ address }),
      });
      if (!r.ok) throw new Error(await r.text());
      setData(await r.json());
    } catch (e: any) {
      setError(e?.message ?? "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  const topSymbols = useMemo(() => {
    return (data?.positions ?? [])
      .slice(0, 3)
      .map((p: any) => p.symbol)
      .join(" · ");
  }, [data]);

  function onSort(key: string) {
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }
  
  const sortedPositions = useMemo(() => {
    if (!data?.positions || !sortKey) return data?.positions ?? [];
  
    return [...data.positions].sort((a: any, b: any) => {
      const av = a[sortKey] ?? 0;
      const bv = b[sortKey] ?? 0;
  
      if (typeof av === "string") {
        return sortDir === "asc"
          ? av.localeCompare(bv)
          : bv.localeCompare(av);
      }
  
      return sortDir === "asc" ? av - bv : bv - av;
    });
  }, [data, sortKey, sortDir]);
  

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 text-slate-900">
      <div className="max-w-7xl mx-auto px-6 py-10">
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-4xl font-semibold tracking-tight">
              Ethereum Portfolio Overview
            </h1>
            <p className="mt-1 text-sm text-slate-600 max-w-xl">
              Track every ERC-20 token, balance, and USD value — fetched directly
              from Ethereum mainnet in real time. No wallets connected. No keys
              exposed.
            </p>
          </div>

          <span className="inline-flex items-center rounded-full bg-slate-900 text-white px-4 py-1.5 text-xs font-medium">
            🔒 Keys stay on server
          </span>
        </header>

        {/* Controls */}
        <section className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div className="md:col-span-2">
            <label className="text-xs font-medium text-slate-600">
              Enter Wallet Address
            </label>
            <input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="0x…"
              className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm shadow-sm
                         focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900"
            />
          </div>

          <button
            onClick={load}
            disabled={loading || !address}
            className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-medium text-white
                       hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Loading…" : "Load balances"}
          </button>
        </section>

        {/* Error */}
        {error && (
          <div className="mt-6 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        )}

        {/* KPIs */}
        {data && (
          <section className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-5">
            {[
              { label: "Total value(USD)", value: usd(total) },
              { label: "Tokens discovered", value: tokenCount },
              { label: "Top value tokens", value: topSymbols || "—" },
            ].map((kpi, i) => (
              <div
                key={i}
                className="group relative overflow-hidden rounded-2xl bg-white p-6
                          border border-slate-100 shadow-sm
                          transition-all duration-300 ease-out
                          hover:-translate-y-1 hover:shadow-lg"
              >
                {/* gradient hover overlay */}
                <div
                  className="pointer-events-none absolute inset-0
                            bg-gradient-to-br from-slate-100/0 via-slate-100/0 to-slate-200/40
                            opacity-0 transition-opacity duration-300
                            group-hover:opacity-100"
                />

              <div className="relative">
                <div className="text-xs uppercase tracking-wide text-slate-500">
                  {kpi.label}
                </div>
                <div className="mt-1 text-2xl font-semibold">
                  {kpi.value}
                </div>
              </div>

              </div>
            ))}
          </section>
        )}

        {/* Table */}
        {data?.positions?.length ? (
          <section className="mt-10 rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="sticky top-0 bg-slate-50 border-b">
                  <tr className="text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                  <th onClick={() => onSort("symbol")} className="px-4 py-3 cursor-pointer">Token</th>
                  <th onClick={() => onSort("network")} className="px-4 py-3 cursor-pointer">Network</th>
                  <th onClick={() => onSort("balance")} className="px-4 py-3 text-right cursor-pointer">Balance</th>
                  <th onClick={() => onSort("priceUsd")} className="px-4 py-3 text-right cursor-pointer">Price</th>
                  <th onClick={() => onSort("valueUsd")} className="px-4 py-3 text-right cursor-pointer">Value</th>
                  <th className="px-4 py-3 text-right">Weight</th>
                  </tr>
                </thead>

                <tbody>
                  {sortedPositions.map((p: any, idx: number) => {
                    const value = p.valueUsd ?? 0;
                    const balanceDisplay =
                      typeof p.balance === "string"
                        ? Number(p.balance) > 0 &&
                          Number(p.balance) < 0.000001
                          ? Number(p.balance).toExponential(3)
                          : Number(p.balance).toLocaleString()
                        : String(p.balance);

                    const weight = data.totalValue
                      ? (100 * value) / data.totalValue
                      : 0;

                    return (
                      <tr
                        key={idx}
                        className="
                          border-t last:border-b transition
                          even:bg-slate-50/60
                          hover:bg-slate-100
                        "
                      >

                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            {p.logo ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={p.logo}
                                className="w-8 h-8 rounded-full"
                                alt=""
                              />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-slate-200" />
                            )}
                            <div>
                              <div className="font-medium">{p.symbol}</div>
                              <div className="text-xs text-slate-500">
                                {p.name || ""}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="px-4 py-3 text-slate-600">
                          {p.network}
                        </td>
                        <td className="px-4 py-3 text-right font-mono">
                          {balanceDisplay}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {p.priceUsd != null ? usd(p.priceUsd) : "—"}
                        </td>
                        <td className="px-4 py-3 text-right font-medium">
                          {p.valueUsd != null ? usd(p.valueUsd) : "—"}
                        </td>
                        <td className="px-4 py-3 text-right text-slate-600">
                          {weight.toFixed(1)}%
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        ) : null}

        {!data && (
          <div className="mt-12 rounded-2xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-600">
            Enter a wallet address to load token balances and prices.
          </div>
        )}

        <footer className="mt-14 text-center text-xs text-slate-500">
          Built with Next.js App Router · Exact balances via BigInt · Alchemy on
          server
        </footer>
      </div>
    </div>
  );
}
