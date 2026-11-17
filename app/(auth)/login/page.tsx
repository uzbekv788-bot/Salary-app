import { Suspense } from "react";
import Link from "next/link";
import { LoginForm } from "@/components/auth/login-form";
import { isGoogleEnabled } from "@/lib/auth";

export const metadata = { title: "Вход" };

export default function LoginPage() {
  return (
    <>
      <h1 className="text-[28px] leading-9 font-bold">С возвращением</h1>
      <p className="text-muted-foreground mt-1 mb-6">Войдите, чтобы увидеть свои финансы.</p>
      <Suspense>
        <LoginForm googleEnabled={isGoogleEnabled} />
      </Suspense>
      <p className="text-muted-foreground mt-6 text-center text-sm">
        Нет аккаунта?{" "}
        <Link href="/register" className="text-primary font-semibold hover:underline">
          Зарегистрироваться
        </Link>
      </p>
    </>
  );
}
