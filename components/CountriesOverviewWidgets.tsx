type Country = { population: number | null; gdp: number | null; hnwi: number | null };

function fmt(n: number) {
  return Math.round(n).toLocaleString("de-DE");
}

export default function CountriesOverviewWidgets({ countries }: { countries: Country[] }) {
  const totalPopulation = countries.reduce((s, c) => s + (c.population ?? 0), 0);
  const totalHnwi = countries.reduce((s, c) => s + (c.hnwi ?? 0), 0);
  const totalGdpMio = countries.reduce((s, c) => s + (c.gdp ?? 0), 0) / 1_000_000;

  const widgets = [
    { label: "Total Countries", value: countries.length.toLocaleString("de-DE") },
    { label: "Total Population", value: fmt(totalPopulation) },
    { label: "Total HNWI", value: fmt(totalHnwi) },
    { label: "Total GDP, mio USD", value: fmt(totalGdpMio) },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 mb-4">
      {widgets.map((w) => (
        <div key={w.label} className="bg-white border border-slate-200 rounded-xl p-3 sm:p-3.5 shadow-sm border-t-2 border-t-brand-500">
          <div className="text-[11px] sm:text-xs text-slate-500 mb-1">{w.label}</div>
          <div className="text-base sm:text-lg font-semibold text-slate-900 truncate">{w.value}</div>
        </div>
      ))}
    </div>
  );
}
