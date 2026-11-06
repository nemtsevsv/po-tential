import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserEmail } from "@/lib/auth";
import { fetchEurostatExportAllReporters, fetchEurostatExportForYears, type YearValue } from "@/lib/countryDataSources";
import { EU_COUNTRIES } from "@/lib/euCountries";

export const maxDuration = 60;

// Loads EU member states' exports to this country from Eurostat Comext for
// every HS code ticked "Eurostat API" in HS Codes settings, 2014 → now.
// Each run replaces the previous Eurostat rows for this country (rows
// uploaded from Excel are kept), so re-loading never duplicates data.
const START_YEAR = 2014;
const CURRENT_YEAR = new Date().getFullYear();

export async function POST(req: NextRequest) {
  try {
    const email = await getCurrentUserEmail();
    if (!email) return NextResponse.json({ error: "Not authorized" }, { status: 403 });

    const { countryId } = await req.json();
    if (!countryId) return NextResponse.json({ error: "countryId is required" }, { status: 400 });

    const supabase = createClient();
    const { data: country } = await supabase.from("countries").select("id, name").eq("id", countryId).single();
    if (!country) return NextResponse.json({ error: "Country not found" }, { status: 404 });

    const { data: master } = await supabase.from("country_master").select("iso2").ilike("country_en", country.name).maybeSingle();
    if (!master) {
      return NextResponse.json(
        { error: `No matching country in the reference list for "${country.name}" — rename the country to its standard English name.` },
        { status: 404 }
      );
    }

    const { data: hsCodes } = await supabase.from("hs_codes").select("*").eq("eurostat_api", true);
    if (!hsCodes || hsCodes.length === 0) {
      return NextResponse.json({ error: "No HS codes are ticked for Eurostat API in HS Codes settings" }, { status: 400 });
    }

    const { data: euMasters } = await supabase.from("country_master").select("iso2, country_en").in("country_en", EU_COUNTRIES);
    const reporters = new Map((euMasters ?? []).map((m) => [m.iso2, m.country_en]));
    // An EU country is never its own export partner.
    reporters.delete(master.iso2);
    if (reporters.size === 0) return NextResponse.json({ error: "No EU member countries found in the reference table" }, { status: 500 });
    const reporterCodes = Array.from(reporters.keys());

    const rowsToInsert: any[] = [];
    const errors: string[] = [];
    let ok = 0;

    const pushRows = (hs: any, reporterIso2: string, values: YearValue[]) => {
      for (const v of values) {
        rowsToInsert.push({
          exporting_country: reporters.get(reporterIso2) ?? reporterIso2,
          importing_country: country.name,
          product_group: hs.product_group,
          product: hs.product,
          hs_code: hs.hs_code,
          flow: "export",
          year: v.year,
          quantity: null,
          value: v.value,
          source: "eurostat",
          uploaded_by: email,
        });
      }
    };

    // One call per HS code (all reporters at once), 6 codes in parallel.
    const BATCH = 6;
    for (let i = 0; i < hsCodes.length; i += BATCH) {
      const batch = hsCodes.slice(i, i + BATCH);
      const results = await Promise.allSettled(batch.map((hs) => fetchEurostatExportAllReporters(master.iso2, reporterCodes, hs.hs_code, START_YEAR, CURRENT_YEAR)));
      for (let j = 0; j < batch.length; j++) {
        const hs = batch[j];
        const r = results[j];
        if (r.status === "fulfilled") {
          ok++;
          r.value.forEach((values, rep) => pushRows(hs, rep, values));
          continue;
        }
        // Fallback: one reporter at a time, in case the multi-value filter is rejected.
        const per = await Promise.allSettled(reporterCodes.map((rep) => fetchEurostatExportForYears(master.iso2, rep, hs.hs_code, START_YEAR, CURRENT_YEAR)));
        let anyOk = false;
        per.forEach((p, k) => {
          if (p.status === "fulfilled") {
            anyOk = true;
            pushRows(hs, reporterCodes[k], p.value);
          }
        });
        if (anyOk) ok++;
        else errors.push(`${hs.hs_code}: ${r.reason?.message ?? "failed"}`);
      }
    }

    // Replace previous Eurostat rows for this country and the loaded codes.
    const loadedCodes = hsCodes.map((h) => h.hs_code);
    const { error: delError } = await supabase.from("trade_data").delete().eq("importing_country", country.name).eq("source", "eurostat").in("hs_code", loadedCodes);
    if (delError) return NextResponse.json({ error: `Database error: ${delError.message}` }, { status: 500 });

    for (let i = 0; i < rowsToInsert.length; i += 500) {
      const { error } = await supabase.from("trade_data").insert(rowsToInsert.slice(i, i + 500));
      if (error) return NextResponse.json({ error: `Database error: ${error.message}` }, { status: 500 });
    }

    return NextResponse.json({
      savedRows: rowsToInsert.length,
      ok,
      failed: errors.length,
      totalCombinations: hsCodes.length,
      errors: errors.slice(0, 10),
    });
  } catch (e: any) {
    return NextResponse.json({ error: `Unexpected server error: ${e?.message ?? String(e)}` }, { status: 500 });
  }
}
