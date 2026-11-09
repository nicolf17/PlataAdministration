"use client";

import type { ComponentPropsWithoutRef } from "react";

import { formatAmountInput } from "@/lib/money";

type Props = Omit<
  ComponentPropsWithoutRef<"input">,
  "type" | "inputMode" | "onChange"
>;

export function AmountInput({ defaultValue, ...props }: Props) {
  const initial =
    defaultValue === undefined ||
    defaultValue === null ||
    defaultValue === ""
      ? undefined
      : formatAmountInput(String(defaultValue));

  return (
    <input
      {...props}
      type="text"
      inputMode="numeric"
      autoComplete="off"
      defaultValue={initial}
      onChange={(event) => {
        // No usamos estado: escribimos el valor formateado directamente en el DOM.
        // Así `form.reset()` limpia el campo sin pelear con React.
        event.currentTarget.value = formatAmountInput(
          event.currentTarget.value,
        );
      }}
    />
  );
}
