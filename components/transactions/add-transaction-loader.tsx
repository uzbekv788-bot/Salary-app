import { AddTransactionSheet } from "@/components/transactions/add-transaction-sheet";
import { listCategories, listWallets } from "@/lib/queries/finance";
import { todayIn } from "@/lib/period";
import { requireUser } from "@/lib/session";

/** Загружает справочники для глобальной формы операции. Внутри <Suspense>. */
export async function AddTransactionLoader() {
  const user = await requireUser();
  const [categories, wallets] = await Promise.all([listCategories(user.id), listWallets(user.id)]);
  return (
    <AddTransactionSheet
      categories={categories}
      wallets={wallets}
      today={todayIn(user.timezone)}
      currency={user.currency}
    />
  );
}
