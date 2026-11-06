"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import * as XLSX from "xlsx";
import { createClient } from "@/lib/supabase/client";
import { Upload } from "lucide-react";
import { btnImport } from "@/lib/buttonStyles";

function normalizeKey(k: string) {
  return k.toLowerCase().replace(/[^a-z0-9]/g, "");
}

const FIELD_MAP: Record<string, string> = {
  exportingcountry: "exporting_country",
  importingcountry: "importing_country",
  productgroup: "product_group",
  product: "product",
  hscode: "hs_code",
  flow: "flow",
  year: "year",
  quantity: "quantity",
  value: "value",
};

function parseNum(v: any): number | null {
  if (v === undefined || v === null || v === "") return null;
  const n = Number(String(v).replace(/,/g, ""));
  return Number.isNaN(n) ? null : n;
}

export default function TradeDataImport() {
  const router = useRouter();
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ inserted: number; skipped: number; errors: string[] } | null>(null);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    setResult(null);

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const data = new Uint8Array(evt.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows: Record<string, any>[] = XLSX.utils.sheet_to_json(sheet, { defval: "" });

        const errors: string[] = [];
        const parsedRows: Record<string, any>[] = [];

        for (const row of rows) {
          const mapped: Record<string, any> = {};
          for (const key of Object.keys(row)) {
            const field = FIELD_MAP[normalizeKey(key)];
            if (field) mapped[field] = row[key];
          }
          if (!mapped.exporting_country || !mapped.importing_country || !mapped.flow || !mapped.year) {
            errors.push(`Row skipped: missing required field (${JSON.stringify(row)})`);
            continue;
          }
          parsedRows.push({
            exporting_country: String(mapped.exporting_country).trim(),
            importing_country: String(mapped.importing_country).trim(),
            product_group: mapped.product_group ? String(mapped.product_group).trim() : null,
            product: mapped.product ? String(mapped.product).trim() : null,
            hs_code: mapped.hs_code ? String(mapped.hs_code).trim() : null,
            flow: String(mapped.flow).trim().toLowerCase(),
            year: parseNum(mapped.year),
            quantity: parseNum(mapped.quantity),
            value: parseNum(mapped.value),
          });
        }

        if (parsedRows.length === 0) {
          setResult({ inserted: 0, skipped: rows.length, errors });
          setImporting(false);
          return;
        }

        const {
          data: { user },
        } = await supabase.auth.getUser();
        const { error } = await supabase.from("trade_data").insert(parsedRows.map((r) => ({ ...r, source: "file", uploaded_by: user?.email ?? null })));
        if (error) errors.push(error.message);

        setResult({ inserted: parsedRows.length, skipped: rows.length - parsedRows.length, errors });
        router.refresh();
      } catch (err: any) {
        setResult({ inserted: 0, skipped: 0, errors: [err.message ?? "Failed to read file"] });
      }
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    };
    reader.readAsArrayBuffer(file);
  }

  return (
    <div>
      <label className={btnImport + " cursor-pointer inline-flex"}>
        <Upload size={14} />
        {importing ? "Importing..." : "Upload Trade Data (.xls/.xlsx)"}
        <input ref={fileInputRef} type="file" accept=".xls,.xlsx" onChange={handleFile} className="hidden" disabled={importing} />
      </label>
      {result && (
        <div className="mt-2 text-sm bg-slate-50 border border-slate-200 rounded-lg p-3">
          <p>
            Inserted: <span className="font-medium text-brand-700">{result.inserted}</span> · Skipped:{" "}
            <span className="font-medium text-slate-500">{result.skipped}</span>
          </p>
          {result.errors.length > 0 && (
            <ul className="mt-1 text-xs text-red-600 list-disc pl-4">
              {result.errors.slice(0, 5).map((e, i) => (
                <li key={i}>{e}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
