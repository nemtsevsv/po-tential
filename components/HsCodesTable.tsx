"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Trash2, Plus } from "lucide-react";
import { isValidHsCode } from "@/lib/productGroups";

type HsCode = { id: string; product_group: string; product: string; hs_code: string; eurostat_api: boolean };

export default function HsCodesTable({ codes }: { codes: HsCode[] }) {
  const router = useRouter();
  const supabase = createClient();
  const [newRow, setNewRow] = useState({ product_group: "", product: "", hs_code: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [edits, setEdits] = useState<Record<string, Partial<HsCode>>>({});

  const groups = Array.from(new Set(codes.map((c) => c.product_group).filter(Boolean))).sort();

  function dbError(e: { code?: string; message: string } | null) {
    if (!e) return null;
    if (e.code === "23505") return "This HS code already exists.";
    if (e.code === "23514") return "HS code must be 2, 4, 6 or 8 digits.";
    return e.message;
  }

  async function toggleChecked(id: string, current: boolean) {
    const { error: e } = await supabase.from("hs_codes").update({ eurostat_api: !current }).eq("id", id);
    setError(dbError(e));
    router.refresh();
  }

  async function deleteRow(id: string, code: string) {
    if (!window.confirm(`Delete HS code ${code}?`)) return;
    const { error: e } = await supabase.from("hs_codes").delete().eq("id", id);
    setError(dbError(e));
    router.refresh();
  }

  function editField(id: string, field: keyof HsCode, value: string) {
    setEdits((e) => ({ ...e, [id]: { ...e[id], [field]: value } }));
  }

  async function saveEdit(id: string) {
    const patch = edits[id];
    if (!patch) return;
    const clean: Partial<HsCode> = {};
    if (patch.product_group !== undefined) clean.product_group = patch.product_group.trim();
    if (patch.product !== undefined) clean.product = patch.product.trim();
    if (patch.hs_code !== undefined) {
      clean.hs_code = patch.hs_code.replace(/\D/g, "");
      if (!isValidHsCode(clean.hs_code)) {
        setError("HS code must be 2, 4, 6 or 8 digits.");
        return;
      }
    }
    if (clean.product_group === "" || clean.product === "") {
      setError("Product Group and Product cannot be empty.");
      return;
    }
    const { error: e } = await supabase.from("hs_codes").update(clean).eq("id", id);
    setError(dbError(e));
    setEdits((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    router.refresh();
  }

  async function addRow() {
    const code = newRow.hs_code.replace(/\D/g, "");
    if (!newRow.product_group.trim() || !newRow.product.trim()) {
      setError("Fill in Product Group and Product.");
      return;
    }
    if (!isValidHsCode(code)) {
      setError("HS code must be 2, 4, 6 or 8 digits.");
      return;
    }
    setSaving(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const { error: e } = await supabase.from("hs_codes").insert({
      product_group: newRow.product_group.trim(),
      product: newRow.product.trim(),
      hs_code: code,
      eurostat_api: true,
      created_by: user?.email ?? null,
    });
    setSaving(false);
    setError(dbError(e));
    if (!e) setNewRow({ product_group: "", product: "", hs_code: "" });
    router.refresh();
  }

  const inputCls = "px-2 py-2 sm:py-1 border border-slate-300 rounded text-sm w-full bg-white";
  const cellInputCls = "px-1.5 py-1 border border-transparent hover:border-slate-200 focus:border-slate-300 rounded text-sm w-full bg-transparent focus:bg-white";

  const val = (c: HsCode, f: "product_group" | "product" | "hs_code") => (edits[c.id]?.[f] as string | undefined) ?? c[f] ?? "";

  const addForm = (
    <div className="grid grid-cols-1 sm:grid-cols-[1fr_1.5fr_10rem_auto] gap-2 items-center">
      <input className={inputCls} list="hs-groups" placeholder="Product Group, e.g. Valves" value={newRow.product_group} onChange={(e) => setNewRow((r) => ({ ...r, product_group: e.target.value }))} />
      <input className={inputCls} placeholder="Product description" value={newRow.product} onChange={(e) => setNewRow((r) => ({ ...r, product: e.target.value }))} />
      <input className={inputCls + " font-mono"} inputMode="numeric" placeholder="HS code (2/4/6/8 digits)" value={newRow.hs_code} onChange={(e) => setNewRow((r) => ({ ...r, hs_code: e.target.value }))} />
      <button onClick={addRow} disabled={saving} className="inline-flex items-center justify-center gap-1.5 px-3 py-2 sm:py-1.5 bg-slate-900 text-white rounded-lg text-sm hover:bg-slate-800 disabled:opacity-50">
        <Plus size={15} /> Add
      </button>
      <datalist id="hs-groups">
        {groups.map((g) => (
          <option key={g} value={g} />
        ))}
      </datalist>
    </div>
  );

  return (
    <div>
      <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm mb-3">
        <div className="text-xs font-medium text-slate-500 mb-2">Add HS code</div>
        {addForm}
        {error && <p className="text-sm text-red-700 mt-2">{error}</p>}
      </div>

      {/* Mobile: one card per code */}
      <div className="md:hidden space-y-2">
        {codes.map((c) => (
          <div key={c.id} className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm space-y-1.5">
            <div className="flex items-center gap-2">
              <input className={cellInputCls + " font-semibold"} aria-label="Product Group" value={val(c, "product_group")} onChange={(e) => editField(c.id, "product_group", e.target.value)} onBlur={() => saveEdit(c.id)} />
              <button onClick={() => deleteRow(c.id, c.hs_code)} className="p-2 text-slate-400 hover:text-red-700" aria-label="Delete">
                <Trash2 size={16} />
              </button>
            </div>
            <input className={cellInputCls + " text-slate-600"} aria-label="Product" value={val(c, "product")} onChange={(e) => editField(c.id, "product", e.target.value)} onBlur={() => saveEdit(c.id)} />
            <div className="flex items-center justify-between gap-2">
              <input className={cellInputCls + " font-mono text-xs max-w-[10rem]"} inputMode="numeric" aria-label="HS Code" value={val(c, "hs_code")} onChange={(e) => editField(c.id, "hs_code", e.target.value)} onBlur={() => saveEdit(c.id)} />
              <label className="flex items-center gap-2 text-xs text-slate-600 py-1">
                <input type="checkbox" className="w-4 h-4 accent-[#A07D3F]" checked={c.eurostat_api} onChange={() => toggleChecked(c.id, c.eurostat_api)} />
                Eurostat API
              </label>
            </div>
          </div>
        ))}
        {codes.length === 0 && <p className="text-center py-8 text-slate-400 text-sm">No HS codes yet — add one above</p>}
      </div>

      <div className="hidden md:block bg-white border border-slate-200 rounded-xl overflow-x-auto shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
            <tr>
              <th className="text-left px-3 py-2.5">Product Group</th>
              <th className="text-left px-3 py-2.5">Product</th>
              <th className="text-left px-3 py-2.5">HS Code</th>
              <th className="text-center px-3 py-2.5">Eurostat API</th>
              <th className="px-3 py-2.5"></th>
            </tr>
          </thead>
          <tbody>
            {codes.map((c) => (
              <tr key={c.id} className="border-t border-slate-100">
                <td className="px-1.5 py-1">
                  <input className={cellInputCls} value={val(c, "product_group")} onChange={(e) => editField(c.id, "product_group", e.target.value)} onBlur={() => saveEdit(c.id)} />
                </td>
                <td className="px-1.5 py-1">
                  <input className={cellInputCls} value={val(c, "product")} onChange={(e) => editField(c.id, "product", e.target.value)} onBlur={() => saveEdit(c.id)} />
                </td>
                <td className="px-1.5 py-1">
                  <input className={cellInputCls + " font-mono text-xs"} value={val(c, "hs_code")} onChange={(e) => editField(c.id, "hs_code", e.target.value)} onBlur={() => saveEdit(c.id)} />
                </td>
                <td className="px-3 py-2 text-center">
                  <input type="checkbox" className="accent-[#A07D3F]" checked={c.eurostat_api} onChange={() => toggleChecked(c.id, c.eurostat_api)} />
                </td>
                <td className="px-3 py-2 text-right">
                  <button onClick={() => deleteRow(c.id, c.hs_code)} className="text-slate-300 hover:text-red-700" aria-label="Delete">
                    <Trash2 size={14} />
                  </button>
                </td>
              </tr>
            ))}
            {codes.length === 0 && (
              <tr>
                <td colSpan={5} className="text-center py-8 text-slate-400">
                  No HS codes yet — add one above
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
