export function LoadingScreen() {
  return (
    <div
      className="flex min-h-[50vh] w-full items-center justify-center"
      role="status"
      aria-live="polite"
    >
      <div className="size-10 animate-spin rounded-full border-2 border-surface-2 border-t-foreground" />
      <span className="sr-only">Cargando…</span>
    </div>
  );
}

export default LoadingScreen;
