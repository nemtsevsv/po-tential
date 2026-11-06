// Text wordmark — PO-tential has no logo file yet.
export default function Logo({ light = false, className = "" }: { light?: boolean; className?: string }) {
  return (
    <span className={`font-semibold tracking-tight select-none ${light ? "text-white" : "text-slate-900"} ${className}`}>
      PO<span className="text-brand-400">-</span>tential
    </span>
  );
}
