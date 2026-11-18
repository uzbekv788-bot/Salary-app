import { Suspense } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { PageSkeleton } from "@/components/layout/page-skeleton";
import { CategoryManager } from "@/components/categories/category-manager";
import { listCategories } from "@/lib/queries/finance";
import { requireUser } from "@/lib/session";
import { getI18n } from "@/lib/i18n/server";

export async function generateMetadata() {
  const { t } = await getI18n();
  return { title: t("cat.title") };
}

export default async function CategoriesPage() {
  const { t } = await getI18n();
  return (
    <>
      <PageHeader title={t("cat.title")} />
      <Suspense fallback={<PageSkeleton />}>
        <Content />
      </Suspense>
    </>
  );
}

async function Content() {
  const user = await requireUser();
  return <CategoryManager categories={await listCategories(user.id, { includeArchived: true })} />;
}
