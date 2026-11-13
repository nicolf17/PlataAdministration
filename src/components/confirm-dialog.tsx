"use client";

import { useEffect, useId, useRef } from "react";

import { IconTrash } from "@/components/icons";

/**
 * Diálogo de confirmación con la estética de la app.
 *
 * Usa el elemento nativo `<dialog>` con `showModal()`: el navegador se encarga
 * del foco, del fondo bloqueado, de `Esc` y de apilarlo por encima de todo sin
 * pelear con z-index. Reemplaza el `window.confirm()` del sistema, que rompía
 * el look oscuro y no se podía estilar.
 *
 * El botón de cancelar va primero y recibe el foco: en una acción destructiva
 * el Enter nunca debería confirmar por accidente.
 */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Eliminar",
  cancelLabel = "Cancelar",
  pending = false,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  pending?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open) {
      if (!dialog.open) dialog.showModal();
    } else if (dialog.open) {
      dialog.close();
    }
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      // Esc cierra el diálogo sin confirmar: es la salida segura.
      onCancel={(event) => {
        event.preventDefault();
        if (!pending) onCancel();
      }}
      // Un clic en el fondo (fuera del panel) también cancela.
      onClick={(event) => {
        if (event.target === dialogRef.current && !pending) onCancel();
      }}
      className="m-auto w-[calc(100vw-2rem)] max-w-sm rounded-2xl border border-line bg-surface p-0 text-foreground shadow-[0_28px_70px_-16px_rgba(0,0,0,0.9)] backdrop:bg-black/70 open:animate-dialog-in"
    >
      <div className="flex items-start gap-3 p-5 pb-0">
        <span className="grid size-9 shrink-0 place-items-center rounded-xl border border-danger/30 bg-danger/10 text-danger">
          <IconTrash className="size-4" />
        </span>
        <div className="min-w-0">
          <h2 id={titleId} className="text-[15px] font-semibold leading-snug">
            {title}
          </h2>
          <p
            id={descriptionId}
            className="mt-1.5 text-[12.5px] leading-relaxed text-muted"
          >
            {description}
          </p>
        </div>
      </div>

      <div className="flex gap-2 p-5 pt-4">
        <button
          type="button"
          onClick={onCancel}
          disabled={pending}
          autoFocus
          className="btn btn-ghost flex-1"
        >
          {cancelLabel}
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={pending}
          className="btn flex-1 border-danger/40 bg-danger/15 text-danger hover:border-danger/60 hover:bg-danger/25"
        >
          {pending ? "Eliminando…" : confirmLabel}
        </button>
      </div>
    </dialog>
  );
}

export default ConfirmDialog;
