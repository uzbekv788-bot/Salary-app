import Link from "@/components/i18n/link";
import { RegisterForm } from "@/components/auth/register-form";
import { isGoogleEnabled } from "@/lib/auth";
import { getI18n } from "@/lib/i18n/server";

export async function generateMetadata() {
  const { t } = await getI18n();
  return { title: t("meta.signUp") };
}

export default async function RegisterPage() {
  const { t } = await getI18n();
  return (
    <>
      <h1 className="text-[28px] leading-9 font-bold">{t("auth.createAccount")}</h1>
      <p className="text-muted-foreground mt-1 mb-6">{t("auth.signUpHint")}</p>
      <RegisterForm googleEnabled={isGoogleEnabled} />
      <p className="text-muted-foreground mt-6 text-center text-sm">
        {t("auth.haveAccount")}{" "}
        <Link href="/login" className="text-primary font-semibold hover:underline">
          {t("auth.signIn")}
        </Link>
      </p>
    </>
  );
}
