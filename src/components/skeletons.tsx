// Bloques de carga con la forma del contenido real.
// Se usan en los loading.tsx de cada segmento: la pantalla muestra la
// estructura antes de que lleguen los datos, así no se siente "congelada".

export function Skeleton({ className = "" }: { className?: string }) {
  return <div aria-hidden className={`animate-pulse rounded-md bg-surface-2 ${className}`} />;
}

export function HeaderSkeleton() {
  return (
    <div className="mb-4 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-end sm:justify-between">
      <div className="space-y-2">
        <Skeleton className="h-7 w-40" />
        <Skeleton className="h-3 w-56" />
      </div>
      <div className="flex w-full gap-2 sm:w-auto">
        <Skeleton className="h-10 flex-1 sm:w-40" />
        <Skeleton className="h-10 w-10 shrink-0 sm:hidden" />
      </div>
    </div>
  );
}

export function StatCardsSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="card p-3 sm:p-4">
          <Skeleton className="h-2.5 w-16" />
          <Skeleton className="mt-2 h-5 w-24" />
        </div>
      ))}
    </div>
  );
}

export function FormSkeleton({ rows = 2 }: { rows?: number }) {
  return (
    <div className="card p-4 sm:p-5">
      <div className="mb-4 flex items-center justify-between">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-2.5 w-20" />
      </div>
      <Skeleton className="h-10 w-full" />
      <div className="mt-4 grid grid-cols-2 gap-3">
        {Array.from({ length: rows * 2 }).map((_, index) => (
          <div key={index} className="space-y-2">
            <Skeleton className="h-2.5 w-16" />
            <Skeleton className="h-10 w-full" />
          </div>
        ))}
      </div>
      <Skeleton className="mt-4 h-10 w-full" />
    </div>
  );
}

export function ListSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="card p-4">
      <div className="mb-3 flex items-center justify-between">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-2.5 w-14" />
      </div>
      <div className="divide-y divide-line/70">
        {Array.from({ length: rows }).map((_, index) => (
          <div key={index} className="flex items-center gap-3 py-2.5">
            <Skeleton className="size-8 shrink-0 rounded-full" />
            <div className="min-w-0 flex-1 space-y-1.5">
              <Skeleton className="h-3 w-2/5" />
              <Skeleton className="h-2.5 w-1/3" />
            </div>
            <Skeleton className="h-3.5 w-20" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function CardGridSkeleton({ count = 6, columns = 3 }: { count?: number; columns?: number }) {
  const cols =
    columns === 2 ? "sm:grid-cols-2" : columns === 4 ? "sm:grid-cols-2 lg:grid-cols-4" : "sm:grid-cols-2 lg:grid-cols-3";
  return (
    <div className={`grid gap-3 ${cols}`}>
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="card space-y-2 p-4">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-2.5 w-20" />
        </div>
      ))}
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div role="status" aria-live="polite">
      <span className="sr-only">Cargando…</span>
      <HeaderSkeleton />
      <StatCardsSkeleton count={4} />
      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        <ListSkeleton rows={5} />
        <CardGridSkeleton count={4} columns={2} />
      </div>
    </div>
  );
}

export function MovementsSkeleton() {
  return (
    <div role="status" aria-live="polite">
      <span className="sr-only">Cargando movimientos…</span>
      <HeaderSkeleton />
      <FormSkeleton />
      <div className="mt-4">
        <StatCardsSkeleton count={3} />
      </div>
      <div className="mt-4">
        <ListSkeleton rows={7} />
      </div>
    </div>
  );
}

export function CardsPageSkeleton() {
  return (
    <div role="status" aria-live="polite">
      <span className="sr-only">Cargando…</span>
      <HeaderSkeleton />
      <CardGridSkeleton count={6} />
    </div>
  );
}

export function SettingsPageSkeleton() {
  return (
    <div role="status" aria-live="polite">
      <span className="sr-only">Cargando…</span>
      <HeaderSkeleton />
      <FormSkeleton rows={1} />
      <div className="mt-4">
        <ListSkeleton rows={6} />
      </div>
    </div>
  );
}
