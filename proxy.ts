import { NextResponse, type NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";
import {
  DEFAULT_LOCALE,
  isLocale,
  LOCALE_COOKIE,
  localePath,
  negotiateLocale,
  splitLocale,
  type Locale,
} from "@/lib/i18n/config";

const APP_ROUTES = [
  "/dashboard",
  "/transactions",
  "/categories",
  "/analytics",
  "/budgets",
  "/settings",
  "/recurring",
  "/goals",
  "/onboarding",
];
const GUEST_ROUTES = ["/login", "/register"];
const YEAR = 60 * 60 * 24 * 365;

/**
 * 1. Язык (tasks.md 18.1): русский — без префикса (/dashboard → внутренний /ru/dashboard),
 *    английский и узбекский — /en/…, /uz/…. Явный /ru/… → канонический адрес без префикса.
 *    Первый визит без cookie — язык из Accept-Language браузера.
 * 2. Оптимистичная проверка сессии по cookie (tasks.md 4.5); настоящая — в requireUser().
 */
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const { locale: prefixed, path } = splitLocale(pathname);

  if (prefixed === DEFAULT_LOCALE) {
    return NextResponse.redirect(new URL(path + search, request.url));
  }

  const cookieLocale = request.cookies.get(LOCALE_COOKIE)?.value;
  let locale: Locale;
  if (prefixed) {
    locale = prefixed;
  } else {
    const preferred = isLocale(cookieLocale)
      ? cookieLocale
      : negotiateLocale(request.headers.get("accept-language"));
    if (preferred !== DEFAULT_LOCALE) {
      return withLocaleCookie(
        NextResponse.redirect(new URL(localePath(preferred, path) + search, request.url)),
        preferred,
      );
    }
    locale = DEFAULT_LOCALE;
  }

  const hasSession = Boolean(getSessionCookie(request));
  if (!hasSession && APP_ROUTES.some((r) => path === r || path.startsWith(r + "/"))) {
    const url = new URL(localePath(locale, "/login"), request.url);
    url.searchParams.set("next", path);
    return NextResponse.redirect(url);
  }
  if (hasSession && GUEST_ROUTES.includes(path)) {
    return NextResponse.redirect(new URL(localePath(locale, "/dashboard"), request.url));
  }

  const response = prefixed
    ? NextResponse.next()
    : NextResponse.rewrite(
        new URL(`/${DEFAULT_LOCALE}${path === "/" ? "" : path}${search}`, request.url),
      );
  return cookieLocale === locale ? response : withLocaleCookie(response, locale);
}

function withLocaleCookie(res: NextResponse, locale: Locale) {
  res.cookies.set(LOCALE_COOKIE, locale, { path: "/", maxAge: YEAR, sameSite: "lax" });
  return res;
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|sw\\.js|manifest\\.webmanifest|icon\\.svg|apple-icon\\.png|icons/|favicon.ico|.*\\.(?:png|svg|jpg|ico|webp|js)$).*)",
  ],
};
