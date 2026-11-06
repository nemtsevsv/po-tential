"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Eraser } from "lucide-react";

export default function ClearTradeDataButton({ countryName }: { countryName: string }) {
  const router = useRouter();
  const supabase = createClient();
  const [confirming, setConfirming] = useState(false);
  const [clearing, setClearing] = useState(false);

  async function handleClear() {
    setClearing(true);
    // Two equality deletes — names with commas/parentheses break .or() syntax.
    await supabase.from("trade_data").delete().eq("importing_country", countryName);
    await supabase.from("trade_data").delete().eq("exporting_country", countryName);
    setClearing(false);
    setConfirming(false);
    router.refresh();
  }

  if (confirming) {
    return (
      <div className="flex items-center gap-2 text-sm">
        <span className="text-red-600">Delete all trade data for {countryName}?</span>
        <button onClick={handleClear} disabled={clearing} className="px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50">
          {clearing ? "Clearing..." : "Yes, clear it"}
        </button>
        <button onClick={() => setConfirming(false)} className="px-3 py-1.5 border border-slate-300 rounded-lg hover:bg-slate-50">
          Cancel
        </button>
      </div>
    );
  }

  return (
    <button onClick={() => setConfirming(true)} className="flex items-center gap-1.5 text-xs text-red-500 hover:text-red-700">
      <Eraser size={13} />
      Clear uploaded data
    </button>
  );
}
