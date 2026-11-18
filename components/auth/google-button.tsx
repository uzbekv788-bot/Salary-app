"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";
import { useI18n } from "@/components/i18n/locale-provider";

export function GoogleButton({ callbackURL }: { callbackURL: string }) {
  const [pending, setPending] = useState(false);
  const { t, href } = useI18n();
  return (
    <>
      <div className="text-muted-foreground my-5 flex items-center gap-3 text-[13px]">
        <span className="bg-foreground/10 h-px flex-1" /> {t("auth.or")}{" "}
        <span className="bg-foreground/10 h-px flex-1" />
      </div>
      <Button
        type="button"
        variant="secondary"
        className="w-full"
        disabled={pending}
        onClick={async () => {
          setPending(true);
          await authClient.signIn.social({ provider: "google", callbackURL: href(callbackURL) });
        }}
      >
        <svg viewBox="0 0 24 24" aria-hidden className="size-5">
          <path
            fill="#4285F4"
            d="M22.6 12.2c0-.8-.1-1.5-.2-2.2H12v4.2h6a5.1 5.1 0 0 1-2.2 3.4v2.8h3.6c2-1.9 3.2-4.7 3.2-8.2Z"
          />
          <path
            fill="#34A853"
            d="M12 23c3 0 5.5-1 7.4-2.7l-3.6-2.8c-1 .7-2.3 1.1-3.8 1.1-2.9 0-5.4-2-6.3-4.6H2v2.9A11 11 0 0 0 12 23Z"
          />
          <path
            fill="#FBBC05"
            d="M5.7 14c-.2-.7-.4-1.4-.4-2s.2-1.4.4-2V7.1H2A11 11 0 0 0 2 17l3.7-3Z"
          />
          <path
            fill="#EA4335"
            d="M12 5.4c1.6 0 3.1.6 4.2 1.7l3.2-3.2A11 11 0 0 0 2 7.1L5.7 10C6.6 7.4 9 5.4 12 5.4Z"
          />
        </svg>
        {t("auth.google")}
      </Button>
    </>
  );
}
