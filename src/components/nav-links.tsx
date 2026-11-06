"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import {
  IconDashboard,
  IconTarget,
  IconTransactions,
  IconWallet,
} from "@/components/icons";

const ITEMS = [
  { href: "/", label: "Panel", Icon: IconDashboard },
  { href: "/movimientos", label: "Movimientos", Icon: IconTransactions },
  { href: "/presupuestos", label: "Presupuestos", Icon: IconTarget },
  { href: "/cuentas", label: "Cuentas", Icon: IconWallet },
];

export function NavLinks({ variant = "sidebar" }: { variant?: "sidebar" | "mobile" }) {
  const pathname = usePathname();

  return (
    <nav
      className={
        variant === "sidebar"
          ? "flex flex-col gap-1"
          : "grid grid-cols-4 gap-1 px-2"
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
              "flex items-center gap-3 rounded-xl text-sm transition-colors",
              variant === "sidebar" ? "px-3 py-2.5" : "flex-col gap-1 px-1 py-2 text-[10px]",
              active
                ? "bg-accent-soft text-accent"
                : "text-muted hover:bg-surface-2 hover:text-foreground",
            ].join(" ")}
          >
            <Icon className={variant === "sidebar" ? "size-4.5" : "size-5"} />
            <span className={variant === "sidebar" ? "font-medium" : "font-medium"}>
              {label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
