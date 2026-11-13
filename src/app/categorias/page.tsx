import { connection } from "next/server";

import { deleteCategory } from "@/app/actions";
import { CategoryForm } from "@/components/category-form";
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
import { PageHeader } from "@/components/page-header";
import { getCategoriesPageData } from "@/lib/queries";

export const instant = false;

export default async function CategoriesPage() {
  await connection();
  const categories = await getCategoriesPageData();

  const expenses = categories.filter((c) => c.type === "EXPENSE");
  const incomes = categories.filter((c) => c.type === "INCOME");

  return (
    <>
      <PageHeader
        title="Categorías"
        description="Solo las que usás. Podés crear y eliminar cuando quieras."
      />

      <CategoryForm />

      <div className="mt-4 space-y-4">
        <CategorySection
          title="Gastos"
          items={expenses}
          empty="Todavía no hay categorías de gasto."
        />
        <CategorySection
          title="Ingresos"
          items={incomes}
          empty="Todavía no hay categorías de ingreso."
        />
      </div>

      <p className="mt-4 px-1 text-[11px] leading-relaxed text-muted">
        Si eliminás una categoría, sus movimientos no se borran: quedan como
        &quot;sin categoría&quot; y podés reasignarlos más adelante.
      </p>
    </>
  );
}

type CategoryItem = Awaited<
  ReturnType<typeof getCategoriesPageData>
>[number];

function CategorySection({
  title,
  items,
  empty,
}: {
  title: string;
  items: CategoryItem[];
  empty: string;
}) {
  return (
    <section className="card overflow-hidden">
      <div className="flex items-center justify-between border-b border-line/70 px-4 py-3">
        <h2 className="text-sm font-semibold">{title}</h2>
        <span className="text-[11px] text-muted">
          {items.length} {items.length === 1 ? "categoría" : "categorías"}
        </span>
      </div>

      {items.length === 0 ? (
        <p className="px-4 py-6 text-center text-[12px] text-muted">{empty}</p>
      ) : (
        <ul className="divide-y divide-line/60">
          {items.map((category) => (
            <li
              key={category.id}
              className="flex items-center gap-3 px-4 py-2.5"
            >
              <span
                className="size-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: category.color }}
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-medium">
                  {category.name}
                </p>
                <p className="text-[10px] text-muted">
                  {category._count.transactions}{" "}
                  {category._count.transactions === 1
                    ? "movimiento"
                    : "movimientos"}
                </p>
              </div>
              <ConfirmDeleteButton
                action={deleteCategory}
                id={category.id}
                label={category.name}
                description="Los movimientos no se borran: quedan como «sin categoría» y podés reasignarlos cuando quieras."
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
