"use client";

import { useActionState } from "react";

import { logout } from "@/app/actions";
import type { ActionState } from "@/app/actions";

export function UserMenu({ name }: { name: string }) {
  const [, formAction, pending] = useActionState<ActionState, FormData>(logout, null);

  return (
    <div className="flex items-center gap-2">
      <span className="hidden max-w-[140px] truncate text-[12px] font-medium text-muted sm:block">
        {name}
      </span>
      <form action={formAction}>
        <button
          type="submit"
          disabled={pending}
          className="grid size-9 min-w-9 place-items-center rounded-md border border-[#243447] bg-[#0d141d] text-foreground/75 transition-colors hover:border-[#2f4358] hover:bg-surface-2 hover:text-foreground active:bg-surface-2 disabled:opacity-60"
          aria-label="Cerrar sesión"
          title="Cerrar sesión"
        >
          <svg
            className="size-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" x2="9" y1="12" y2="12" />
          </svg>
        </button>
      </form>
    </div>
  );
}
