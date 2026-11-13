"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";

import { PageHeader } from "@/components/page-header";
import { IconPlus, IconTarget, IconWallet, IconInfo } from "@/components/icons";
import { formatMoney } from "@/lib/money";
import { completarOnboarding } from "@/app/onboarding/actions";

 // Formatea número con separadores de miles en formato COP (punto): 1.200.000
 // Retorna solo dígitos para almacenamiento interno.
 function formatCurrencyInput(value: string): string {
   // Limpiar puntos y dígitos no numéricos excepto el signo menos
   const clean = value.replace(/\./g, "").replace(/[^0-9-]/g, "");
   if (!clean) return "";
   // Agregar separadores de miles con punto (formato COP)
   let num = clean;
   while (/^\d\d\d/.test(num)) {
     num = num.replace(/^(\d\d\d)/, "$1.");
   }
   return num;
 }

export default function OnboardingPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [stepData, setStepData] = useState<{
    ingresoMensual?: number;
    frecuencia?: string;
    categorias?: string[];
    metodoPago?: "ahorro" | "tarjeta";
    nombreMetodo?: string;
    limitePresupuesto?: Record<string, number>;
  }>({});

  // Cargar paso desde URL
  useEffect(() => {
    const p = searchParams.get("step");
    if (p && Number(p) >= 1 && Number(p) <= 4) {
      setStep(Number(p));
    }
  }, [searchParams]);

  // Manejar envío parcial y avanzar de paso
  const handleNext = async () => {
    // Primero, obtener los datos del formulario actual y acumularlos
    const form = document.querySelector('form') as HTMLFormElement || undefined;
    if (form) {
      const formData = new FormData(form);
      await onStepSubmit(formData);
    }
    // Luego avanzar al siguiente paso
    setStep((prev) => Math.min(prev + 1, 4));
  };

  const back = () => {
    setStep((prev) => Math.max(prev - 1, 1));
  };

  // Manejar envío parcial (guardar paso actual)
  const onStepSubmit = async (formData: FormData) => {
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
      const custom = formData.get("categoriaPersonalizada") as string || "";
      if (custom && !cats.includes(custom)) cats.push(custom);
      nuevoData.categorias = cats;
    }
    if (step === 3) {
      const metodo = formData.get("metodoPago") as string || "";
      nuevoData.metodoPago = metodo as "ahorro" | "tarjeta";
      const nombre = formData.get("nombreMetodo") as string || "";
      if (nombre) nuevoData.nombreMetodo = nombre;
    }
    if (step === 4) {
      const limites: Record<string, number> = {};
      const categorias = stepData.categorias || [];
      categorias.forEach((cat: string) => {
        const lim = formData.get(`limite_${cat}`) as string || "0";
        limites[cat] = parseInt(lim.replace(/[^0-9]/g, ""), 10) || 0;
      });
      nuevoData.limitePresupuesto = limites;
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
    
    // Límites de presupuesto
    if (stepData.limitePresupuesto) {
      Object.entries(stepData.limitePresupuesto).forEach(([cat, lim]) => {
        formData.set(`limite_${cat}`, String(lim));
      });
    }
    
    const result = await completarOnboarding(formData as unknown as FormData);
    setSubmitting(false);
    if (result.ok) {
      router.push("/");
    } else {
      setSubmitError(result.message);
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
              const formatted = formatCurrencyInput(e.target.value);
              e.target.value = formatted;
            }}
          />
          <p className="text-xs text-muted tip">Límite mensual en pesos</p>
        </div>
      ))
    : [];

  return (
    <>
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

            <form onSubmit={(e) => {
              e.preventDefault();
              onStepSubmit(new FormData(e.target));
            }}>

              {step === 1 && (
                <>
                  <div className="mb-4">
                    <label className="label text-muted mb-1">Ingreso mensual</label>
                    <input
                      type="text"
                      name="ingresoMensual"
                      className="input"
                      placeholder="Ej: 50000"
                      required
                      onInput={(e) => {
                        const formatted = formatCurrencyInput(e.target.value);
                        e.target.value = formatted;
                      }}
                    />
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
                </>
              )}

              {step === 2 && (
                <>
                  <p className="text-muted text-sm mb-4">Elegí las categorías que aplican:</p>
                  <div className="grid grid-cols-3 gap-2">
                    {/* Categorías predefinidas como chips seleccionables */}
                    <div className="grid grid-cols-2 gap-2">
                      {["Alimentación", "Transporte", "Hogar", "Servicios", "Salud", "Entretenimiento", "Ropa", "Educación", "Suscripciones"].map((cat) => (
                        <div
                          key={cat}
                          className={["rounded-lg border border-line/50 p-2", stepData.categorias?.includes(cat) ? "bg-accent" : "text-muted" ].join(" ")}
                          role="button"
                          tabIndex={0}
                          onClick={() => {
                            setStepData((prev) => {
                              const categorias = prev.categorias || [];
                              if (categorias.includes(cat)) {
                                return { ...prev, categorias: categorias.filter((c) => c !== cat) };
                              } else {
                                return { ...prev, categorias: [...categorias, cat] };
                              }
                            });
                          }}
                        >
                          <span className="font-medium">{cat}</span>
                        </div>
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
                </>
              )}

              {step === 3 && (
                <>
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
                </>
              )}

              {step === 4 && (
                <>
                  <p className="text-muted text-sm mb-4">Asigná límites mensuales a tus categorías:</p>
                  {camposLimites}
                  <p className="text-xs text-muted tip">
                    {pasoActual.tip}
                  </p>
                </>
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

      {submitError && (
        <p className="mt-4 text-danger text-sm text-center">{submitError}</p>
      )}
    </>
  );
}