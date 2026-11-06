import { createClient } from "@/lib/supabase/server";
import AppShell from "@/components/AppShell";
import CountryTable from "@/components/CountryTable";
import CountriesOverviewWidgets from "@/components/CountriesOverviewWidgets";

export const dynamic = "force-dynamic";

export default async function CountriesPage() {
  const supabase = createClient();
  const { data: countries } = await supabase
    .from("countries")
    .select("id, name, capital, biggest_cities, population, gdp, gdp_ppp, hnwi, vat")
    .order("name");

  return (
    <AppShell>
      <h1 className="text-xl font-semibold mb-4 sm:mb-6">Regions</h1>
      <CountriesOverviewWidgets countries={countries ?? []} />
      <CountryTable countries={countries ?? []} />
    </AppShell>
  );
}
