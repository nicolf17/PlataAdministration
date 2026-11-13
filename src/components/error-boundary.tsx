"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";

type ErrorBoundaryProps = {
  children: ReactNode;
  fallback?: ReactNode;
};

type ErrorBoundaryState = {
  error: Error | null;
};

// Fila de errores del cliente: si algo explota mientras se renderiza (o durante
// hidratación), el fallback con botón de reintento evita quedar en pantalla de
// carga infinita sin ninguna salida visible.
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Se registra en consola para diagnóstico y queda disponible para telemetría.
    console.error("[plata] Error capturado por ErrorBoundary:", error, info?.componentStack);
  }

  private reset = () => this.setState({ error: null });

  render() {
    const { error } = this.state;
    if (error) {
      if (this.props.fallback !== undefined) {
        return this.props.fallback;
      }
      // Errores de desajuste cliente/servidor tras un deploy (o chunks viejos
      // en caché) no se arreglan reintentando el render: hay que recargar.
      const needsReload =
        /server action|dynamically imported module|chunk|loading css chunk/i.test(
          `${error.name} ${error.message}`,
        );

      return (
        <div
          role="alert"
          className="flex min-h-dvh w-full flex-col items-center justify-center gap-4 p-6 text-center"
        >
          <h1 className="text-lg font-semibold tracking-tight">Algo se trabó en la carga</h1>
          <p className="max-w-md text-sm text-muted">
            {needsReload
              ? "La app se actualizó o el servidor estaba arrancando. Recargá y volvé a entrar: tus datos siguen guardados."
              : "La app encontró un error inesperado al renderizar. Tus datos siguen guardados en el servidor."}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                if (needsReload) {
                  window.location.reload();
                  return;
                }
                this.reset();
              }}
              className="btn btn-primary"
            >
              {needsReload ? "Recargar la app" : "Reintentar"}
            </button>
            <a href="/" className="btn btn-ghost">
              Ir al inicio
            </a>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
