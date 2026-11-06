import { createClient } from "@/lib/supabase/server";

// PO-tential has a single role: every signed-in user has full access.
export async function getCurrentUserEmail(): Promise<string | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.email ?? null;
}
