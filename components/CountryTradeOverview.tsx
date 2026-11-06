"use client";

import { useMemo, useState } from "react";
import ColumnFilterHeader from "./ColumnFilterHeader";
import TradeDataImport from "./TradeDataImport";
import ClearTradeDataButton from "./ClearTradeDataButton";
import LoadFromEurostatButton from "./LoadFromEurostatButton";
import { exportToXlsx } from "@/lib/exportXlsx";
import { Download } from "lucide-react";

type TradeRow = {
  id: string;
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

type SortKey = "year" | "flow" | "partner" | "hs_code" | "product" | "quantity" | "value";

export default function CountryTradeOverview({ countryId, countryName, rows }: { countryId: string; countryName: string; rows: TradeRow[] }) {
  const [yearFilter, setYearFilter] = useState<string[]>([]);
  const [hsFilter, setHsFilter] = useState<string[]>([]);
  const [productFilter, setProductFilter] = useState<string[]>([]);
  const [flowFilter, setFlowFilter] = useState<string[]>([]);
  const [countryFilter, setCountryFilter] = useState<string[]>([]);
  const [sortKey, setSortKey] = useState<SortKey>("year");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const years = Array.from(new Set(rows.map((r) => String(r.year)))).sort().reverse();
  const hsCodes = Array.from(new Set(rows.map((r) => r.hs_code).filter(Boolean))) as string[];
  const products = Array.from(new Set(rows.map((r) => r.product).filter(Boolean))) as string[];
  const partnerCountries = Array.from(
    new Set(rows.map((r) => (r.exporting_country === countryName ? r.importing_country : r.exporting_country)))
  ).sort();

  function handleSort(key: SortKey, dir: "asc" | "desc") {
    setSortKey(key);
    setSortDir(dir);
  }

  const withPartner = useMemo(
    () => rows.map((r) => ({ ...r, partner: r.exporting_country === countryName ? r.importing_country : r.exporting_country })),
    [rows, countryName]
  );

  const filtered = useMemo(() => {
    const dir = sortDir === "asc" ? 1 : -1;
    return withPartner
      .filter((r) => {
        if (yearFilter.length > 0 && !yearFilter.includes(String(r.year))) return false;
        if (hsFilter.length > 0 && !hsFilter.includes(r.hs_code ?? "")) return false;
        if (productFilter.length > 0 && !productFilter.includes(r.product ?? "")) return false;
        if (flowFilter.length > 0 && !flowFilter.includes(r.flow)) return false;
        if (countryFilter.length > 0 && !countryFilter.includes(r.partner)) return false;
        return true;
      })
      .sort((a, b) => {
        if (sortKey === "year") return (a.year - b.year) * dir;
        if (sortKey === "flow") return a.flow.localeCompare(b.flow) * dir;
        if (sortKey === "partner") return a.partner.localeCompare(b.partner) * dir;
        if (sortKey === "hs_code") return (a.hs_code ?? "").localeCompare(b.hs_code ?? "") * dir;
        if (sortKey === "product") return (a.product ?? "").localeCompare(b.product ?? "") * dir;
        if (sortKey === "quantity") return ((a.quantity ?? 0) - (b.quantity ?? 0)) * dir;
        if (sortKey === "value") return ((a.value ?? 0) - (b.value ?? 0)) * dir;
        return 0;
      });
  }, [withPartner, yearFilter, hsFilter, productFilter, flowFilter, countryFilter, sortKey, sortDir]);

  function handleExport() {
    const header = ["Year", "Flow", "Partner Country", "HS Code", "Product", "Quantity", "Value"];
    const rows = filtered.map((r) => [r.year, r.flow, r.partner, r.hs_code ?? "", r.product ?? "", r.quantity ?? "", r.value ?? ""]);
    exportToXlsx(`trade-overview-${countryName}`, header, rows, "Trade Overview");
  }

  return (
    <div>
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm mb-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 sm:flex-wrap">
          <TradeDataImport />
          <LoadFromEurostatButton countryId={countryId} />
          {rows.length > 0 && <ClearTradeDataButton countryName={countryName} />}
        </div>
        <p className="text-xs text-slate-400 mt-2">
          Columns: Exporting Country, Importing Country, Product Group, Product, HS code, FLOW (import/export), Year, QUANTITY, VALUE
        </p>
      </div>

      {/* Table wrapper keeps a minimum height so an open column filter
          dropdown always has room, even when filtering leaves zero rows. */}
      <div className="flex justify-end mb-2">
        <button onClick={handleExport} className="flex items-center gap-1.5 px-3 py-1.5 border border-brand-300 bg-brand-50 text-brand-700 rounded-lg text-sm hover:bg-brand-100">
          <Download size={14} />
          Export to Excel
        </button>
      </div>
      {/* Mobile: compact cards; filters via the selects above them */}
      <div className="md:hidden">
        <div className="grid grid-cols-2 gap-2 mb-2">
          <select value={yearFilter[0] ?? ""} onChange={(e) => setYearFilter(e.target.value ? [e.target.value] : [])} className="px-2 py-2 border border-slate-300 rounded-lg text-sm bg-white" aria-label="Year">
            <option value="">All years</option>
            {years.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <select value={countryFilter[0] ?? ""} onChange={(e) => setCountryFilter(e.target.value ? [e.target.value] : [])} className="px-2 py-2 border border-slate-300 rounded-lg text-sm bg-white" aria-label="Partner country">
            <option value="">All partners</option>
            {partnerCountries.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <p className="text-[11px] text-slate-400 mb-2">{filtered.length} rows</p>
        <div className="space-y-1.5">
          {filtered.slice(0, 200).map((r) => (
            <div key={r.id} className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm">
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium text-slate-800 truncate">{r.partner}</span>
                <span className="font-semibold text-slate-900 shrink-0">{r.value !== null ? r.value.toLocaleString("de-DE") : "—"}</span>
              </div>
              <div className="flex items-center justify-between gap-2 text-xs text-slate-500 mt-0.5">
                <span className="truncate">
                  {r.year} · {r.flow} · <span className="font-mono">{r.hs_code ?? "—"}</span>
                </span>
                <span className="truncate max-w-[45%]">{r.product ?? ""}</span>
              </div>
            </div>
          ))}
          {filtered.length > 200 && <p className="text-xs text-slate-400 text-center py-2">Showing first 200 — narrow the filters or export to Excel.</p>}
          {filtered.length === 0 && <p className="text-center py-8 text-slate-400 text-sm">No trade data matches the current filters</p>}
        </div>
      </div>

      <div className="hidden md:block bg-white border border-slate-200 rounded-xl overflow-x-auto shadow-sm min-h-[220px]">
        <table className="w-full text-sm min-w-[800px]">
          <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
            <tr>
              <th className="text-left px-3 py-2.5">
                <ColumnFilterHeader label="Year" options={years} selected={yearFilter} onChange={setYearFilter} sortDir={sortKey === "year" ? sortDir : null} onSort={(dir) => handleSort("year", dir)} />
              </th>
              <th className="text-left px-3 py-2.5">
                <ColumnFilterHeader label="Flow" options={["import", "export"]} selected={flowFilter} onChange={setFlowFilter} sortDir={sortKey === "flow" ? sortDir : null} onSort={(dir) => handleSort("flow", dir)} />
              </th>
              <th className="text-left px-3 py-2.5">
                <ColumnFilterHeader label="Partner Country" options={partnerCountries} selected={countryFilter} onChange={setCountryFilter} sortDir={sortKey === "partner" ? sortDir : null} onSort={(dir) => handleSort("partner", dir)} />
              </th>
              <th className="text-left px-3 py-2.5">
                <ColumnFilterHeader label="HS Code" options={hsCodes} selected={hsFilter} onChange={setHsFilter} sortDir={sortKey === "hs_code" ? sortDir : null} onSort={(dir) => handleSort("hs_code", dir)} />
              </th>
              <th className="text-left px-3 py-2.5">
                <ColumnFilterHeader label="Product" options={products} selected={productFilter} onChange={setProductFilter} sortDir={sortKey === "product" ? sortDir : null} onSort={(dir) => handleSort("product", dir)} />
              </th>
              <th className="text-right px-3 py-2.5">
                <ColumnFilterHeader label="Quantity" options={[]} selected={[]} onChange={() => {}} align="right" sortDir={sortKey === "quantity" ? sortDir : null} onSort={(dir) => handleSort("quantity", dir)} />
              </th>
              <th className="text-right px-3 py-2.5">
                <ColumnFilterHeader label="Value" options={[]} selected={[]} onChange={() => {}} align="right" sortDir={sortKey === "value" ? sortDir : null} onSort={(dir) => handleSort("value", dir)} />
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.id} className="border-t border-slate-100">
                <td className="px-3 py-2 text-slate-600">{r.year}</td>
                <td className="px-3 py-2">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${r.flow === "export" ? "bg-slate-100 text-slate-700" : "bg-brand-100 text-brand-700"}`}>
                    {r.flow}
                  </span>
                </td>
                <td className="px-3 py-2 text-slate-600">{r.partner}</td>
                <td className="px-3 py-2 text-slate-500 font-mono text-xs">{r.hs_code ?? "—"}</td>
                <td className="px-3 py-2 text-slate-600">{r.product ?? "—"}</td>
                <td className="px-3 py-2 text-right text-slate-600">{r.quantity !== null ? r.quantity.toLocaleString("de-DE") : "—"}</td>
                <td className="px-3 py-2 text-right text-slate-700">{r.value !== null ? r.value.toLocaleString("de-DE") : "—"}</td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="text-center py-8 text-slate-400">
                  No trade data matches the current filters
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
