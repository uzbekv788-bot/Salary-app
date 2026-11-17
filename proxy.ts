import { NextResponse, type NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

const APP_ROUTES = [
  "/dashboard",
  "/transactions",
  "/categories",
  "/analytics",
  "/budgets",
  "/settings",
  "/onboarding",
];
const GUEST_ROUTES = ["/login", "/register"];

/**
 * Оптимистичная проверка по наличию cookie сессии (tasks.md 4.5).
 * Настоящая проверка сессии и онбординга — в requireUser() на сервере.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSession = Boolean(getSessionCookie(request));

  if (!hasSession && APP_ROUTES.some((r) => pathname === r || pathname.startsWith(r + "/"))) {
    const url = new URL("/login", request.url);
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }
  if (hasSession && GUEST_ROUTES.includes(pathname)) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:png|svg|jpg|ico|webp)$).*)"],
};
