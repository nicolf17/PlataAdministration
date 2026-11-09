"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  IconDashboard,
  IconTag,
  IconTarget,
  IconTransactions,
  IconWallet,
} from "@/components/icons";

const ITEMS = [
  { href: "/", label: "Panel", Icon: IconDashboard },
  { href: "/movimientos", label: "Movimientos", Icon: IconTransactions },
  { href: "/presupuestos", label: "Presupuesto", Icon: IconTarget },
  { href: "/cuentas", label: "Métodos", Icon: IconWallet },
  { href: "/categorias", label: "Categorías", Icon: IconTag },
];

export function NavLinks({
  variant = "sidebar",
}: {
  variant?: "sidebar" | "mobile";
}) {
  const pathname = usePathname();

  return (
    <nav
      className={
        variant === "sidebar"
          ? "flex flex-col gap-1"
          : "grid grid-cols-5 gap-0.5 px-1"
      }
    >
      {ITEMS.map(({ href, label, Icon }) => {
        const active =
          href === "/" ? pathname === "/" : pathname.startsWith(href);

        return (
          <Link
            key={href}
            href={href}
            className={[
              "flex items-center rounded-xl transition-colors",
              variant === "sidebar"
                ? "gap-3 px-3 py-2.5 text-sm"
                : "flex-col gap-0.5 px-0.5 py-2 text-[10px]",
              active
                ? "bg-accent-soft text-accent"
                : "text-muted hover:bg-surface-2 hover:text-foreground",
            ].join(" ")}
          >
            <Icon className={variant === "sidebar" ? "size-4.5" : "size-5"} />
            <span className="truncate font-medium">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
