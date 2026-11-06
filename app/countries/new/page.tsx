import AppShell from "@/components/AppShell";
import CountryForm from "@/components/CountryForm";

export default function NewCountryPage() {
  return (
    <AppShell>
      <h1 className="text-xl font-semibold mb-6">New Country</h1>
      <CountryForm />
    </AppShell>
  );
}
