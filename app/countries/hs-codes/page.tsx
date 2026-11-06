import { createClient } from "@/lib/supabase/server";
import AppShell from "@/components/AppShell";
import HsCodesTable from "@/components/HsCodesTable";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function HsCodesPage() {
  const supabase = createClient();
  const { data: codes } = await supabase.from("hs_codes").select("*").order("product_group").order("product");

  return (
    <AppShell>
      <Link href="/countries" className="text-sm text-slate-500 hover:underline">
        ← Regions
      </Link>
      <h1 className="text-xl font-semibold mt-2 mb-1">HS Codes</h1>
      <p className="text-xs text-slate-500 mb-4 sm:mb-6 max-w-3xl">
        Product groups and HS codes used across the system. Codes ticked “Eurostat API” are loaded by “Load from Eurostat” on a country page, and the
        Product Group set here is what the Trade Overview and Market Opportunity widgets show. Eurostat works at HS 2/4/6-digit level — an 8-digit CN
        code is loaded by its first 6 digits.
      </p>
      <HsCodesTable codes={codes ?? []} />
    </AppShell>
  );
}
