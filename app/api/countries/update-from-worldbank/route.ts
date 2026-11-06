import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserEmail } from "@/lib/auth";
import { fetchWorldBankIndicator } from "@/lib/countryDataSources";

export const maxDuration = 30;

// Updates the hand-maintained fields on the existing Countries record
// (area, population, population growth, GDP, GDP growth) from World Bank —
// the one legacy field this dictionary doesn't cover is GDP (PPP), which
// stays manual, along with HNWI/VAT/Capital/Biggest Cities.
export async function POST(req: NextRequest) {
  try {
    const email = await getCurrentUserEmail();
    if (!email) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

    const { countryId } = await req.json();
    if (!countryId) return NextResponse.json({ error: "countryId is required" }, { status: 400 });

    const supabase = createClient();
    const { data: country } = await supabase.from("countries").select("id, name").eq("id", countryId).single();
    if (!country) return NextResponse.json({ error: "Country not found" }, { status: 404 });

    const { data: master } = await supabase.from("country_master").select("iso2").ilike("country_en", country.name).maybeSingle();
    if (!master) {
      return NextResponse.json(
        { error: `No matching country in the World Bank reference list for the name "${country.name}" — check spelling matches the standard English name.` },
        { status: 404 }
      );
    }

    // Each indicator call has its own timeout (in fetchWorldBankIndicator)
    // and Promise.allSettled means one slow/failing indicator can't take
    // the other four down with it or leave the request hanging.
    const indicators = ["AG.SRF.TOTL.K2", "SP.POP.TOTL", "SP.POP.GROW", "NY.GDP.MKTP.CD", "NY.GDP.MKTP.KD.ZG", "SP.URB.TOTL.IN.ZS"];
    const results = await Promise.allSettled(indicators.map((code) => fetchWorldBankIndicator(master.iso2, code)));

    const latest = (i: number) => {
      const r = results[i];
      return r.status === "fulfilled" && r.value.length > 0 ? r.value[0].value : null;
    };
    const failures = results
      .map((r, i) => (r.status === "rejected" ? `${indicators[i]}: ${(r as PromiseRejectedResult).reason?.message ?? "failed"}` : null))
      .filter(Boolean);

    const update = {
      area: latest(0),
      population: latest(1),
      population_growth_rate: latest(2),
      gdp: latest(3),
      gdp_growth_rate: latest(4),
      urban_population_pct: latest(5),
      updated_at: new Date().toISOString(),
    };

    await supabase.from("countries").update(update).eq("id", countryId);

    return NextResponse.json({ updated: update, iso2: master.iso2, warnings: failures });
  } catch (e: any) {
    return NextResponse.json({ error: `Unexpected server error: ${e?.message ?? String(e)}` }, { status: 500 });
  }
}
