"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Globe, Settings } from "lucide-react";
import Logo from "./Logo";

export const NAV_ITEMS = [
  { href: "/countries", label: "Regions", icon: Globe, match: (p: string) => p.startsWith("/countries") && !p.startsWith("/countries/hs-codes") },
  { href: "/countries/hs-codes", label: "HS Codes", icon: Settings, match: (p: string) => p.startsWith("/countries/hs-codes") },
];

// Desktop: dark anthracite sidebar. Mobile: bottom tab bar (see MobileNav).
export default function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="hidden md:flex w-56 shrink-0 bg-slate-900 text-white flex-col sticky top-0 h-screen">
      <div className="h-14 flex items-center px-5 border-b border-white/10">
        <Logo light className="text-lg" />
      </div>
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {NAV_ITEMS.map((item) => {
          const active = item.match(pathname);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors border-l-2 ${
                active ? "bg-white/10 text-white border-brand-400" : "text-slate-300 border-transparent hover:bg-white/5 hover:text-white"
              }`}
            >
              <Icon size={16} className="shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

export function MobileNav() {
  const pathname = usePathname();
  return (
    <nav
      className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-slate-900 text-white border-t border-white/10 grid grid-cols-2"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      {NAV_ITEMS.map((item) => {
        const active = item.match(pathname);
        const Icon = item.icon;
        return (
          <Link key={item.href} href={item.href} className={`flex flex-col items-center gap-0.5 py-2.5 text-[11px] ${active ? "text-brand-300" : "text-slate-300"}`}>
            <Icon size={20} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
