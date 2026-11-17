"use client";

import { useRef, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";

import { PageHeader } from "@/components/page-header";
import { Toast } from "@/components/toast";
import { completarOnboarding } from "@/app/onboarding/actions";

function formatCurrencyInput(value: string): string {
  // Limpiar puntos y dígitos no numéricos excepto el signo menos
  const clean = value.replace(/\./g, "").replace(/[^0-9-]/g, "");
  if (!clean) return "";
  // Agregar separadores de miles con punto (formato COP) sin bucle infinito.
  const sign = clean.startsWith("-") ? "-" : "";
  const digits = clean.replace("-", "");
  const grouped = digits.replace(/(\d)(?=(\d{3})+$)/g, "$1.");
  return sign + grouped;
}

export default function OnboardingPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const registroExitoso = searchParams.get("registroExitoso") === "true";
  // El paso inicial sale de ?step=N (por ejemplo al volver atrás desde otro
  // lado). Se deriva una sola vez en el inicializador de useState: hacerlo con
  // un useEffect provocaba renders en cascada.
  const [step, setStep] = useState(() => {
    const p = Number(searchParams.get("step"));
    return Number.isInteger(p) && p >= 1 && p <= 4 ? p : 1;
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  // Referencia al formulario real del paso: con varias forms en la página,
  // document.querySelector('form') podía agarrar la equivocada.
  const formRef = useRef<HTMLFormElement>(null);
  const [stepData, setStepData] = useState<{
    ingresoMensual?: number;
    frecuencia?: string;
    categorias?: string[];
    metodoPago?: "ahorro" | "tarjeta";
    nombreMetodo?: string;
    categoriaPersonalizada?: string;
    limitePresupuesto?: Record<string, number>;
  }>({});

  // Manejar envío parcial y avanzar de paso.
  // Ojo: onStepSubmit ya hace el setStep. Si además avanzamos acá, se saltan
  // pasos (era el bug de "Siguiente" saltando del 1 al 3).
  const handleNext = () => {
    if (formRef.current) onStepSubmit(new FormData(formRef.current));
  };

  const back = () => {
    setStep((prev) => Math.max(prev - 1, 1));
  };

  // Manejar envío parcial (guardar paso actual)
  const onStepSubmit = (formData: FormData) => {
    const nuevoData = { ...stepData };

    if (step === 1) {
      const monto = formData.get("ingresoMensual") as string || "0";
      const frecuencia = formData.get("frecuencia") as string || "mensual";
      nuevoData.ingresoMensual = parseInt(monto.replace(/[^0-9]/g, ""), 10) || 0;
      nuevoData.frecuencia = frecuencia;
    }
    if (step === 2) {
      const cats: string[] = [];
      const checkItems = formData.getAll("categoria") as string[];
      cats.push(...checkItems);
      const custom = (formData.get("categoriaPersonalizada") as string || "").trim();
      if (custom && !cats.includes(custom)) cats.push(custom);
      nuevoData.categorias = cats;
      if (custom) nuevoData.categoriaPersonalizada = custom;
    }
    if (step === 3) {
      const metodo = formData.get("metodoPago") as string || "";
      nuevoData.metodoPago = metodo as "ahorro" | "tarjeta";
      const nombre = formData.get("nombreMetodo") as string || "";
      if (nombre) nuevoData.nombreMetodo = nombre;
    }

    setStepData(nuevoData);
    setStep((prev) => Math.min(prev + 1, 4));
  };

  // Manejar envío final - pasa todos los datos acumulados
  const onFinalSubmit = async () => {
    setSubmitting(true);
    setSubmitError(null);
    
    // Construir FormData con todos los datos acumulados
    const formData = new FormData();
    
    // Ingreso
    if (stepData.ingresoMensual !== undefined) {
      formData.set("ingresoMensual", String(stepData.ingresoMensual));
    }
    if (stepData.frecuencia) {
      formData.set("frecuencia", stepData.frecuencia);
    }
    
    // Categorías
    if (stepData.categorias && stepData.categorias.length > 0) {
      formData.set("categorias", stepData.categorias.join(","));
    }
    if (stepData.categoriaPersonalizada) {
      formData.set("categoriaPersonalizada", stepData.categoriaPersonalizada);
    }
    
    // Método de pago
    if (stepData.metodoPago) {
      formData.set("metodoPago", stepData.metodoPago);
    }
    if (stepData.nombreMetodo) {
      formData.set("nombreMetodo", stepData.nombreMetodo);
    }
    
    // Límites del paso 4: se leen del formulario visible porque este paso se
    // cierra con "Finalizar configuración" y nunca pasa por onStepSubmit.
    if (formRef.current) {
      for (const [clave, valor] of new FormData(formRef.current).entries()) {
        if (clave.startsWith("limite_")) formData.set(clave, String(valor));
      }
    }

    try {
      const result = await completarOnboarding(formData);
      if (result.ok) {
        router.push("/");
      } else {
        setSubmitError(result.message);
      }
    } catch {
      setSubmitError("No pudimos guardar tu configuración. Probá de nuevo.");
    } finally {
      setSubmitting(false);
    }
  };

  const pasos = [
    {
      id: "1",
      titulo: "Ingresos iniciales",
      body: "Registra cuánto ingresas mensualmente para que el panel pueda calcular tu tasa de ahorro y darte recomendaciones.",
      campos: [
        { name: "ingresoMensual", label: "Ingreso mensual", type: "number", placeholder: "Ej: 50000" },
        { name: "frecuencia", label: "Frecuencia", type: "select", options: ["Mensual", "Quincenal", "Semanal", "Daily"] },
      ],
      tip: "Este dato se usa solo para cálculos de recomendaciones. Se puede editar después.",
    },
    {
      id: "2",
      titulo: "Categorías de gastos",
      body: "Selecciona las categorías que mejor describen tus gastos principales. Puedes agregar otras personalizadas después.",
      campos: [
        { name: "categorias", label: "Categorías", type: "multiple", options: ["Alimentación", "Transporte", "Hogar", "Servicios", "Salud", "Entretenimiento", "Ropa", "Educación", "Suscripciones"] },
        { name: "categoriaPersonalizada", label: "Otra (opcional)", type: "text", placeholder: "Ej: Viajes" },
      ],
      tip: "Puedes seleccionar varias y agregar una personalizada. Se pueden crear más desde «Categorías» después.",
    },
    {
      id: "3",
      titulo: "Métodos de pago",
      body: "Indica cómo pagas normalmente. El efectivo ya está activo por defecto. Elige al menos un método para comenzar.",
      campos: [
        { name: "metodoPago", label: "Método principal", type: "select", options: ["ahorro", "tarjeta"] },
        { name: "nombreMetodo", label: "Nombre", type: "text", placeholder: "Ej: Cuenta Corriente" },
      ],
      tip: "Puedes agregar más métodos (otras cuentas o tarjetas) desde «Métodos» después.",
    },
    {
      id: "4",
      titulo: "Límites de presupuesto",
      body: "Asigna un límite mensual rápido a las categorías que seleccionaste. Estos se pueden ajustar después.",
      campos: [],
      tip: "Todos los límites se pueden editar, agregar o borrar desde el panel de presupuestos.",
    },
  ];

  const pasoActual = pasos[step - 1];
  const totalPasos = pasos.length;

  const camposLimites = step === 4 && stepData.categorias
    ? stepData.categorias.map((cat: string) => (
        <div key={cat} className="mb-3">
          <label className="label text-muted mb-1">{cat}</label>
          <input
            type="text"
            name={`limite_${cat}`}
            className="input"
            placeholder={`Ej: 20000`}
            defaultValue={stepData.limitePresupuesto?.[cat] || ""}
            onInput={(e) => {
              const target = e.target as HTMLInputElement;
              const formatted = formatCurrencyInput(target.value);
              target.value = formatted;
            }}
          />
          <p className="text-xs text-muted tip">Límite mensual en pesos</p>
        </div>
      ))
    : [];

  return (
    <div>
      {registroExitoso ? (
        <Toast message="¡Registro exitoso! Ya podés empezar a configurar tu cuenta." tone="success" />
      ) : null}

      <PageHeader
        title="Bienvenido a Plata"
        description="Vamos a configurar tu cuenta para que empieces a llevar el control de tus finanzas. Todo esto podrás editarlo o borrarlo después desde la aplicación."
      />

      <main className="mx-auto w-full max-w-2xl px-4 py-8">

        {step >= 1 && step <= totalPasos ? (
          <section className="card p-6 sm:p-8">
            <h2 className="text-xl font-semibold mb-4">
              {pasoActual.titulo}
            </h2>

            <p className="text-muted mb-6">{pasoActual.body}</p>

            <form
              ref={formRef}
              onSubmit={(e) => {
                e.preventDefault();
                onStepSubmit(new FormData(e.currentTarget));
              }}
            >

              {step === 1 && (
                <div key="step-1">
                  <div className="mb-4">
                    <label className="label text-muted mb-1">Ingreso mensual</label>
                    <input
                      type="text"
                      name="ingresoMensual"
                      className="input"
                      placeholder="Ej: 50000"
                      required
                      onInput={(e) => {
                        const target = e.target as HTMLInputElement;
                        const formatted = formatCurrencyInput(target.value);
                        target.value = formatted;
                      }}
                    />
                  </div>
                  <div className="mb-4">
                    <label className="label text-muted mb-1">Frecuencia</label>
                    <select name="frecuencia" className="input">
                      <option value="mensual">Mensual</option>
                      <option value="quincenal">Quincenal</option>
                      <option value="semanal">Semanal</option>
                      <option value="diario">Diario</option>
                    </select>
                  </div>
                  <p className="text-xs text-muted tip">
                    {pasoActual.tip}
                  </p>
                </div>
              )}

              {step === 2 && (
                <div key="step-2">
                  <p className="text-muted text-sm mb-4">Elegí las categorías que aplican:</p>
                  <div className="grid grid-cols-2 gap-2">
                    {["Alimentación", "Transporte", "Hogar", "Servicios", "Salud", "Entretenimiento", "Ropa", "Educación", "Suscripciones"].map((cat) => (
                      <label
                        key={cat}
                        className="flex cursor-pointer items-center rounded-lg border border-line/50 p-2 text-muted transition-colors hover:border-accent/40 has-[:checked]:border-accent has-[:checked]:bg-accent/20 has-[:checked]:text-foreground"
                      >
                        <input
                          type="checkbox"
                          name="categoria"
                          value={cat}
                          defaultChecked={stepData.categorias?.includes(cat)}
                          className="sr-only"
                        />
                        <span className="font-medium">{cat}</span>
                      </label>
                    ))}
                  </div>
                  <div className="mb-4">
                    <label className="label text-muted mb-1">Otra categoría (opcional)</label>
                    <input
                      type="text"
                      name="categoriaPersonalizada"
                      className="input"
                      placeholder="Ej: Viajes"
                    />
                  </div>
                  <p className="text-xs text-muted tip">
                    {pasoActual.tip}
                  </p>
                </div>
              )}

              {step === 3 && (
                <div key="step-3">
                  <div className="mb-4">
                    <label className="label text-muted mb-1">Método principal</label>
                    <select name="metodoPago" className="input">
                      <option value="ahorro">Cuenta de ahorros / débito</option>
                      <option value="tarjeta">Tarjeta de crédito</option>
                    </select>
                  </div>
                  <div className="mb-4">
                    <label className="label text-muted mb-1">Nombre</label>
                    <input
                      type="text"
                      name="nombreMetodo"
                      className="input"
                      placeholder="Ej: Cuenta Corriente"
                    />
                  </div>
                  <p className="text-xs text-muted tip">
                    {pasoActual.tip}
                  </p>
                </div>
              )}

              {step === 4 && (
                <div key="step-4">
                  <p className="text-muted text-sm mb-4">Asigná límites mensuales a tus categorías:</p>
                  {camposLimites}
                  <p className="text-xs text-muted tip">
                    {pasoActual.tip}
                  </p>
                </div>
              )}

              <div className="mt-6">
                <button
                  type="button"
                  onClick={step > 1 ? back : undefined}
                  className="flex-1 btn btn-ghost"
                >
                  Atrás
                </button>
                {step < totalPasos ? (
                  <button
                    type="button"
                    onClick={handleNext}
                    className="flex-1 btn btn-primary"
                  >
                    Siguiente
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={onFinalSubmit}
                    disabled={submitting}
                    className={`flex-1 btn btn-primary ${submitting ? "disabled" : ""}`}
                  >
                    {submitting ? "Guardando…" : "Finalizar configuración"}
                  </button>
                )}
              </div>
            </form>
          </section>
        ) : (
          <p className="text-muted">Cargando onboarding…</p>
        )}

      </main>

      <div className="mt-4">
        {submitError && (
          <p className="mt-4 text-danger text-sm text-center">{submitError}</p>
        )}
      </div>
    </div>
  );
}