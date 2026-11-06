"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { LogOut, User } from "lucide-react";
import Logo from "./Logo";

export default function TopBar() {
  const supabase = createClient();
  const router = useRouter();
  const [name, setName] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [position, setPosition] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const user = data.user;
      if (!user) return;
      setEmail(user.email ?? null);
      const meta = user.user_metadata || {};
      const fullName = [meta.first_name, meta.last_name].filter(Boolean).join(" ");
      setName(fullName || null);
      setPosition(meta.position || null);
    });
  }, []);

  const initials = name
    ? name
        .split(" ")
        .map((p) => p[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : (email?.[0] ?? "?").toUpperCase();

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-slate-200 h-14 px-4 md:px-8 flex items-center justify-between gap-3">
      <Link href="/countries" className="md:hidden">
        <Logo className="text-base" />
      </Link>
      <div className="hidden md:block" />

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="hidden sm:block text-right min-w-0">
            <div className="text-sm font-medium text-slate-800 truncate max-w-[180px]">{name || email || "My Profile"}</div>
            <div className="text-xs text-slate-400 truncate max-w-[180px]">{position || email}</div>
          </div>
          <div className="w-8 h-8 rounded-full bg-brand-500 flex items-center justify-center text-xs font-semibold text-white shrink-0">
            {initials || <User size={14} />}
          </div>
        </div>
        <div className="w-px h-6 bg-slate-200 shrink-0" />
        <button
          onClick={handleLogout}
          aria-label="Logout"
          title="Logout"
          className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors shrink-0"
        >
          <LogOut size={16} />
        </button>
      </div>
    </header>
  );
}
