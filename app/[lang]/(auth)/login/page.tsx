import { Suspense } from "react";
import Link from "@/components/i18n/link";
import { LoginForm } from "@/components/auth/login-form";
import { isGoogleEnabled } from "@/lib/auth";
import { getI18n } from "@/lib/i18n/server";

export async function generateMetadata() {
  const { t } = await getI18n();
  return { title: t("meta.signIn") };
}

export default async function LoginPage() {
  const { t } = await getI18n();
  return (
    <>
      <h1 className="text-[28px] leading-9 font-bold">{t("auth.welcomeBack")}</h1>
      <p className="text-muted-foreground mt-1 mb-6">{t("auth.signInHint")}</p>
      <Suspense>
        <LoginForm googleEnabled={isGoogleEnabled} />
      </Suspense>
      <p className="text-muted-foreground mt-6 text-center text-sm">
        {t("auth.noAccount")}{" "}
        <Link href="/register" className="text-primary font-semibold hover:underline">
          {t("auth.signUpLink")}
        </Link>
      </p>
    </>
  );
}
