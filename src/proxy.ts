// middleware.ts
import { NextResponse, type NextRequest } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

/**
 * Запускаем middleware на всех путях КРОМЕ статики и картинок.
 */
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|webp|gif|svg|ico|avif|bmp|tiff)).*)",
  ],
};

export async function middleware(req: NextRequest) {
  const url = req.nextUrl;
  const pathname = url.pathname;

  // Явный allowlist публичных путей
  const PUBLIC = new Set<string>(["/", "/login", "/api/demo-login", "/api/demo-logout"]);
  const isPublic = PUBLIC.has(pathname);

  // Ответ-заготовка (сюда будем писать куки)
  const res = NextResponse.next();

  // Demo-cookie: если есть `demo_auth=1`, считаем юзера аутентифицированным
  const demoCookie = req.cookies.get("demo_auth")?.value;
  if (demoCookie === "1") return res;

  // Публичные пути — пропускаем без Supabase
  if (isPublic) return res;

  // Методы cookies в сигнатуре, которую ждёт @supabase/ssr
  const cookies = {
    get(name: string) {
      return req.cookies.get(name)?.value;
    },
    set(name: string, value: string, options?: CookieOptions) {
      res.cookies.set({ name, value, ...(options ?? {}) });
    },
    remove(name: string, options?: CookieOptions) {
      res.cookies.set({ name, value: "", ...(options ?? {}), expires: new Date(0) });
    },
  } satisfies {
    get(name: string): string | undefined;
    set(name: string, value: string, options?: CookieOptions): void;
    remove(name: string, options?: CookieOptions): void;
  };

  // Supabase проверка сессии на приватных путях
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const redirectUrl = req.nextUrl.clone();
    redirectUrl.pathname = "/login";
    redirectUrl.searchParams.set("redirectedFrom", pathname);
    return NextResponse.redirect(redirectUrl);
  }

  return res;
}
