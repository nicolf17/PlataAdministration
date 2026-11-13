"use client";

import { useActionState, useRef, useState } from "react";

import type { ActionState } from "@/app/actions";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { IconTrash } from "@/components/icons";

type DeleteAction = (
  state: ActionState,
  formData: FormData,
) => Promise<ActionState>;

export function ConfirmDeleteButton({
  action,
  id,
  label,
  description = "Esta acción no se puede deshacer. Los movimientos que ya cargaste se conservan.",
}: {
  action: DeleteAction;
  id: string;
  label: string;
  /** Texto del diálogo: explica qué pasa si se confirma. */
  description?: string;
}) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    action,
    null,
  );
  const [open, setOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <>
      <div className="flex flex-col items-end gap-1">
        <form ref={formRef} action={formAction}>
          <input type="hidden" name="id" value={id} />
          <button
            type="button"
            onClick={() => setOpen(true)}
            disabled={pending}
            aria-label={`Eliminar ${label}`}
            title={`Eliminar ${label}`}
            className="grid size-9 place-items-center rounded-lg border border-danger/30 bg-danger/10 text-danger transition-colors hover:bg-danger/20 disabled:opacity-50"
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

      <ConfirmDialog
        open={open}
        title={`¿Eliminar "${label}"?`}
        description={description}
        pending={pending}
        onCancel={() => setOpen(false)}
        onConfirm={() => {
          setOpen(false);
          // La confirmación ya pasó: disparamos el submit del form que tiene
          // la server action. requestSubmit() respeta el action de React.
          formRef.current?.requestSubmit();
        }}
      />
    </>
  );
}
