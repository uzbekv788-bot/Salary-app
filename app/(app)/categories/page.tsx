import { Suspense } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { PageSkeleton } from "@/components/layout/page-skeleton";
import { CategoryManager } from "@/components/categories/category-manager";
import { listCategories } from "@/lib/queries/finance";
import { requireUser } from "@/lib/session";

export const metadata = { title: "Категории" };

export default function CategoriesPage() {
  return (
    <>
      <PageHeader title="Категории" />
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
