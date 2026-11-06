"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Download } from "lucide-react";

export default function LoadFromEurostatButton({ countryId }: { countryId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  async function handleLoad() {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/countries/load-trade-from-eurostat", {
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
      setResult(json);
      router.refresh();
    } catch (e: any) {
      setResult({ error: e.message });
    }
    setLoading(false);
  }

  return (
    <div>
      <button
        onClick={handleLoad}
        disabled={loading}
        className="flex items-center gap-1.5 px-3 py-2 justify-center border border-slate-900 bg-slate-900 text-white rounded-lg text-sm hover:bg-slate-800 disabled:opacity-50"
        title="Loads exports from all EU member states to this country, 2014–present, for every HS code ticked in HS Codes. Replaces previously loaded Eurostat rows."
      >
        <Download size={14} />
        {loading ? "Loading from Eurostat…" : "Load from Eurostat"}
      </button>
      {result && (
        <div className="mt-2 text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-lg p-2 max-w-md">
          {result.error && <p className="text-red-600">{result.error}</p>}
          {result.savedRows !== undefined && (
            <div>
              <p>
                Saved {result.savedRows} rows — {result.ok}/{result.totalCombinations} HS codes loaded
              </p>
              {result.errors?.length > 0 && (
                <ul className="mt-0.5 pl-3 list-disc text-red-600">
                  {result.errors.map((e: string, i: number) => (
                    <li key={i}>{e}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
