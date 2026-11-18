"use client";

import { useRef, useState, useTransition } from "react";
import Papa from "papaparse";
import { toast } from "sonner";
import { Download, FileUp, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { ResponsiveSheet } from "@/components/ui/responsive-sheet";
import { importTransactions } from "@/lib/actions/account";
import { guessMapping, mapRow, type ImportMapping } from "@/lib/csv";
import type { WalletDTO } from "@/lib/queries/finance";
import { useI18n } from "@/components/i18n/locale-provider";
import type { TKey } from "@/lib/i18n/core";

const FIELDS: { key: keyof ImportMapping; label: TKey; required?: boolean }[] = [
  { key: "date", label: "common.date", required: true },
  { key: "amount", label: "common.amount", required: true },
  { key: "type", label: "settings.typeColumn" },
  { key: "category", label: "common.category" },
  { key: "note", label: "common.note" },
];

/** Экспорт и импорт CSV (tasks.md 12.2–12.3). */
export function DataSection({
  wallets,
  currency,
  year,
}: {
  wallets: WalletDTO[];
  currency: string;
  year: string;
}) {
  const { t, fmt } = useI18n();
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<{
    name: string;
    headers: string[];
    rows: Record<string, string>[];
  } | null>(null);
  const [mapping, setMapping] = useState<Partial<ImportMapping>>({});
  const [walletId, setWalletId] = useState(wallets.find((w) => !w.archived)?.id ?? "");
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  const onFile = (f: File) => {
    Papa.parse<Record<string, string>>(f, {
      header: true,
      skipEmptyLines: "greedy",
      complete: (res) => {
        const headers = (res.meta.fields ?? []).filter(Boolean);
        if (!headers.length || !res.data.length) return toast.error(t("settings.emptyFile"));
        setFile({ name: f.name, headers, rows: res.data.slice(0, 5000) });
        setMapping(guessMapping(headers));
        setOpen(true);
      },
      error: () => toast.error(t("settings.readFailed")),
    });
  };

  const ready = Boolean(mapping.date && mapping.amount);
  const mapped = file && ready ? file.rows.map((r) => mapRow(r, mapping as ImportMapping)) : [];
  const good = mapped.flatMap((m) => (m.ok ? [m.row] : []));
  const bad = mapped.filter((m) => !m.ok) as { ok: false; error: string; value: string }[];

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("settings.data")}</CardTitle>
      </CardHeader>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="bg-foreground/4 grid gap-2 rounded-md p-4">
          <p className="font-semibold">{t("settings.download")}</p>
          <p className="text-muted-foreground text-sm">{t("settings.downloadHint")}</p>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="secondary" size="sm">
              <a href={`/api/export?from=${year}-01-01&to=${year}-12-31`} download>
                <Download /> {t("settings.forYear", { year })}
              </a>
            </Button>
            <Button asChild variant="secondary" size="sm">
              <a href="/api/export" download>
                <Download /> {t("settings.allTime")}
              </a>
            </Button>
          </div>
        </div>
        <div className="bg-foreground/4 grid gap-2 rounded-md p-4">
          <p className="font-semibold">{t("settings.upload")}</p>
          <p className="text-muted-foreground text-sm">{t("settings.uploadHint")}</p>
          <input
            ref={inputRef}
            type="file"
            accept=".csv,text/csv"
            className="sr-only"
            aria-label={t("settings.csvFile")}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onFile(f);
              e.target.value = "";
            }}
          />
          <Button
            variant="secondary"
            size="sm"
            className="justify-self-start"
            onClick={() => inputRef.current?.click()}
          >
            <FileUp /> {t("settings.pickCsv")}
          </Button>
        </div>
      </div>

      <ResponsiveSheet
        open={open}
        onOpenChange={setOpen}
        title={t("settings.importTitle")}
        description={
          file ? t("settings.importFileInfo", { name: file.name, n: file.rows.length }) : undefined
        }
      >
        {file && (
          <div className="grid gap-4">
            <fieldset className="grid grid-cols-2 gap-3">
              <legend className="text-muted-foreground mb-2 text-[13px] font-medium">
                {t("settings.mapping")}
              </legend>
              {FIELDS.map((f) => (
                <div key={f.key} className="grid gap-1">
                  <Label htmlFor={`m-${f.key}`}>
                    {t(f.label)}
                    {f.required && " *"}
                  </Label>
                  <NativeSelect
                    id={`m-${f.key}`}
                    value={mapping[f.key] ?? ""}
                    onChange={(e) =>
                      setMapping((m) => ({ ...m, [f.key]: e.target.value || undefined }))
                    }
                  >
                    <option value="">{f.required ? t("settings.choose") : "—"}</option>
                    {file.headers.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </NativeSelect>
                </div>
              ))}
              <div className="grid gap-1">
                <Label htmlFor="m-wallet">{t("settings.toWallet")}</Label>
                <NativeSelect
                  id="m-wallet"
                  value={walletId}
                  onChange={(e) => setWalletId(e.target.value)}
                >
                  {wallets
                    .filter((w) => !w.archived)
                    .map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name}
                      </option>
                    ))}
                </NativeSelect>
              </div>
            </fieldset>

            {ready && (
              <>
                <div className="border-foreground/8 max-h-56 overflow-auto rounded-sm border">
                  <table className="num w-full text-left text-[13px]">
                    <thead className="bg-glass-strong text-muted-foreground sticky top-0 backdrop-blur">
                      <tr>
                        <th className="p-2 font-medium">{t("common.date")}</th>
                        <th className="p-2 font-medium">{t("common.category")}</th>
                        <th className="p-2 text-right font-medium">{t("common.amount")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {good.slice(0, 20).map((r, i) => (
                        <tr key={i} className="border-foreground/6 border-t">
                          <td className="p-2 whitespace-nowrap">{r.date}</td>
                          <td className="max-w-40 truncate p-2">
                            {r.category ?? (
                              <span className="text-muted-foreground">{t("settings.other")}</span>
                            )}
                            {r.note && <span className="text-muted-foreground"> · {r.note}</span>}
                          </td>
                          <td className="p-2 text-right whitespace-nowrap">
                            {fmt.money(r.type === "INCOME" ? r.amount : -r.amount, currency, {
                              signed: true,
                            })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="text-sm">
                  {t("settings.ready")} <b>{good.length}</b>
                  {bad.length > 0 && (
                    <span className="text-warning ml-2 inline-flex items-center gap-1">
                      <TriangleAlert className="size-4" aria-hidden />{" "}
                      {t("settings.skip", {
                        n: bad.length,
                        example: t.dyn(bad[0].error, { value: bad[0].value }),
                      })}
                    </span>
                  )}
                </p>
              </>
            )}

            <Button
              disabled={pending || !ready || good.length === 0 || !walletId}
              onClick={() =>
                startTransition(async () => {
                  const r = await importTransactions({ walletId, rows: good });
                  if (!r.ok) {
                    toast.error(t.dyn(r.fieldErrors ? Object.values(r.fieldErrors)[0] : r.error));
                    return;
                  }
                  toast.success(
                    r.data.createdCategories
                      ? t("settings.importedWithCats", {
                          n: r.data.imported,
                          c: r.data.createdCategories,
                        })
                      : t("settings.imported", { n: r.data.imported }),
                  );
                  setOpen(false);
                  setFile(null);
                })
              }
            >
              {pending ? t("settings.importing") : t("settings.importN", { n: good.length })}
            </Button>
          </div>
        )}
      </ResponsiveSheet>
    </Card>
  );
}
