"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/auth/form-field";
import { GoogleButton } from "@/components/auth/google-button";
import { authClient, authErrorMessage } from "@/lib/auth-client";
import { registerSchema, type RegisterInput } from "@/lib/validators/auth";

export function RegisterForm({ googleEnabled }: { googleEnabled: boolean }) {
  const router = useRouter();
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
          label="Имя"
          autoComplete="given-name"
          placeholder="Анна"
          error={errors.name?.message}
          {...register("name")}
        />
        <FormField
          id="email"
          label="Email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          error={errors.email?.message}
          {...register("email")}
        />
        <FormField
          id="password"
          label="Пароль"
          type="password"
          autoComplete="new-password"
          placeholder="Минимум 8 символов"
          error={errors.password?.message}
          {...register("password")}
        />
        {formError && (
          <p role="alert" className="bg-expense/10 text-expense rounded-sm px-3 py-2 text-sm">
            {formError}
          </p>
        )}
        <Button type="submit" className="mt-1 w-full" disabled={isSubmitting}>
          {isSubmitting ? "Создаём аккаунт…" : "Создать аккаунт"}
        </Button>
      </form>
      {googleEnabled && <GoogleButton callbackURL="/onboarding" />}
    </>
  );
}
