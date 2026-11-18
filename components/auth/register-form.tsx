"use client";

import { useState } from "react";
import { useLocaleRouter } from "@/components/i18n/use-locale-router";
import { useI18n } from "@/components/i18n/locale-provider";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/auth/form-field";
import { GoogleButton } from "@/components/auth/google-button";
import { authClient, authErrorMessage } from "@/lib/auth-client";
import { registerSchema, type RegisterInput } from "@/lib/validators/auth";

export function RegisterForm({ googleEnabled }: { googleEnabled: boolean }) {
  const router = useLocaleRouter();
  const { t } = useI18n();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterInput>({ resolver: zodResolver(registerSchema) });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    const { error } = await authClient.signUp.email(values);
    if (error) return setFormError(authErrorMessage(error));
    router.replace("/onboarding");
    router.refresh();
  });

  return (
    <>
      <form onSubmit={onSubmit} noValidate className="grid gap-4">
        <FormField
          id="name"
          label={t("auth.name")}
          autoComplete="given-name"
          placeholder={t("auth.namePlaceholder")}
          error={errors.name?.message}
          {...register("name")}
        />
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
          autoComplete="new-password"
          placeholder={t("auth.passwordPlaceholder")}
          error={errors.password?.message}
          {...register("password")}
        />
        {formError && (
          <p role="alert" className="bg-expense/10 text-expense rounded-sm px-3 py-2 text-sm">
            {t.dyn(formError)}
          </p>
        )}
        <Button type="submit" className="mt-1 w-full" disabled={isSubmitting}>
          {isSubmitting ? t("auth.creating") : t("auth.createAccount")}
        </Button>
      </form>
      {googleEnabled && <GoogleButton callbackURL="/onboarding" />}
    </>
  );
}
