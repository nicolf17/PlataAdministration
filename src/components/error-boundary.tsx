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
      return (
        <div
          role="alert"
          className="flex min-h-dvh w-full flex-col items-center justify-center gap-4 p-6 text-center"
        >
          <h1 className="text-lg font-semibold tracking-tight">Algo se trabó en la carga</h1>
          <p className="max-w-md text-sm text-muted">
            La app encontró un error inesperado al renderizar. No perdiste tus datos: se
            guardan en tu dispositivo y en el servidor.
          </p>
          <div className="flex items-center gap-2">
            <button type="button" onClick={this.reset} className="btn btn-primary">
              Reintentar
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
