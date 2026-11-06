import { createClient } from "@/lib/supabase/server";
import AppShell from "@/components/AppShell";
import CountryOverview from "@/components/CountryOverview";
import DeleteCountryButton from "@/components/DeleteCountryButton";
import CountryTradeOverview from "@/components/CountryTradeOverview";
import CountryImportChart from "@/components/CountryImportChart";
import MarketOpportunityWidget from "@/components/MarketOpportunityWidget";
import { fetchAll } from "@/lib/fetchAll";
import Link from "next/link";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function CountryPage({ params }: { params: { id: string } }) {
  const supabase = createClient();

  const { data: country, error } = await supabase.from("countries").select("*").eq("id", params.id).single();
  if (error || !country) notFound();

  // Two plain equality queries instead of one PostgREST .or() filter: country
  // names may contain commas, dots or parentheses ("Korea, Republic of"),
  // which break the .or() filter syntax. fetchAll pages past the 1000-row cap.
  const [asImporter, asExporter, { data: hsCodes }] = await Promise.all([
    fetchAll((from, to) => supabase.from("trade_data").select("*").eq("importing_country", country.name).order("year", { ascending: false }).range(from, to)),
    fetchAll((from, to) => supabase.from("trade_data").select("*").eq("exporting_country", country.name).neq("importing_country", country.name).order("year", { ascending: false }).range(from, to)),
    supabase.from("hs_codes").select("hs_code, product_group, product").order("product_group"),
  ]);
  const tradeRows = [...asImporter, ...asExporter];

  return (
    <AppShell>
      <Link href="/countries" className="text-sm text-slate-500 hover:underline">
        ← All countries
      </Link>
      <div className="flex items-center justify-between mt-2 mb-4 sm:mb-6 flex-wrap gap-2">
        <h1 className="text-xl font-semibold">{country.name}</h1>
        <DeleteCountryButton countryId={country.id} />
      </div>

      <CountryOverview country={country} />

      <div className="mb-6">
        <CountryImportChart countryName={country.name} rows={tradeRows as any} hsCodes={hsCodes ?? []} />
      </div>

      <div className="mb-6">
        <MarketOpportunityWidget countryName={country.name} rows={tradeRows as any} hsCodes={hsCodes ?? []} />
      </div>

      <div>
        <h2 className="font-medium mb-3 sm:mb-4">Trade Data</h2>
        <CountryTradeOverview countryId={country.id} countryName={country.name} rows={tradeRows as any} />
      </div>
    </AppShell>
  );
}
