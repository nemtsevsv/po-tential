import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request: { headers: request.headers } });

  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      get(name: string) {
        return request.cookies.get(name)?.value;
      },
      set(name: string, value: string, options: any) {
        response.cookies.set({ name, value, ...options });
      },
      remove(name: string, options: any) {
        response.cookies.set({ name, value: "", ...options });
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isLoginPage = path.startsWith("/login");

  if (!user && !isLoginPage) {
    if (path.startsWith("/api/")) return NextResponse.json({ error: "Not authorized" }, { status: 401 });
    return NextResponse.redirect(new URL("/login", request.url));
  }
  if (user && isLoginPage) return NextResponse.redirect(new URL("/countries", request.url));

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg).*)"],
};
