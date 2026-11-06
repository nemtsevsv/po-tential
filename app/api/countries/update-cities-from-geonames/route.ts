import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserEmail } from "@/lib/auth";
import { fetchGeoNamesTopCities } from "@/lib/countryDataSources";

export const maxDuration = 30;

function fmtMio(population: number): string {
  return (population / 1_000_000).toLocaleString("de-DE", { minimumFractionDigits: 3, maximumFractionDigits: 3 });
}

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
        { error: `No matching country in the GeoNames reference list for the name "${country.name}" — check spelling matches the standard English name.` },
        { status: 404 }
      );
    }

    const cities = await fetchGeoNamesTopCities(master.iso2);
    if (cities.length === 0) {
      return NextResponse.json({ error: "GeoNames returned no populated places for this country" }, { status: 502 });
    }

    const biggest_cities = cities.map((c) => `${c.name} (${fmtMio(c.population)} mio)`).join("; ");
    await supabase.from("countries").update({ biggest_cities, updated_at: new Date().toISOString() }).eq("id", countryId);

    return NextResponse.json({ biggest_cities });
  } catch (e: any) {
    return NextResponse.json({ error: `Unexpected server error: ${e?.message ?? String(e)}` }, { status: 500 });
  }
}
