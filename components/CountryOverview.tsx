"use client";

import { useState } from "react";
import { Pencil, X } from "lucide-react";
import CountryForm from "./CountryForm";
import UpdateFromWorldBankButton from "./UpdateFromWorldBankButton";
import UpdateCitiesButton from "./UpdateCitiesButton";

function fmt(n: number | null, digits = 0) {
  if (n === null || n === undefined) return "—";
  return n.toLocaleString("de-DE", { maximumFractionDigits: digits });
}

function fmtMio(n: number | null) {
  if (n === null || n === undefined) return "—";
  return (n / 1_000_000).toLocaleString("de-DE", { maximumFractionDigits: 0 });
}

// Population is shown rounded to one decimal in millions (255,219,554 ->
// "255,2 mio") — the raw number is too precise to be useful at a glance.
function fmtPopulationMio(n: number | null) {
  if (n === null || n === undefined) return "—";
  return `${(n / 1_000_000).toLocaleString("de-DE", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} mio`;
}

// Growth rates and Urban Population come from World Bank with far more
// precision than is meaningful to display (e.g. 1.55994397009632) —
// always round to one decimal.
function fmtPct1(n: number | null) {
  if (n === null || n === undefined) return "—";
  return `${n.toLocaleString("de-DE", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
}

function growthLabel(n: number | null) {
  if (n === null || n === undefined) return null;
  const rounded = n.toLocaleString("de-DE", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  return `${n > 0 ? "+" : ""}${rounded}%/yr`;
}

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string | null }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-sm">
      <div className="text-xs text-slate-400 mb-1">{label}</div>
      <div className="text-base font-semibold text-slate-800">{value}</div>
      {sub && <div className="text-xs text-slate-400 mt-0.5">{sub}</div>}
    </div>
  );
}

export default function CountryOverview({ country }: { country: any }) {
  const [editing, setEditing] = useState(false);

  const gdpPerCapita = country.population && country.gdp ? country.gdp / country.population : null;
  const gdpPppPerCapita = country.population && country.gdp_ppp ? country.gdp_ppp / country.population : null;
  const hnwiRatio = country.population && country.hnwi ? (country.hnwi / country.population) * 100 : null;

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <h2 className="font-medium">Country Data</h2>
        <div className="flex items-center gap-2">
          <UpdateFromWorldBankButton countryId={country.id} />
          <UpdateCitiesButton countryId={country.id} />
          <button
            onClick={() => setEditing((e) => !e)}
            className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg hover:bg-slate-50"
          >
            {editing ? (
              <>
                <X size={13} /> Close
              </>
            ) : (
              <>
                <Pencil size={13} /> Edit
              </>
            )}
          </button>
        </div>
      </div>

      {editing ? (
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <CountryForm country={country} onSaved={() => setEditing(false)} />
        </div>
      ) : (
        <div className="space-y-4">
          {/* Block 1 — identity */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <StatCard label="Capital" value={country.capital || "—"} />
            <StatCard label="Biggest Cities" value={country.biggest_cities || "—"} />
            <StatCard label="Area" value={country.area ? `${fmt(country.area)} km²` : "—"} />
            <StatCard label="Population" value={fmtPopulationMio(country.population)} sub={growthLabel(country.population_growth_rate)} />
            <StatCard label="Urban Population" value={country.urban_population_pct !== null && country.urban_population_pct !== undefined ? fmtPct1(country.urban_population_pct) : "—"} />
          </div>

          {/* Block 2 — economy */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard label="GDP" value={country.gdp ? `${fmtMio(country.gdp)} mio USD` : "—"} sub={growthLabel(country.gdp_growth_rate)} />
            <StatCard label="GDP / capita" value={gdpPerCapita ? `${fmt(gdpPerCapita)} USD` : "—"} />
            <StatCard label="GDP (PPP)" value={country.gdp_ppp ? `${fmtMio(country.gdp_ppp)} mio USD` : "—"} sub={growthLabel(country.gdp_ppp_growth_rate)} />
            <StatCard label="GDP PPP / capita" value={gdpPppPerCapita ? `${fmt(gdpPppPerCapita)} USD` : "—"} />
          </div>

          {/* Block 3 — wealth, Block 4 — tax */}
          <div className="grid grid-cols-2 gap-3 max-w-md">
            <StatCard label="HNWI" value={fmt(country.hnwi)} sub={hnwiRatio !== null ? `${hnwiRatio.toFixed(3)}% of population` : null} />
            <StatCard label="VAT" value={country.vat !== null ? `${country.vat}%` : "—"} />
          </div>
        </div>
      )}
    </div>
  );
}
