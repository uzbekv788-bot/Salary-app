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
import { formatMoney } from "@/lib/money";
import type { WalletDTO } from "@/lib/queries/finance";

const FIELDS: { key: keyof ImportMapping; label: string; required?: boolean }[] = [
  { key: "date", label: "Дата", required: true },
  { key: "amount", label: "Сумма", required: true },
  { key: "type", label: "Тип (доход/расход)" },
  { key: "category", label: "Категория" },
  { key: "note", label: "Комментарий" },
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
        if (!headers.length || !res.data.length) return toast.error("Файл пустой или это не CSV");
        setFile({ name: f.name, headers, rows: res.data.slice(0, 5000) });
        setMapping(guessMapping(headers));
        setOpen(true);
      },
      error: () => toast.error("Не удалось прочитать файл"),
    });
  };

  const ready = Boolean(mapping.date && mapping.amount);
  const mapped = file && ready ? file.rows.map((r) => mapRow(r, mapping as ImportMapping)) : [];
  const good = mapped.flatMap((m) => (m.ok ? [m.row] : []));
  const bad = mapped.filter((m) => !m.ok) as { ok: false; error: string }[];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Данные</CardTitle>
      </CardHeader>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="bg-foreground/4 grid gap-2 rounded-md p-4">
          <p className="font-semibold">Скачать операции</p>
          <p className="text-muted-foreground text-sm">
            CSV-файл открывается в Excel и Google Таблицах.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="secondary" size="sm">
              <a href={`/api/export?from=${year}-01-01&to=${year}-12-31`} download>
                <Download /> За {year}
              </a>
            </Button>
            <Button asChild variant="secondary" size="sm">
              <a href="/api/export" download>
                <Download /> За всё время
              </a>
            </Button>
          </div>
        </div>
        <div className="bg-foreground/4 grid gap-2 rounded-md p-4">
          <p className="font-semibold">Загрузить из файла</p>
          <p className="text-muted-foreground text-sm">
            Выписка банка или файл, скачанный из Salary.
          </p>
          <input
            ref={inputRef}
            type="file"
            accept=".csv,text/csv"
            className="sr-only"
            aria-label="CSV-файл"
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
            <FileUp /> Выбрать CSV
          </Button>
        </div>
      </div>

      <ResponsiveSheet
        open={open}
        onOpenChange={setOpen}
        title="Импорт операций"
        description={file ? `${file.name} · строк: ${file.rows.length}` : undefined}
      >
        {file && (
          <div className="grid gap-4">
            <fieldset className="grid grid-cols-2 gap-3">
              <legend className="text-muted-foreground mb-2 text-[13px] font-medium">
                Какая колонка за что отвечает
              </legend>
              {FIELDS.map((f) => (
                <div key={f.key} className="grid gap-1">
                  <Label htmlFor={`m-${f.key}`}>
                    {f.label}
                    {f.required && " *"}
                  </Label>
                  <NativeSelect
                    id={`m-${f.key}`}
                    value={mapping[f.key] ?? ""}
                    onChange={(e) =>
                      setMapping((m) => ({ ...m, [f.key]: e.target.value || undefined }))
                    }
                  >
                    <option value="">{f.required ? "Выберите" : "—"}</option>
                    {file.headers.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </NativeSelect>
                </div>
              ))}
              <div className="grid gap-1">
                <Label htmlFor="m-wallet">На счёт</Label>
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
                        <th className="p-2 font-medium">Дата</th>
                        <th className="p-2 font-medium">Категория</th>
                        <th className="p-2 text-right font-medium">Сумма</th>
                      </tr>
                    </thead>
                    <tbody>
                      {good.slice(0, 20).map((r, i) => (
                        <tr key={i} className="border-foreground/6 border-t">
                          <td className="p-2 whitespace-nowrap">{r.date}</td>
                          <td className="max-w-40 truncate p-2">
                            {r.category ?? <span className="text-muted-foreground">Прочее</span>}
                            {r.note && <span className="text-muted-foreground"> · {r.note}</span>}
                          </td>
                          <td className="p-2 text-right whitespace-nowrap">
                            {formatMoney(r.type === "INCOME" ? r.amount : -r.amount, currency, {
                              signed: true,
                            })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="text-sm">
                  Готово к импорту: <b>{good.length}</b>
                  {bad.length > 0 && (
                    <span className="text-warning ml-2 inline-flex items-center gap-1">
                      <TriangleAlert className="size-4" aria-hidden /> пропустим {bad.length}{" "}
                      (например: {bad[0].error})
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
                    toast.error(r.fieldErrors ? Object.values(r.fieldErrors)[0] : r.error);
                    return;
                  }
                  toast.success(
                    `Импортировано операций: ${r.data.imported}${r.data.createdCategories ? `, новых категорий: ${r.data.createdCategories}` : ""}`,
                  );
                  setOpen(false);
                  setFile(null);
                })
              }
            >
              {pending ? "Импортируем…" : `Импортировать ${good.length}`}
            </Button>
          </div>
        )}
      </ResponsiveSheet>
    </Card>
  );
}
