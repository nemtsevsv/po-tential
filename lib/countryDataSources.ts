// Server-side only — talks to the three external sources. Every function
// returns a clean, typed result and never throws past its own boundary;
// callers decide how to handle a source being unavailable (World Bank and
// GeoNames are expected to be reliable; Eurostat is explicitly best-effort
// — dataset code / response shape may still need adjustment once tested
// live).
//
// Every fetch has an explicit timeout. Without one, a single slow or
// unresponsive external call can hang indefinitely and drag the whole
// serverless function past its execution limit — which is what was
// happening: the platform then returns its own plain-text/HTML error page
// instead of JSON, which is why the client saw "Unexpected token... is not
// valid JSON" rather than a real error message.

const FETCH_TIMEOUT_MS = 8000;

async function fetchWithTimeout(url: string, timeoutMs = FETCH_TIMEOUT_MS): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { cache: "no-store", signal: controller.signal });
  } catch (e: any) {
    if (e.name === "AbortError") throw new Error(`Request timed out after ${timeoutMs / 1000}s`);
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

export type YearValue = { year: number; value: number };

const CURRENT_YEAR = new Date().getFullYear();

// ---------------- World Bank ----------------
// Public, no key required. Returns up to the last 3 years that actually
// have a published (non-null) value — current-year figures are usually not
// published yet, so we look back a wider window and keep only real data.
export async function fetchWorldBankIndicator(iso2: string, indicator: string): Promise<YearValue[]> {
  // World Bank's own documented examples consistently use lowercase country
  // codes (e.g. ".../country/br?format=json") — passing our stored
  // uppercase ISO2 as-is risked silently matching nothing for some
  // indicators while working for others.
  const url = `https://api.worldbank.org/v2/country/${iso2.toLowerCase()}/indicator/${indicator}?format=json&date=${CURRENT_YEAR - 6}:${CURRENT_YEAR}&per_page=20`;

  // One retry on failure — in practice, isolated HTTP errors on this API
  // have shown up as transient (one bad response among several identical
  // parallel calls), not a permanent problem with the indicator or country.
  let lastError: any;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetchWithTimeout(url);
      if (!res.ok) throw new Error(`World Bank ${indicator} for ${iso2}: HTTP ${res.status}`);
      const json = await res.json();
      const rows = Array.isArray(json) ? json[1] : null;
      if (!Array.isArray(rows)) return [];
      return rows
        .filter((r: any) => r.value !== null && r.value !== undefined)
        .map((r: any) => ({ year: Number(r.date), value: Number(r.value) }))
        .sort((a, b) => b.year - a.year)
        .slice(0, 3);
    } catch (e) {
      lastError = e;
      if (attempt === 0) await new Promise((r) => setTimeout(r, 500));
    }
  }
  throw lastError;
}

// ---------------- GeoNames ----------------
// Requires a free username (registered once, stored as GEONAMES_USERNAME).
export async function fetchGeoNamesTopCities(iso2: string): Promise<{ name: string; population: number }[]> {
  const username = process.env.GEONAMES_USERNAME;
  if (!username) throw new Error("GEONAMES_USERNAME is not configured");
  const url = `https://secure.geonames.org/searchJSON?country=${iso2}&featureClass=P&orderby=population&maxRows=5&username=${encodeURIComponent(username)}`;
  const res = await fetchWithTimeout(url);
  if (!res.ok) throw new Error(`GeoNames for ${iso2}: HTTP ${res.status}`);
  const json = await res.json();
  if (json.status) {
    const msg = json.status.message ?? "unknown";
    // GeoNames' most common "it looks configured but nothing works" failure
    // is that the account was registered but Free Web Services was never
    // switched on — that's a separate manual step on geonames.org, not
    // something the API key/username alone grants.
    const hint = /user does not exist|not authorized|enable/i.test(msg)
      ? " — check that 'Free Web Services' is enabled for this account at geonames.org/manageaccount"
      : "";
    throw new Error(`GeoNames error: ${msg}${hint}`);
  }
  const results = Array.isArray(json.geonames) ? json.geonames : [];
  return results
    .map((r: any) => ({ name: r.name as string, population: Number(r.population) || 0 }))
    .sort((a: any, b: any) => b.population - a.population)
    .slice(0, 5);
}

