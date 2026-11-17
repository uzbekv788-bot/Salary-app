import Link from "next/link";
import { RegisterForm } from "@/components/auth/register-form";
import { isGoogleEnabled } from "@/lib/auth";

export const metadata = { title: "Регистрация" };

export default function RegisterPage() {
  return (
    <>
      <h1 className="text-[28px] leading-9 font-bold">Создать аккаунт</h1>
      <p className="text-muted-foreground mt-1 mb-6">
        Минута — и вы начнёте видеть, куда уходят деньги.
      </p>
      <RegisterForm googleEnabled={isGoogleEnabled} />
      <p className="text-muted-foreground mt-6 text-center text-sm">
        Уже есть аккаунт?{" "}
        <Link href="/login" className="text-primary font-semibold hover:underline">
          Войти
        </Link>
      </p>
    </>
  );
}
