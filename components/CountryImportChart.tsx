"use client";

import { useMemo, useState } from "react";
import MultiSelectDropdown from "./MultiSelectDropdown";
import { X } from "lucide-react";
import { CHART_COLORS as COLORS } from "@/lib/theme";
import { buildGroupResolver, configuredGroups, OTHER_GROUP, type HsCodeSetting } from "@/lib/productGroups";

type TradeRow = { exporting_country: string; importing_country: string; hs_code: string | null; flow: string; year: number; value: number | null };

export default function CountryImportChart({ countryName, rows, hsCodes }: { countryName: string; rows: TradeRow[]; hsCodes: HsCodeSetting[] }) {
  // Product Group comes from the HS Codes settings (matched by HS code), not
  // from the text stored on each trade row.
  const resolveGroup = useMemo(() => buildGroupResolver(hsCodes), [hsCodes]);
  const allImports = useMemo(
    () => rows.filter((r) => r.flow === "export" && r.importing_country === countryName).map((r) => ({ ...r, group: resolveGroup(r.hs_code) })),
    [rows, countryName, resolveGroup]
  );
  const originCountries = Array.from(new Set(allImports.map((r) => r.exporting_country))).sort();
  const configured = configuredGroups(hsCodes);
  const allProductGroups = allImports.some((r) => r.group === OTHER_GROUP) ? [...configured, OTHER_GROUP] : configured;

  // Colors are assigned once, from the full (unfiltered) set of product
  // groups, sorted alphabetically — so a group keeps the same color no
  // matter which year, origin-country, or product-group filter is applied.
  const colorMap = new Map(allProductGroups.map((g, i) => [g, COLORS[i % COLORS.length]]));

  const [originFilter, setOriginFilter] = useState<string[]>([]);
  const [groupFilter, setGroupFilter] = useState<string[]>([]);
  const [selectedBar, setSelectedBar] = useState<{ year: number; group: string } | null>(null);

  const imports = useMemo(
    () =>
      allImports
        .filter((r) => originFilter.length === 0 || originFilter.includes(r.exporting_country))
        .filter((r) => groupFilter.length === 0 || groupFilter.includes(r.group)),
    [allImports, originFilter, groupFilter]
  );

  const years = Array.from(new Set(imports.map((r) => r.year))).sort();
  const groups = allProductGroups.filter((g) => imports.some((r) => r.group === g));

  const dataByYear = years.map((year) => {
    const byGroup: Record<string, number> = {};
    for (const g of groups) byGroup[g] = 0;
    for (const r of imports) {
      if (r.year !== year) continue;
      const g = r.group;
      byGroup[g] = (byGroup[g] ?? 0) + (Number(r.value) || 0);
    }
    return { year, byGroup };
  });

  const maxValue = Math.max(...dataByYear.flatMap((d) => Object.values(d.byGroup)), 1);

  // Country breakdown behind whichever bar (year + product group) the
  // person clicked — largest export country first, capped at 5 with the
  // rest summarized.
  const breakdown = useMemo(() => {
    if (!selectedBar) return null;
    const byCountry = new Map<string, number>();
    for (const r of imports) {
      if (r.year !== selectedBar.year) continue;
      if (r.group !== selectedBar.group) continue;
      byCountry.set(r.exporting_country, (byCountry.get(r.exporting_country) ?? 0) + (Number(r.value) || 0));
    }
    const sorted = Array.from(byCountry.entries())
      .filter(([, v]) => v > 0)
      .sort((a, b) => b[1] - a[1]);
    const total = sorted.reduce((s, [, v]) => s + v, 0);
    return { top: sorted.slice(0, 5), remaining: Math.max(0, sorted.length - 5), total };
  }, [selectedBar, imports]);

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm relative">
      <div className="flex items-center justify-between flex-wrap gap-2 mb-1">
        <div>
          <h3 className="font-medium">Trade Overview</h3>
          <p className="text-xs text-slate-400">Export from EU member states to {countryName}, EUR</p>
        </div>
        <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 w-full sm:w-auto">
          <MultiSelectDropdown label="Product Group" options={allProductGroups} selected={groupFilter} onChange={setGroupFilter} />
          <MultiSelectDropdown label="Origin Country" options={originCountries} selected={originFilter} onChange={setOriginFilter} />
        </div>
      </div>

      {years.length === 0 ? (
        <p className="text-sm text-slate-400 mt-4">No trade data yet — load from Eurostat or upload a file below.</p>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-3 mb-3 mt-3">
            {groups.map((g) => (
              <span key={g} className="flex items-center gap-1.5 text-xs">
                <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ backgroundColor: colorMap.get(g) }} />
                {g}
              </span>
            ))}
          </div>
          <p className="text-[10px] text-slate-400 mb-2">Tap a bar to see which countries it's made up of.</p>
          <div className="flex items-end gap-4 h-56 overflow-x-auto pb-1 -mx-1 px-1 snap-x">
            {dataByYear.map((d) => (
              <div key={d.year} className="flex flex-col items-center gap-1 h-full justify-end shrink-0 snap-end">
                <div className="flex items-end gap-1 h-full">
                  {groups.map((g) => {
                    const v = d.byGroup[g] ?? 0;
                    return (
                      <div key={g} className="flex flex-col items-center justify-end h-full">
                        {v > 0 && <span className="text-[8px] text-slate-500 whitespace-nowrap">{Math.round(v).toLocaleString("de-DE")}</span>}
                        <button
                          onClick={() => v > 0 && setSelectedBar({ year: d.year, group: g })}
                          className="w-3.5 sm:w-4 rounded-t hover:opacity-75 transition-opacity disabled:cursor-default"
                          style={{ height: `${(v / maxValue) * 100}%`, backgroundColor: colorMap.get(g), minHeight: v > 0 ? 2 : 0 }}
                          title={`${g}: ${Math.round(v).toLocaleString("de-DE")}`}
                          disabled={v <= 0}
                        />
                      </div>
                    );
                  })}
                </div>
                <span className="text-[10px] text-slate-400">{d.year}</span>
              </div>
            ))}
          </div>
        </>
      )}

      {selectedBar && breakdown && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/30 sm:p-4" onClick={() => setSelectedBar(null)}>
          <div className="bg-white rounded-t-2xl sm:rounded-xl shadow-xl p-4 pb-6 sm:pb-4 w-full sm:max-w-xs" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-1">
              <h4 className="font-medium text-sm">
                {selectedBar.group} — {selectedBar.year}
              </h4>
              <button onClick={() => setSelectedBar(null)} className="text-slate-400 hover:text-slate-700">
                <X size={16} />
              </button>
            </div>
            <p className="text-xs text-slate-400 mb-3">Export countries, largest first</p>
            <div className="space-y-1.5">
              {breakdown.top.map(([country, value]) => (
                <div key={country} className="flex items-center justify-between text-sm">
                  <span className="text-slate-600">{country}</span>
                  <span className="font-medium">{Math.round(value).toLocaleString("de-DE")}</span>
                </div>
              ))}
              {breakdown.remaining > 0 && <p className="text-xs text-slate-400 pt-1">... and {breakdown.remaining} more</p>}
            </div>
            <div className="flex items-center justify-between text-sm mt-3 pt-2 border-t border-slate-100 font-semibold">
              <span>Total</span>
              <span>{Math.round(breakdown.total).toLocaleString("de-DE")}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
