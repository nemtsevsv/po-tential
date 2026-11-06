"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { btnPrimary } from "@/lib/buttonStyles";
import ColumnFilterHeader from "./ColumnFilterHeader";
import { Settings } from "lucide-react";

type Country = {
  id: string;
  name: string;
  capital: string | null;
  biggest_cities: string | null;
  population: number | null;
  gdp: number | null;
  gdp_ppp: number | null;
  hnwi: number | null;
  vat: number | null;
};

function perCapita(total: number | null, population: number | null) {
  if (!total || !population) return null;
  return total / population;
}

function fmt(n: number | null, digits = 0) {
  if (n === null || n === undefined) return "—";
  return n.toLocaleString("de-DE", { maximumFractionDigits: digits });
}

function fmtMio(n: number | null) {
  if (n === null || n === undefined) return "—";
  return (n / 1_000_000).toLocaleString("de-DE", { maximumFractionDigits: 0 });
}

type SortKey = "name" | "capital" | "population" | "gdp" | "gdp_per_capita" | "gdp_ppp" | "gdp_ppp_per_capita" | "hnwi" | "vat";

export default function CountryTable({ countries }: { countries: Country[] }) {
  const [search, setSearch] = useState("");
  const [capitalFilter, setCapitalFilter] = useState<string[]>([]);
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const capitals = Array.from(new Set(countries.map((c) => c.capital).filter(Boolean))) as string[];

  function handleSort(key: SortKey, dir: "asc" | "desc") {
    setSortKey(key);
    setSortDir(dir);
  }

  const rows = useMemo(
    () =>
      countries.map((c) => ({
        ...c,
        gdpPerCapita: perCapita(c.gdp, c.population),
        gdpPppPerCapita: perCapita(c.gdp_ppp, c.population),
      })),
    [countries]
  );

  const filtered = useMemo(() => {
    const dir = sortDir === "asc" ? 1 : -1;
    return rows
      .filter((c) => c.name.toLowerCase().includes(search.toLowerCase()))
      .filter((c) => capitalFilter.length === 0 || capitalFilter.includes(c.capital ?? ""))
      .sort((a, b) => {
        if (sortKey === "name") return a.name.localeCompare(b.name) * dir;
        if (sortKey === "capital") return (a.capital ?? "").localeCompare(b.capital ?? "") * dir;
        if (sortKey === "population") return ((a.population ?? 0) - (b.population ?? 0)) * dir;
        if (sortKey === "gdp") return ((a.gdp ?? 0) - (b.gdp ?? 0)) * dir;
        if (sortKey === "gdp_per_capita") return ((a.gdpPerCapita ?? 0) - (b.gdpPerCapita ?? 0)) * dir;
        if (sortKey === "gdp_ppp") return ((a.gdp_ppp ?? 0) - (b.gdp_ppp ?? 0)) * dir;
        if (sortKey === "gdp_ppp_per_capita") return ((a.gdpPppPerCapita ?? 0) - (b.gdpPppPerCapita ?? 0)) * dir;
        if (sortKey === "hnwi") return ((a.hnwi ?? 0) - (b.hnwi ?? 0)) * dir;
        if (sortKey === "vat") return ((a.vat ?? 0) - (b.vat ?? 0)) * dir;
        return 0;
      });
  }, [rows, search, capitalFilter, sortKey, sortDir]);

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 mb-2">
        <input
          placeholder="Search countries..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="px-3 py-2 border border-slate-300 rounded-lg text-sm w-full sm:w-56 focus:outline-none focus:ring-2 focus:ring-slate-300"
        />
        <Link href="/countries/new" className={btnPrimary + " flex-1 sm:flex-none sm:ml-auto"}>
          + New Country
        </Link>
        <Link href="/countries/hs-codes" className="flex-1 sm:flex-none justify-center flex items-center gap-1.5 text-sm px-3 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 bg-white">
          <Settings size={14} />
          HS Codes
        </Link>
      </div>
      <p className="text-[11px] text-slate-400 mb-2">GDP and GDP PPP shown in million USD.</p>

      {/* Mobile: cards with a sort selector instead of a wide table */}
      <div className="md:hidden">
        <select
          value={`${sortKey}:${sortDir}`}
          onChange={(e) => {
            const [k, d] = e.target.value.split(":");
            handleSort(k as SortKey, d as "asc" | "desc");
          }}
          className="w-full mb-2 px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
          aria-label="Sort countries"
        >
          <option value="name:asc">Sort: Country A–Z</option>
          <option value="population:desc">Sort: Population ↓</option>
          <option value="gdp:desc">Sort: GDP ↓</option>
          <option value="gdp_per_capita:desc">Sort: GDP per capita ↓</option>
          <option value="hnwi:desc">Sort: HNWI ↓</option>
          <option value="vat:asc">Sort: VAT ↑</option>
        </select>
        <div className="space-y-2">
          {filtered.map((c) => (
            <Link key={c.id} href={`/countries/${c.id}`} className="block bg-white border border-slate-200 rounded-xl p-3 shadow-sm active:bg-slate-50">
              <div className="flex items-baseline justify-between gap-2">
                <span className="font-semibold text-slate-900">{c.name}</span>
                <span className="text-xs text-slate-500 truncate">{c.capital ?? ""}</span>
              </div>
              <div className="grid grid-cols-3 gap-2 mt-2 text-xs">
                <div>
                  <div className="text-[10px] uppercase text-slate-400">Population</div>
                  <div className="text-slate-700">{fmt(c.population)}</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase text-slate-400">GDP, mio</div>
                  <div className="text-slate-700">{fmtMio(c.gdp)}</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase text-slate-400">GDP/cap</div>
                  <div className="text-slate-700">{fmt(c.gdpPerCapita)}</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase text-slate-400">PPP/cap</div>
                  <div className="text-slate-700">{fmt(c.gdpPppPerCapita)}</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase text-slate-400">HNWI</div>
                  <div className="text-slate-700">{fmt(c.hnwi)}</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase text-slate-400">VAT</div>
                  <div className="text-slate-700">{c.vat !== null ? `${c.vat}%` : "—"}</div>
                </div>
              </div>
            </Link>
          ))}
          {filtered.length === 0 && <p className="text-center py-8 text-slate-400 text-sm">No countries found</p>}
        </div>
      </div>

      <div className="hidden md:block bg-white border border-slate-200 rounded-xl overflow-x-auto shadow-sm">
        <table className="w-full text-xs">
          <thead className="bg-slate-50 text-slate-500 text-[10px] uppercase">
            <tr>
              <th className="text-left px-2 py-2">
                <ColumnFilterHeader label="Country" options={[]} selected={[]} onChange={() => {}} sortDir={sortKey === "name" ? sortDir : null} onSort={(dir) => handleSort("name", dir)} />
              </th>
              <th className="text-left px-2 py-2">
                <ColumnFilterHeader label="Capital" options={capitals} selected={capitalFilter} onChange={setCapitalFilter} sortDir={sortKey === "capital" ? sortDir : null} onSort={(dir) => handleSort("capital", dir)} />
              </th>
              <th className="text-left px-2 py-2">Cities</th>
              <th className="text-right px-2 py-2">
                <ColumnFilterHeader label="Population" options={[]} selected={[]} onChange={() => {}} align="right" sortDir={sortKey === "population" ? sortDir : null} onSort={(dir) => handleSort("population", dir)} />
              </th>
              <th className="text-right px-2 py-2">
                <ColumnFilterHeader label="GDP" options={[]} selected={[]} onChange={() => {}} align="right" sortDir={sortKey === "gdp" ? sortDir : null} onSort={(dir) => handleSort("gdp", dir)} />
              </th>
              <th className="text-right px-2 py-2">
                <ColumnFilterHeader label="GDP/cap" options={[]} selected={[]} onChange={() => {}} align="right" sortDir={sortKey === "gdp_per_capita" ? sortDir : null} onSort={(dir) => handleSort("gdp_per_capita", dir)} />
              </th>
              <th className="text-right px-2 py-2">
                <ColumnFilterHeader label="GDP PPP" options={[]} selected={[]} onChange={() => {}} align="right" sortDir={sortKey === "gdp_ppp" ? sortDir : null} onSort={(dir) => handleSort("gdp_ppp", dir)} />
              </th>
              <th className="text-right px-2 py-2">
                <ColumnFilterHeader label="PPP/cap" options={[]} selected={[]} onChange={() => {}} align="right" sortDir={sortKey === "gdp_ppp_per_capita" ? sortDir : null} onSort={(dir) => handleSort("gdp_ppp_per_capita", dir)} />
              </th>
              <th className="text-right px-2 py-2">
                <ColumnFilterHeader label="HNWI" options={[]} selected={[]} onChange={() => {}} align="right" sortDir={sortKey === "hnwi" ? sortDir : null} onSort={(dir) => handleSort("hnwi", dir)} />
              </th>
              <th className="text-right px-2 py-2">
                <ColumnFilterHeader label="VAT" options={[]} selected={[]} onChange={() => {}} align="right" sortDir={sortKey === "vat" ? sortDir : null} onSort={(dir) => handleSort("vat", dir)} />
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((c) => (
              <tr key={c.id} className="border-t border-slate-100 hover:bg-slate-50">
                <td className="px-2 py-1.5 whitespace-nowrap">
                  <Link href={`/countries/${c.id}`} className="font-medium hover:underline">
                    {c.name}
                  </Link>
                </td>
                <td className="px-2 py-1.5 text-slate-600 whitespace-nowrap">{c.capital ?? "—"}</td>
                <td className="px-2 py-1.5 text-slate-500 max-w-[100px] truncate" title={c.biggest_cities ?? undefined}>
                  {c.biggest_cities ?? "—"}
                </td>
                <td className="px-2 py-1.5 text-right text-slate-600 whitespace-nowrap">{fmt(c.population)}</td>
                <td className="px-2 py-1.5 text-right text-slate-700 whitespace-nowrap">{fmtMio(c.gdp)}</td>
                <td className="px-2 py-1.5 text-right text-slate-500 whitespace-nowrap">{fmt(c.gdpPerCapita)}</td>
                <td className="px-2 py-1.5 text-right text-slate-700 whitespace-nowrap">{fmtMio(c.gdp_ppp)}</td>
                <td className="px-2 py-1.5 text-right text-slate-500 whitespace-nowrap">{fmt(c.gdpPppPerCapita)}</td>
                <td className="px-2 py-1.5 text-right text-slate-600 whitespace-nowrap">{fmt(c.hnwi)}</td>
                <td className="px-2 py-1.5 text-right text-slate-600 whitespace-nowrap">{c.vat !== null ? `${c.vat}%` : "—"}</td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={10} className="text-center py-8 text-slate-400">
                  No countries found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
