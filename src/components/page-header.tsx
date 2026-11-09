import type { ReactNode } from "react";

export function PageHeader({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children?: ReactNode;
}) {
  return (
    <div className="mb-4 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-[22px] font-semibold tracking-tight sm:text-2xl md:text-[28px]">
          {title}
        </h1>
        {description ? (
          <p className="mt-0.5 text-[13px] leading-snug text-muted sm:mt-1 sm:text-sm">
            {description}
          </p>
        ) : null}
      </div>
      {children ? (
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
          {children}
        </div>
      ) : null}
    </div>
  );
}
