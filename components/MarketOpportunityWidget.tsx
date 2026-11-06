"use client";

import { useMemo, useState } from "react";
import MultiSelectDropdown from "./MultiSelectDropdown";
import { buildGroupResolver, configuredGroups, OTHER_GROUP, type HsCodeSetting } from "@/lib/productGroups";

type TradeRow = {
  exporting_country: string;
  importing_country: string;
  product_group: string | null;
  product: string | null;
  hs_code: string | null;
  flow: string;
  year: number;
  quantity: number | null;
  value: number | null;
};

// Eurostat Comext values are in EUR.
function fmtMoney(n: number): string {
  if (n >= 1_000_000) return `€${(n / 1_000_000).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}M`;
  if (n >= 1_000) return `€${(n / 1_000).toLocaleString("en-US", { maximumFractionDigits: 0 })}K`;
  return `€${Math.round(n).toLocaleString("en-US")}`;
}

function fmtPct(n: number): string {
  return `${n > 0 ? "+" : ""}${n.toFixed(0)}%`;
}

export default function MarketOpportunityWidget({ countryName, rows, hsCodes }: { countryName: string; rows: TradeRow[]; hsCodes: HsCodeSetting[] }) {
  // Same base filter as the Trade Overview chart above: rows where an EU
  // supplier's export lands in this country — i.e. this country's import.
  // Product Group is taken from the HS Codes settings (matched by HS code).
  const resolveGroup = useMemo(() => buildGroupResolver(hsCodes), [hsCodes]);
  const base = useMemo(
    () => rows.filter((r) => r.flow === "export" && r.importing_country === countryName).map((r) => ({ ...r, group: resolveGroup(r.hs_code) })),
    [rows, countryName, resolveGroup]
  );

  const allProducts = useMemo(() => {
    const configured = configuredGroups(hsCodes);
    return base.some((r) => r.group === OTHER_GROUP) ? [...configured, OTHER_GROUP] : configured;
  }, [base, hsCodes]);
  const allSuppliers = useMemo(() => Array.from(new Set(base.map((r) => r.exporting_country))).sort(), [base]);
  const allYears = useMemo(() => Array.from(new Set(base.map((r) => r.year))).sort((a, b) => a - b), [base]);

  const [productFilter, setProductFilter] = useState<string[]>([]);
  const [supplierFilter, setSupplierFilter] = useState<string[]>([]);
  const [asOfYear, setAsOfYear] = useState<string>(""); // "" = latest available
  const [threshold, setThreshold] = useState(1_000_000);

  const filtered = useMemo(
    () =>
      base
        .filter((r) => productFilter.length === 0 || productFilter.includes(r.group))
        .filter((r) => supplierFilter.length === 0 || supplierFilter.includes(r.exporting_country)),
    [base, productFilter, supplierFilter]
  );

  const years = useMemo(() => Array.from(new Set(filtered.map((r) => r.year))).sort((a, b) => a - b), [filtered]);
  const lastYear = asOfYear ? Number(asOfYear) : years[years.length - 1];

  // ---- KPI 1: total import in the last available year ----
  const lastYearTotal = useMemo(() => filtered.filter((r) => r.year === lastYear).reduce((s, r) => s + (Number(r.value) || 0), 0), [filtered, lastYear]);

  // ---- KPI 2: 3-year CAGR (needs a value 2 years before lastYear too) ----
  const cagr = useMemo(() => {
    if (!lastYear) return null;
    const startYear = lastYear - 2;
    const startTotal = filtered.filter((r) => r.year === startYear).reduce((s, r) => s + (Number(r.value) || 0), 0);
    if (startTotal <= 0 || lastYearTotal <= 0) return null;
    return (Math.pow(lastYearTotal / startTotal, 1 / 2) - 1) * 100;
  }, [filtered, lastYear, lastYearTotal]);

  // ---- KPI 3: largest single trade flow ever recorded (any year) ----
  const largestFlow = useMemo(() => filtered.reduce((max, r) => Math.max(max, Number(r.value) || 0), 0), [filtered]);

  // ---- Large Contract Signals: individual flows at/above the threshold ----
  const largeSignals = useMemo(
    () =>
      filtered
        .filter((r) => (Number(r.value) || 0) >= threshold)
        .sort((a, b) => (Number(b.value) || 0) - (Number(a.value) || 0))
        .slice(0, 5),
    [filtered, threshold]
  );

  // ---- Top Suppliers (last available year only) ----
  const topSuppliers = useMemo(() => {
    const byCountry = new Map<string, number>();
    for (const r of filtered) {
      if (r.year !== lastYear) continue;
      byCountry.set(r.exporting_country, (byCountry.get(r.exporting_country) ?? 0) + (Number(r.value) || 0));
    }
    const total = Array.from(byCountry.values()).reduce((s, v) => s + v, 0);
    const sorted = Array.from(byCountry.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([country, value]) => ({ country, value, share: total > 0 ? (value / total) * 100 : 0 }));
    return { list: sorted.slice(0, 5), total, top1Share: sorted[0]?.share ?? 0, top3Share: sorted.slice(0, 3).reduce((s, r) => s + r.share, 0) };
  }, [filtered, lastYear]);

  // ---- Demand by Category (last available year only) ----
  const demandByCategory = useMemo(() => {
    const byProduct = new Map<string, number>();
    for (const r of filtered) {
      if (r.year !== lastYear) continue;
      const key = r.group;
      byProduct.set(key, (byProduct.get(key) ?? 0) + (Number(r.value) || 0));
    }
    const total = Array.from(byProduct.values()).reduce((s, v) => s + v, 0);
    return Array.from(byProduct.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([product, value]) => ({ product, value, share: total > 0 ? (value / total) * 100 : 0 }));
  }, [filtered, lastYear]);

  // ---- Opportunity Score (0-100) ----
  // No universal benchmark exists for "how big is big" across every
  // country/category pair this widget could ever be pointed at, so each
  // component below uses a transparent bucket scale rather than a
  // precise formula. Weights sum to 100; adjust the buckets/weights here
  // if the interpretation should shift.
  const score = useMemo(() => {
    let volume = 0;
    if (lastYearTotal >= 5_000_000) volume = 25;
    else if (lastYearTotal >= 2_000_000) volume = 20;
    else if (lastYearTotal >= 1_000_000) volume = 15;
    else if (lastYearTotal >= 500_000) volume = 10;
    else if (lastYearTotal >= 100_000) volume = 5;

    let growth = 12.5; // no CAGR data = neutral, not zero
    if (cagr !== null) {
      if (cagr >= 30) growth = 25;
      else if (cagr >= 15) growth = 20;
      else if (cagr >= 5) growth = 15;
      else if (cagr >= 0) growth = 10;
      else growth = 0;
    }

    let contracts = 0;
    if (largestFlow >= threshold * 3) contracts = 20;
    else if (largestFlow >= threshold) contracts = 15;
    else if (largestFlow >= threshold * 0.5) contracts = 8;

    let regularity = 7.5;
    if (years.length >= 2) {
      const span = years[years.length - 1] - years[0] + 1;
      const yearsWithData = new Set(filtered.filter((r) => (Number(r.value) || 0) > 0).map((r) => r.year)).size;
      regularity = span > 0 ? (yearsWithData / span) * 15 : 0;
    }

    // A market split across more suppliers reads as more open to a new
    // entrant than one dominated by a single existing supplier.
    let concentration = 7.5;
    if (topSuppliers.total > 0) {
      if (topSuppliers.top3Share < 50) concentration = 15;
      else if (topSuppliers.top3Share < 70) concentration = 10;
      else if (topSuppliers.top3Share < 90) concentration = 5;
      else concentration = 0;
    }

    const total = Math.round(volume + growth + contracts + regularity + concentration);
    return Math.min(100, Math.max(0, total));
  }, [lastYearTotal, cagr, largestFlow, threshold, years, filtered, topSuppliers]);

  const signal = score >= 80 ? "HIGH" : score >= 60 ? "MEDIUM" : "LOW";
  const signalColor =
    signal === "HIGH" ? "text-emerald-600 bg-emerald-50 border-emerald-200" : signal === "MEDIUM" ? "text-amber-600 bg-amber-50 border-amber-200" : "text-red-600 bg-red-50 border-red-200";
  const signalDot = signal === "HIGH" ? "🟢" : signal === "MEDIUM" ? "🟡" : "🔴";
  const signalCaption = signal === "HIGH" ? "PRIORITY MARKET" : signal === "MEDIUM" ? "INVESTIGATE" : "MONITOR";

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
      <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
        <div>
          <h3 className="font-medium">Market Opportunity</h3>
          <p className="text-xs text-slate-400">{countryName} — import demand, growth &amp; procurement signals</p>
        </div>
        <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 w-full sm:w-auto sm:flex-wrap">
          <MultiSelectDropdown label="Product Group" options={allProducts} selected={productFilter} onChange={setProductFilter} />
          <MultiSelectDropdown label="Supplier" options={allSuppliers} selected={supplierFilter} onChange={setSupplierFilter} />
          <select value={asOfYear} onChange={(e) => setAsOfYear(e.target.value)} className="text-sm sm:text-xs border border-slate-300 rounded-lg px-2 py-2 sm:py-1.5">
            <option value="">Latest year</option>
            {allYears.map((y) => (
              <option key={y} value={y}>
                As of {y}
              </option>
            ))}
          </select>
          <label className="flex items-center gap-1.5 text-xs text-slate-500 justify-between">
            Threshold
            <input
              type="number"
              value={threshold}
              onChange={(e) => setThreshold(Number(e.target.value) || 0)}
              className="w-24 border border-slate-300 rounded-lg px-2 py-2 sm:py-1.5 text-sm sm:text-xs"
            />
          </label>
        </div>
      </div>

      {!lastYear ? (
        <p className="text-sm text-slate-400 py-4">No import data yet for this selection.</p>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
            <div className="border border-slate-200 rounded-lg p-3">
              <div className="text-[10px] text-slate-400 uppercase tracking-wide">{lastYear} Import</div>
              <div className="text-base sm:text-lg font-semibold text-slate-800">{fmtMoney(lastYearTotal)}</div>
            </div>
            <div className="border border-slate-200 rounded-lg p-3">
              <div className="text-[10px] text-slate-400 uppercase tracking-wide">3Y CAGR</div>
              <div className="text-base sm:text-lg font-semibold text-slate-800">{cagr !== null ? fmtPct(cagr) : "—"}</div>
            </div>
            <div className="border border-slate-200 rounded-lg p-3">
              <div className="text-[10px] text-slate-400 uppercase tracking-wide">Large Contracts</div>
              <div className="text-base sm:text-lg font-semibold text-slate-800">{fmtMoney(largestFlow)}</div>
            </div>
            <div className={`rounded-lg p-3 border ${signalColor}`}>
              <div className="text-[10px] uppercase tracking-wide opacity-70">Signal</div>
              <div className="text-base sm:text-lg font-semibold">
                {signalDot} {signal}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div>
              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">🔥 Large Contract Signals</h4>
              {largeSignals.length === 0 ? (
                <p className="text-xs text-slate-400">No single flow at or above {fmtMoney(threshold)} yet.</p>
              ) : (
                <div className="space-y-1.5">
                  {largeSignals.map((r, i) => (
                    <div key={i} className="flex items-center justify-between text-xs border-b border-slate-100 pb-1.5 last:border-0">
                      <span className="text-slate-500 shrink-0">{r.year}</span>
                      <span className="text-slate-600 truncate mx-2">
                        {r.exporting_country} → {countryName} · {r.group}
                      </span>
                      <span className="font-medium text-slate-800 shrink-0">{fmtMoney(Number(r.value) || 0)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">🌍 Top Suppliers ({lastYear})</h4>
              {topSuppliers.list.length === 0 ? (
                <p className="text-xs text-slate-400">No data for {lastYear}.</p>
              ) : (
                <>
                  <div className="space-y-1.5 mb-2">
                    {topSuppliers.list.map((s) => (
                      <div key={s.country} className="flex items-center justify-between text-xs">
                        <span className="text-slate-600">{s.country}</span>
                        <span className="text-slate-400">{s.share.toFixed(0)}%</span>
                        <span className="font-medium text-slate-800">{fmtMoney(s.value)}</span>
                      </div>
                    ))}
                  </div>
                  <p className="text-[10px] text-slate-400">
                    Top supplier: {topSuppliers.top1Share.toFixed(0)}% · Top 3: {topSuppliers.top3Share.toFixed(0)}%
                  </p>
                </>
              )}
            </div>
          </div>

          <div className="mt-4">
            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">📦 Demand by Category ({lastYear})</h4>
            {demandByCategory.length === 0 ? (
              <p className="text-xs text-slate-400">No data for {lastYear}.</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {demandByCategory.map((c) => (
                  <div key={c.product} className="border border-slate-100 rounded-lg p-2">
                    <div className="text-xs text-slate-600 truncate">{c.product}</div>
                    <div className="text-sm font-medium text-slate-800">{fmtMoney(c.value)}</div>
                    <div className="text-[10px] text-slate-400">{c.share.toFixed(0)}% of total</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-5 pt-4 border-t border-slate-100">
            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">🎯 Opportunity Score</h4>
            <div className="flex items-center gap-3">
              <div className="w-full bg-slate-100 rounded-full h-2.5">
                <div
                  className={`h-2.5 rounded-full ${signal === "HIGH" ? "bg-emerald-500" : signal === "MEDIUM" ? "bg-amber-500" : "bg-red-500"}`}
                  style={{ width: `${score}%` }}
                />
              </div>
              <span className="text-sm font-semibold text-slate-800 shrink-0">{score}/100</span>
            </div>
            <p className={`text-xs mt-1.5 font-medium ${signal === "HIGH" ? "text-emerald-600" : signal === "MEDIUM" ? "text-amber-600" : "text-red-600"}`}>
              {signalDot} {signal} — {signalCaption}
            </p>
          </div>
        </>
      )}
    </div>
  );
}
