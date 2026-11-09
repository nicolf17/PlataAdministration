"use client";

import { useActionState } from "react";

import type { ActionState } from "@/app/actions";
import { IconTrash } from "@/components/icons";

type DeleteAction = (
  state: ActionState,
  formData: FormData,
) => Promise<ActionState>;

export function ConfirmDeleteButton({
  action,
  id,
  label,
}: {
  action: DeleteAction;
  id: string;
  label: string;
}) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    action,
    null,
  );

  return (
    <div className="flex flex-col items-end gap-1">
      <form
        action={formAction}
        onSubmit={(event) => {
          if (!window.confirm(`¿Eliminar "${label}"?`)) {
            event.preventDefault();
          }
        }}
      >
        <input type="hidden" name="id" value={id} />
        <button
          type="submit"
          disabled={pending}
          aria-label={`Eliminar ${label}`}
          className="grid size-9 place-items-center rounded-lg text-muted transition-colors hover:bg-danger/10 hover:text-danger disabled:opacity-50"
        >
          <IconTrash className="size-4" />
        </button>
      </form>

      {state && !state.ok ? (
        <p className="max-w-44 text-right text-[10px] leading-tight text-danger">
          {state.message}
        </p>
      ) : null}
    </div>
  );
}