// ---------------- Eurostat Comext ----------------
// Switched to the SDMX 3.0 API (component-value filtering) per Eurostat's
// own guide: https://ec.europa.eu/eurostat/web/user-guides/data-browser/api-data-access/api-getting-started/sdmx3.0
// This replaces the earlier SDMX 2.1 positional-key approach — component
// filters (`c[dim_id]=value`) are case-insensitive, don't depend on
// getting dimension order exactly right, and each dimension's filter is
// independent of the others, which made this dataset's real requirements
// far easier to nail down:
//   - dataset DS-059341 ("International trade of EU and non-EU countries
//     since 2002 by HS2-4-6") — confirmed correct
//   - dimension ids (confirmed against the dataset's own DSD): freq,
//     reporter, partner, product, flow, indicators, TIME_PERIOD
//   - flow is numeric: 1 = Import, 2 = Export (CXT_EU_FLUX codelist)
//   - indicators: VALUE_EUR for trade value in EUR
//   - reporter 'EU27' isn't a real code — the EU aggregate is 'EU27_2020'
//   - product is HS2-4-6 only — an 8-digit CN code must be truncated to
//     its first 6 digits
//   - TIME_PERIOD in the SDMX 3.0 component filter (c[TIME_PERIOD]) takes
//     plain years ('2020', not '202052') — the 'YYYY52' annual-total code
//     turned out to be specific to Comext's legacy bulk CSV file format
//     (documented in their "Nota Bene for Period" note), not the SDMX 3.0
//     REST filter syntax. Confirmed by Eurostat's own error response:
//     every other dimension (freq/reporter/partner/product/flow/
//     indicators) was accepted; TIME_PERIOD_FILTER_SPEC_INVALID was the
//     only complaint, and only the period value format changed here.
const EUROSTAT_DATASET = "DS-059341";
const EUROSTAT_DATAFLOW_VERSION = "+"; // Eurostat's own docs: "'1.0' or '+' (meaning latest) can be used interchangeably" for unversioned artefacts like Dataflow — using '+' removes any risk that Comext's dataflow version isn't actually 1.0
const FLOW_EXPORT = "2";

// ---------------- Eurostat Comext — Trade Overview loader (separate from
// the Country Dashboard's fetchEurostatExport above) ----------------
// Country Dashboard needs "the latest few years" per reporter/CN
// combination, aggregated at EU27 level where relevant — fetchEurostatExport
// above stays exactly as it is for that.
// Trade Overview's "Load from Eurostat" has different requirements
// entirely: every individual EU member state as its own reporter (no
// EU27 aggregate — an aggregate row would double-count against the
// individual countries in any per-country chart/total), and a full
// history from 2014 rather than a rolling few-year window. Kept as its
// own function so neither use case has to compromise for the other.
export async function fetchEurostatExportForYears(partnerIso2: string, reporterIso2: string, hsCode: string, startYear: number, endYear: number): Promise<YearValue[]> {
  // DS-059341 is "HS2-4-6" — it only accepts product codes at the 2/4/6-
  // digit level, not the full 8-digit CN code the HS Codes library stores.
  // This truncation was already correctly done in fetchEurostatExport
  // above but was missing here — that's the actual cause of every
  // reporter/partner combination failing with
  // INVALID_QUERY_DIMENSION_VALUE on PRODUCT.
  const hs6Code = hsCode.slice(0, 6);
  const params = new URLSearchParams({
    "c[freq]": "A",
    "c[reporter]": reporterIso2,
    "c[partner]": partnerIso2,
    "c[product]": hs6Code,
    "c[flow]": FLOW_EXPORT,
    "c[indicators]": "VALUE_EUR",
    "c[TIME_PERIOD]": `ge:${startYear}+le:${endYear}`,
    format: "csvdata",
    formatVersion: "2.0",
    compress: "false",
  });

  const url = `https://ec.europa.eu/eurostat/api/comext/dissemination/sdmx/3.0/data/dataflow/ESTAT/${EUROSTAT_DATASET}/${EUROSTAT_DATAFLOW_VERSION}?${params.toString()}`;
  const res = await fetchWithTimeout(url);
  if (!res.ok) {
    const bodyText = await res.text().catch(() => "");
    throw new Error(`Eurostat ${EUROSTAT_DATASET} reporter=${reporterIso2} partner=${partnerIso2} product=${hs6Code}: HTTP ${res.status}${bodyText ? ` — ${bodyText.slice(0, 500)}` : ""}`);
  }
  const text = await res.text();
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  const clean = (cell: string) => cell.trim().replace(/^"|"$/g, "");
  const header = lines[0].split(",").map(clean);
  const timeIdx = header.indexOf("TIME_PERIOD");
  const valueIdx = header.indexOf("OBS_VALUE");
  if (timeIdx === -1 || valueIdx === -1) return [];
  const byYear = new Map<number, number>();
  for (const line of lines.slice(1)) {
    const cols = line.split(",").map(clean);
    const period = cols[timeIdx];
    const val = Number(cols[valueIdx]);
    if (!period || Number.isNaN(val)) continue;
    const year = Number(period.slice(0, 4));
    byYear.set(year, (byYear.get(year) ?? 0) + val);
  }
  return Array.from(byYear.entries())
    .map(([year, value]) => ({ year, value }))
    .sort((a, b) => a.year - b.year);
}

