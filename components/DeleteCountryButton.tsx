"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Trash2 } from "lucide-react";
import { btnDanger } from "@/lib/buttonStyles";

export default function DeleteCountryButton({ countryId }: { countryId: string }) {
  const router = useRouter();
  const supabase = createClient();
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    setDeleting(true);
    await supabase.from("countries").delete().eq("id", countryId);
    router.push("/countries");
    router.refresh();
  }

  if (confirming) {
    return (
      <div className="flex items-center gap-2 text-sm">
        <span className="text-red-600">Delete this country?</span>
        <button onClick={handleDelete} disabled={deleting} className="px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50">
          {deleting ? "Deleting..." : "Yes, delete"}
        </button>
        <button onClick={() => setConfirming(false)} className="px-3 py-1.5 border border-slate-300 rounded-lg hover:bg-slate-50">
          Cancel
        </button>
      </div>
    );
  }

  return (
    <button onClick={() => setConfirming(true)} className={btnDanger}>
      <Trash2 size={14} />
      Delete Country
    </button>
  );
}
