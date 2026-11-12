import Link from "next/link";

import { getSessionUser } from "@/lib/auth";
import { IconInfo } from "@/components/icons";
import { NavLinks } from "@/components/nav-links";
import { NewMovementButton } from "@/components/new-movement-button";
import { UserMenu } from "@/components/user-menu";

export async function Shell({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();

  // Sin sesión las únicas pantallas son /login y /signup: no tiene sentido
  // mostrar navegación ni un botón para cerrar una sesión que no existe.
  if (!user) {
    return (
      <main className="auth-bg relative flex min-h-dvh w-full flex-col overflow-hidden">
        {/* Fondo animado: orbes que flotan y una grilla en perspectiva. Puro CSS,
            sin blur sobre el contenido ni imágenes que cargar. */}
        <div aria-hidden className="auth-orb auth-orb-a" />
        <div aria-hidden className="auth-grid" />

        {/* Partículas luminosas: luces que brotan desde abajo hacia arriba. */}
        <div aria-hidden className="auth-particles">
          <span className="auth-particle" style={{ left: "12%", animationDelay: "0s" }} />
          <span className="auth-particle" style={{ left: "26%", animationDelay: "0.9s" }} />
          <span className="auth-particle" style={{ left: "40%", animationDelay: "1.7s" }} />
          <span className="auth-particle" style={{ left: "54%", animationDelay: "0.4s" }} />
          <span className="auth-particle" style={{ left: "68%", animationDelay: "2.1s" }} />
          <span className="auth-particle" style={{ left: "80%", animationDelay: "0.7s" }} />
          <span className="auth-particle" style={{ left: "88%", animationDelay: "1.5s" }} />
          <span className="auth-particle" style={{ left: "95%", animationDelay: "2.4s" }} />
        </div>

        <div className="relative z-10 mx-auto flex w-full max-w-6xl flex-1 flex-col px-3 pt-3 sm:px-4 sm:pt-5 md:px-8 md:pt-10">
          <div className="flex-1">{children}</div>
          <p className="pb-5 pt-8 text-center text-[11px] tracking-wide text-muted/70">
            by Nicolás López Forero
          </p>
        </div>
      </main>
    );
  }

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
          <Link
            href="/guia"
            className="mb-3 flex items-center gap-2 rounded-lg px-1 py-1 text-[12px] font-medium text-muted transition-colors hover:text-foreground"
          >
            <IconInfo className="size-4" />
            Guía de uso
          </Link>
          <div className="mb-2">
            <p className="truncate text-[12px] font-semibold">{user.name}</p>
            <p className="truncate text-[11px] text-muted">{user.email}</p>
          </div>
          <p className="mb-3 text-[11px] leading-relaxed text-muted">
            Tus datos en un servidor privado propio, en SQLite.
          </p>
          <UserMenu variant="full" />
        </div>

        <p className="mt-3 px-1 text-[11px] tracking-wide text-muted/70">
          by Nicolás López Forero
        </p>
      </aside>

      {/* Mismo color que el fondo de la app y la barra de estado: sin
          transparencia ni blur, así en la PWA instalada no queda una banda
          lavada arriba. */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-line bg-[#070b10] px-3 pb-2.5 pt-[calc(env(safe-area-inset-top)+0.625rem)] md:hidden">
        <Link href="/" className="flex items-center gap-2">
          <span className="grid size-7 place-items-center rounded-lg bg-accent text-xs font-black text-[#04231b]">
            P
          </span>
          <span className="text-[15px] font-semibold tracking-tight">plata.</span>
        </Link>

        <div className="flex items-center gap-2">
          <Link
            href="/guia"
            aria-label="Guía de uso"
            title="Guía de uso"
            className="grid size-9 place-items-center rounded-md border border-[#243447] bg-[#0d141d] text-foreground/75 transition-colors hover:border-[#2f4358] hover:bg-surface-2 hover:text-foreground"
          >
            <IconInfo className="size-4" />
          </Link>
          <NewMovementButton />
          <UserMenu name={user.name} />
        </div>
      </header>

      <main className="flex-1 pb-28 md:pb-12">
        <div className="mx-auto w-full max-w-6xl px-3 pt-3 sm:px-4 sm:pt-5 md:px-8 md:pt-10">
          {children}
          <p className="pb-1 pt-10 text-[11px] tracking-wide text-muted/70 md:hidden">
            by Nicolás López Forero
          </p>
        </div>
      </main>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-[#070b10] pb-[max(0.25rem,env(safe-area-inset-bottom))] md:hidden">
        <NavLinks variant="mobile" />
      </div>
    </div>
  );
}