// One request per HS code covering every EU reporter at once (comma = OR in
// SDMX 3.0 component filters). With 27 reporters this cuts the number of
// calls 27-fold, so the number of configured HS codes is no longer bounded
// by the function's time limit. Returns year values keyed by reporter ISO2.
export async function fetchEurostatExportAllReporters(
  partnerIso2: string,
  reporterIso2s: string[],
  hsCode: string,
  startYear: number,
  endYear: number
): Promise<Map<string, YearValue[]>> {
  const hs6Code = hsCode.replace(/\D/g, "").slice(0, 6);
  const params = new URLSearchParams({
    "c[freq]": "A",
    "c[reporter]": reporterIso2s.join(","),
    "c[partner]": partnerIso2,
    "c[product]": hs6Code,
    "c[flow]": FLOW_EXPORT,
    "c[indicators]": "VALUE_EUR",
    "c[TIME_PERIOD]": `ge:${startYear}+le:${endYear}`,
    format: "csvdata",
    formatVersion: "2.0",
    compress: "false",
  });
  const url = `https://ec.europa.eu/eurostat/api/comext/dissemination/sdmx/3.0/data/dataflow/ESTAT/${EUROSTAT_DATASET}/${EUROSTAT_DATAFLOW_VERSION}?${params.toString()}`;
  const res = await fetchWithTimeout(url, 20000);
  if (res.status === 404) return new Map(); // Eurostat answers 404 "No results found" for empty selections
  if (!res.ok) {
    const bodyText = await res.text().catch(() => "");
    throw new Error(`Eurostat ${EUROSTAT_DATASET} partner=${partnerIso2} product=${hs6Code}: HTTP ${res.status}${bodyText ? ` — ${bodyText.slice(0, 300)}` : ""}`);
  }
  const text = await res.text();
  const lines = text.trim().split(/\r?\n/);
  const out = new Map<string, YearValue[]>();
  if (lines.length < 2) return out;
  const clean = (cell: string) => cell.trim().replace(/^"|"$/g, "");
  const header = lines[0].split(",").map(clean);
  const timeIdx = header.indexOf("TIME_PERIOD");
  const valueIdx = header.indexOf("OBS_VALUE");
  const reporterIdx = header.findIndex((h) => h.toLowerCase() === "reporter");
  if (timeIdx === -1 || valueIdx === -1 || reporterIdx === -1) throw new Error(`Eurostat response shape unexpected — columns were: ${header.join(", ")}`);
  const acc = new Map<string, Map<number, number>>();
  for (const line of lines.slice(1)) {
    const cols = line.split(",").map(clean);
    const reporter = cols[reporterIdx];
    const val = Number(cols[valueIdx]);
    const period = cols[timeIdx];
    if (!reporter || !period || Number.isNaN(val)) continue;
    const year = Number(period.slice(0, 4));
    const byYear = acc.get(reporter) ?? new Map<number, number>();
    byYear.set(year, (byYear.get(year) ?? 0) + val);
    acc.set(reporter, byYear);
  }
  acc.forEach((byYear, reporter) => {
    out.set(
      reporter,
      Array.from(byYear.entries())
        .map(([year, value]) => ({ year, value }))
        .sort((a, b) => a.year - b.year)
    );
  });
  return out;
}
