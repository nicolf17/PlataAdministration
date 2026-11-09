"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { IconPlus } from "@/components/icons";

export function NewMovementButton() {
  const pathname = usePathname();

  // En Movimientos el formulario ya está en pantalla: el atajo sobra.
  if (pathname.startsWith("/movimientos")) return null;

  return (
    <Link
      href="/movimientos#nuevo"
      className="inline-flex items-center gap-1 rounded-full bg-accent px-3 py-1.5 text-[11px] font-bold text-[#04231b]"
    >
      <IconPlus className="size-3.5" />
      Nuevo
    </Link>
  );
}
