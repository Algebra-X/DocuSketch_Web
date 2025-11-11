import { NextResponse, type NextRequest } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

/**
 * Запускаем proxy на всех путях КРОМЕ статики и картинок.
 * Паттерн из док Next.js: "/((?!api|_next/static|_next/image|favicon.ico).*)"
 * Добавил svg/png/jpg/webp и т.д. на всякий.
 */
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|webp|gif|svg|ico|avif|bmp|tiff)).*)",
  ],
};

export async function proxy(req: NextRequest) {
  const url = req.nextUrl;
  const pathname = url.pathname;

  // Явный allowlist публичных путей
  // Allow the demo login/logout API endpoints (and other public API endpoints) to run
  // without prior authentication so they can set/clear the demo cookie.
  const PUBLIC = new Set<string>(["/", "/login", "/api/demo-login", "/api/demo-logout"]);
  const isPublic = PUBLIC.has(pathname);

  // Ответ-заготовка (сюда будем писать куки)
  const res = NextResponse.next();

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

  // Quick demo-cookie check: if `demo_auth` cookie is present and valid,
  // treat the request as authenticated (demo mode) and skip Supabase.
  // This lets the simple password-only login work without a Supabase client on the browser.
  const demoCookie = req.cookies.get("demo_auth")?.value;
  if (demoCookie === "1") {
    // allow demo-authenticated user
    return res;
  }

  // Инициализируем Supabase client
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies } // <- важно: передаём объект с методами
  );

  // Проверяем юзера
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Если нет сессии и путь НЕ публичный — редирект на /login
  if (!user && !isPublic) {
    const redirectUrl = req.nextUrl.clone();
    redirectUrl.pathname = "/login";
    redirectUrl.searchParams.set("redirectedFrom", pathname);
    return NextResponse.redirect(redirectUrl);
  }

  // Иначе пропускаем
  return res;
}
