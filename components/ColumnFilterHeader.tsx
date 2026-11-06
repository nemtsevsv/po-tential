"use client";

import { useState, useRef, useEffect } from "react";
import { Filter, ArrowUp, ArrowDown } from "lucide-react";

export default function ColumnFilterHeader({
  label,
  options,
  selected,
  onChange,
  sortDir,
  onSort,
  align = "left",
}: {
  label: string;
  options: string[];
  selected: string[];
  onChange: (next: string[]) => void;
  sortDir?: "asc" | "desc" | null;
  onSort?: (dir: "asc" | "desc") => void;
  align?: "left" | "right";
}) {
  const [open, setOpen] = useState(false);
  // Positioned fixed (viewport coordinates), not absolute inside the table's
  // scroll container — a scroll wrapper with overflow-x-auto clips
  // overflow on both axes, which used to cut the dropdown off whenever the
  // table shrank (e.g. an empty filtered result). Fixed positioning escapes
  // that clipping entirely.
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node) &&
        panelRef.current &&
        !panelRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    function handleScroll() {
      setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    window.addEventListener("scroll", handleScroll, true);
    window.addEventListener("resize", handleScroll);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      window.removeEventListener("scroll", handleScroll, true);
      window.removeEventListener("resize", handleScroll);
    };
  }, []);

  function openDropdown() {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (rect) {
      const panelWidth = 208; // w-52
      let left = align === "right" ? rect.right - panelWidth : rect.left;
      left = Math.max(8, Math.min(left, window.innerWidth - panelWidth - 8));
      setCoords({ top: rect.bottom + 4, left });
    }
    setOpen((o) => !o);
  }

  const allSelected = selected.length === 0 || selected.length === options.length;

  function toggle(opt: string) {
    const base = selected.length === 0 ? [...options] : selected;
    if (base.includes(opt)) onChange(base.filter((o) => o !== opt));
    else onChange([...base, opt]);
  }

  return (
    <div className="relative inline-block" ref={triggerRef}>
      <div className={`flex items-center gap-1 ${align === "right" ? "justify-end" : ""}`}>
        <span>{label}</span>
        {onSort && (
          <button onClick={() => onSort(sortDir === "asc" ? "desc" : "asc")} className="text-slate-400 hover:text-slate-700">
            {sortDir === "asc" ? <ArrowUp size={11} /> : sortDir === "desc" ? <ArrowDown size={11} /> : <ArrowUp size={11} className="opacity-30" />}
          </button>
        )}
        {options.length > 0 && (
          <button onClick={openDropdown} className={`hover:text-slate-700 ${!allSelected ? "text-slate-900" : "text-slate-400"}`}>
            <Filter size={11} fill={!allSelected ? "currentColor" : "none"} />
          </button>
        )}
      </div>
      {open && coords && (
        <div
          ref={panelRef}
          style={{ position: "fixed", top: coords.top, left: coords.left }}
          className="z-50 bg-white border border-slate-200 rounded-lg shadow-lg p-2 w-52 max-h-64 overflow-y-auto normal-case font-normal text-slate-700"
        >
          <div className="flex justify-between text-xs px-1 pb-1 mb-1 border-b border-slate-100">
            <button className="text-brand-700 hover:underline" onClick={() => onChange([])}>
              Select all
            </button>
            <button className="text-brand-700 hover:underline" onClick={() => onChange(["__none__"])}>
              Clear
            </button>
          </div>
          {options.map((opt) => (
            <label key={opt} className="flex items-center gap-2 text-xs px-1 py-1 hover:bg-slate-50 rounded cursor-pointer">
              <input type="checkbox" checked={allSelected || selected.includes(opt)} onChange={() => toggle(opt)} />
              <span className="truncate">{opt || "(empty)"}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
