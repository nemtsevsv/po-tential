"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

function fmt(n: number | null) {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  return n.toLocaleString("de-DE", { maximumFractionDigits: 0 });
}

export default function CountryForm({ country, onSaved }: { country?: any; onSaved?: () => void }) {
  const router = useRouter();
  const supabase = createClient();
  const isEdit = !!country;

  const [form, setForm] = useState({
    name: country?.name ?? "",
    capital: country?.capital ?? "",
    biggest_cities: country?.biggest_cities ?? "",
    area: country?.area ?? "",
    population: country?.population ?? "",
    population_growth_rate: country?.population_growth_rate ?? "",
    gdp: country?.gdp ?? "",
    gdp_growth_rate: country?.gdp_growth_rate ?? "",
    gdp_ppp: country?.gdp_ppp ?? "",
    gdp_ppp_growth_rate: country?.gdp_ppp_growth_rate ?? "",
    vat: country?.vat ?? "",
    urban_population_pct: country?.urban_population_pct ?? "",
    hnwi: country?.hnwi ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Reference list (249 countries). The name must match it exactly so the
  // World Bank / GeoNames / Eurostat loaders can resolve the ISO code.
  const [master, setMaster] = useState<{ country_en: string; capital: string | null }[]>([]);
  useEffect(() => {
    supabase
      .from("country_master")
      .select("country_en, capital")
      .order("country_en")
      .then(({ data }) => setMaster(data ?? []));
  }, []);
  const masterMatch = master.find((m) => m.country_en.toLowerCase() === form.name.trim().toLowerCase());

  function update(field: string, value: any) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  const num = (v: any) => (v === "" ? null : Number(v));
  const population = num(form.population);
  const gdp = num(form.gdp);
  const gdpPpp = num(form.gdp_ppp);
  const hnwi = num(form.hnwi);
  const gdpPerCapita = population && gdp ? gdp / population : null;
  const gdpPppPerCapita = population && gdpPpp ? gdpPpp / population : null;
  const hnwiRatio = population && hnwi ? (hnwi / population) * 100 : null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const payload = {
      name: masterMatch ? masterMatch.country_en : form.name.trim(),
      capital: form.capital || null,
      biggest_cities: form.biggest_cities || null,
      area: num(form.area),
      population,
      population_growth_rate: num(form.population_growth_rate),
      gdp,
      gdp_growth_rate: num(form.gdp_growth_rate),
      gdp_ppp: gdpPpp,
      gdp_ppp_growth_rate: num(form.gdp_ppp_growth_rate),
      vat: num(form.vat),
      urban_population_pct: num(form.urban_population_pct),
      hnwi,
    };

    if (isEdit) {
      const { error: err } = await supabase.from("countries").update({ ...payload, updated_at: new Date().toISOString() }).eq("id", country.id);
      if (err) {
        setError(err.message);
        setSaving(false);
        return;
      }
      router.refresh();
      setSaving(false);
      onSaved?.();
      return;
    } else {
      const { data, error: err } = await supabase
        .from("countries")
        .insert({ ...payload, created_by: user?.email ?? null })
        .select()
        .single();
      if (err || !data) {
        setError(err?.code === "23505" ? "This country already exists." : err?.message ?? "Could not save");
        setSaving(false);
        return;
      }
      router.push(`/countries/${data?.id}`);
    }
    router.refresh();
    setSaving(false);
  }

  const inputCls = "w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-300";
  const labelCls = "block text-xs font-medium text-slate-500 mb-0.5";

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-4xl">
      <div>
        <label className={labelCls}>Country Name *</label>
        <input
          required
          list="country-master-list"
          autoComplete="off"
          className={inputCls + " max-w-sm"}
          value={form.name}
          onChange={(e) => {
            const name = e.target.value;
            update("name", name);
            const m = master.find((x) => x.country_en.toLowerCase() === name.trim().toLowerCase());
            if (m && !form.capital && m.capital) update("capital", m.capital.trim());
          }}
        />
        <datalist id="country-master-list">
          {master.map((m) => (
            <option key={m.country_en} value={m.country_en} />
          ))}
        </datalist>
        {form.name.trim() && master.length > 0 && !masterMatch && (
          <p className="text-xs text-amber-700 mt-1">Not in the reference list — data loading from World Bank, GeoNames and Eurostat needs the standard English name. Pick one from the list.</p>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Capital</label>
          <input className={inputCls} value={form.capital} onChange={(e) => update("capital", e.target.value)} />
        </div>
        <div>
          <label className={labelCls}>Biggest Cities</label>
          <input className={inputCls} placeholder="e.g. City A (pop.), City B (pop.)" value={form.biggest_cities} onChange={(e) => update("biggest_cities", e.target.value)} />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <div>
          <label className={labelCls}>Area (km²)</label>
          <input type="number" className={inputCls} value={form.area} onChange={(e) => update("area", e.target.value)} />
        </div>
        <div>
          <label className={labelCls}>Population</label>
          <input type="number" className={inputCls} value={form.population} onChange={(e) => update("population", e.target.value)} />
        </div>
        <div>
          <label className={labelCls}>Population Growth Rate (%/yr)</label>
          <input type="number" step="0.01" className={inputCls} value={form.population_growth_rate} onChange={(e) => update("population_growth_rate", e.target.value)} />
        </div>

        <div>
          <label className={labelCls}>GDP (USD)</label>
          <input type="number" className={inputCls} value={form.gdp} onChange={(e) => update("gdp", e.target.value)} />
        </div>
        <div>
          <label className={labelCls}>GDP Growth Rate (%/yr)</label>
          <input type="number" step="0.01" className={inputCls} value={form.gdp_growth_rate} onChange={(e) => update("gdp_growth_rate", e.target.value)} />
        </div>
        <div>
          <label className={labelCls}>GDP / capita</label>
          <input readOnly className={inputCls + " bg-slate-50 text-slate-500"} value={fmt(gdpPerCapita)} />
        </div>

        <div>
          <label className={labelCls}>GDP (PPP, USD)</label>
          <input type="number" className={inputCls} value={form.gdp_ppp} onChange={(e) => update("gdp_ppp", e.target.value)} />
        </div>
        <div>
          <label className={labelCls}>GDP PPP Growth Rate (%/yr)</label>
          <input type="number" step="0.01" className={inputCls} value={form.gdp_ppp_growth_rate} onChange={(e) => update("gdp_ppp_growth_rate", e.target.value)} />
        </div>
        <div>
          <label className={labelCls}>GDP PPP / capita</label>
          <input readOnly className={inputCls + " bg-slate-50 text-slate-500"} value={fmt(gdpPppPerCapita)} />
        </div>

        <div>
          <label className={labelCls}>HNWI (manual)</label>
          <input type="number" className={inputCls} value={form.hnwi} onChange={(e) => update("hnwi", e.target.value)} />
        </div>
        <div>
          <label className={labelCls}>HNWI ratio (% of population)</label>
          <input readOnly className={inputCls + " bg-slate-50 text-slate-500"} value={hnwiRatio !== null ? `${hnwiRatio.toFixed(3)}%` : "—"} />
        </div>
        <div>
          <label className={labelCls}>VAT (%)</label>
          <input type="number" step="0.1" className={inputCls} value={form.vat} onChange={(e) => update("vat", e.target.value)} />
        </div>
        <div>
          <label className={labelCls}>Urban Population (%)</label>
          <input type="number" step="0.1" className={inputCls} value={form.urban_population_pct} onChange={(e) => update("urban_population_pct", e.target.value)} />
        </div>
      </div>

      {error && <p className="text-sm text-red-700">{error}</p>}
      <button type="submit" disabled={saving} className="w-full sm:w-auto px-4 py-2.5 sm:py-2 bg-slate-900 text-white rounded-lg text-sm hover:bg-slate-800 disabled:opacity-50">
        {saving ? "Saving..." : isEdit ? "Save Changes" : "Create Country"}
      </button>
    </form>
  );
}
