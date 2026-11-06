"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";

export default function UpdateCitiesButton({ countryId }: { countryId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleUpdate() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/countries/update-cities-from-geonames", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ countryId }),
      });
      const text = await res.text();
      let json: any;
      try {
        json = JSON.parse(text);
      } catch {
        json = { error: `Server returned an unexpected response (HTTP ${res.status}): ${text.slice(0, 200)}` };
      }
      if (!res.ok) setError(json.error ?? "Update failed");
      else router.refresh();
    } catch (e: any) {
      setError(e.message);
    }
    setLoading(false);
  }

  return (
    <div>
      <button
        onClick={handleUpdate}
        disabled={loading}
        className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50"
      >
        <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
        {loading ? "Updating..." : "Update Cities (GeoNames)"}
      </button>
      {error && <p className="text-xs text-red-600 mt-1 max-w-xs">{error}</p>}
    </div>
  );
}
