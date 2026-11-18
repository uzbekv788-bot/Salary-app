"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { useLocaleRouter } from "@/components/i18n/use-locale-router";
import { useI18n } from "@/components/i18n/locale-provider";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/auth/form-field";
import { GoogleButton } from "@/components/auth/google-button";
import { authClient, authErrorMessage } from "@/lib/auth-client";
import { loginSchema, safeNext, type LoginInput } from "@/lib/validators/auth";

export function LoginForm({ googleEnabled }: { googleEnabled: boolean }) {
  const router = useLocaleRouter();
  const { t } = useI18n();
  const next = safeNext(useSearchParams().get("next"));
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    const { error } = await authClient.signIn.email(values);
    if (error) return setFormError(authErrorMessage(error));
    router.replace(next);
    router.refresh();
  });

  return (
    <>
      <form onSubmit={onSubmit} noValidate className="grid gap-4">
        <FormField
          id="email"
          label={t("auth.email")}
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          error={errors.email?.message}
          {...register("email")}
        />
        <FormField
          id="password"
          label={t("auth.password")}
          type="password"
          autoComplete="current-password"
          error={errors.password?.message}
          {...register("password")}
        />
        {formError && (
          <p role="alert" className="bg-expense/10 text-expense rounded-sm px-3 py-2 text-sm">
            {t.dyn(formError)}
          </p>
        )}
        <Button type="submit" className="mt-1 w-full" disabled={isSubmitting}>
          {isSubmitting ? t("auth.signingIn") : t("auth.signIn")}
        </Button>
      </form>
      {googleEnabled && <GoogleButton callbackURL={next} />}
    </>
  );
}
