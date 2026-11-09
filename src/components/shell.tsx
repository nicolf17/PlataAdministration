import Link from "next/link";

import { NavLinks } from "@/components/nav-links";
import { NewMovementButton } from "@/components/new-movement-button";

export function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh md:flex">
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-line/80 px-4 py-6 md:flex">
        <Link href="/" className="mb-8 flex items-center gap-2 px-2">
          <span className="grid size-8 place-items-center rounded-xl bg-accent text-sm font-black text-[#04231b]">
            P
          </span>
          <span className="text-lg font-semibold tracking-tight">plata.</span>
        </Link>

        <NavLinks />

        <div className="mt-auto rounded-xl border border-line bg-surface/60 p-3">
          <p className="text-[11px] leading-relaxed text-muted">
            Datos locales en SQLite. Nada sale de tu máquina.
          </p>
        </div>
      </aside>

      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-line/70 bg-[#080d13]/90 px-3 py-2.5 backdrop-blur md:hidden">
        <Link href="/" className="flex items-center gap-2">
          <span className="grid size-7 place-items-center rounded-lg bg-accent text-xs font-black text-[#04231b]">
            P
          </span>
          <span className="text-[15px] font-semibold tracking-tight">
            plata.
          </span>
        </Link>

        <NewMovementButton />
      </header>

      <main className="flex-1 pb-28 md:pb-12">
        <div className="mx-auto w-full max-w-6xl px-3 pt-3 sm:px-4 sm:pt-5 md:px-8 md:pt-10">
          {children}
        </div>
      </main>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-[#080d13]/95 pb-[max(0.25rem,env(safe-area-inset-bottom))] backdrop-blur md:hidden">
        <NavLinks variant="mobile" />
      </div>
    </div>
  );
}
