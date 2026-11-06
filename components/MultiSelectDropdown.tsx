"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";

export default function MultiSelectDropdown({
  label,
  options,
  selected,
  onChange,
}: {
  label: string;
  options: string[];
  selected: string[];
  onChange: (next: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function toggle(opt: string) {
    if (selected.includes(opt)) onChange(selected.filter((o) => o !== opt));
    else onChange([...selected, opt]);
  }

  const summary = selected.length === 0 ? `All ${label}` : selected.length === 1 ? selected[0] : `${selected.length} ${label} selected`;

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 px-3 py-2 border border-slate-300 rounded-lg text-sm hover:bg-slate-50 min-w-0 sm:min-w-[140px] w-full sm:w-auto justify-between bg-white"
      >
        <span className="truncate">{summary}</span>
        <ChevronDown size={14} className="text-slate-400 shrink-0" />
      </button>
      {open && (
        <div className="absolute z-30 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg p-2 w-56 max-h-64 overflow-y-auto">
          <div className="flex justify-between text-xs px-1 pb-1 mb-1 border-b border-slate-100">
            <button className="text-brand-700 hover:underline" onClick={() => onChange(options)}>
              Select all
            </button>
            <button className="text-brand-700 hover:underline" onClick={() => onChange([])}>
              Clear
            </button>
          </div>
          {options.map((opt) => (
            <label key={opt} className="flex items-center gap-2 text-xs px-1 py-1 hover:bg-slate-50 rounded cursor-pointer">
              <input type="checkbox" checked={selected.includes(opt)} onChange={() => toggle(opt)} />
              <span className="truncate">{opt}</span>
            </label>
          ))}
          {options.length === 0 && <p className="text-xs text-slate-400 px-1 py-1">No options</p>}
        </div>
      )}
    </div>
  );
}
