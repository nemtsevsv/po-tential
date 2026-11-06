"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Logo from "@/components/Logo";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      setError("Invalid email or password");
      return;
    }
    router.push("/countries");
    router.refresh();
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <form
        onSubmit={handleLogin}
        className="w-full max-w-sm bg-white p-6 sm:p-8 rounded-xl shadow-sm border border-slate-200 border-t-4 border-t-slate-900"
      >
        <h1 className="text-2xl mb-1"><Logo /></h1>
        <p className="text-sm text-slate-500 mb-6">Sign in to continue</p>

        <label className="block text-sm font-medium mb-1">Email</label>
        <input
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full mb-4 px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-400"
        />

        <label className="block text-sm font-medium mb-1">Password</label>
        <input
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full mb-4 px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-400"
        />

        {error && <p className="text-sm text-red-600 mb-3">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-slate-900 text-white py-2.5 rounded-lg font-medium hover:bg-slate-800 disabled:opacity-50"
        >
          {loading ? "Signing in..." : "Sign in"}
        </button>
      </form>
    </div>
  );
}
