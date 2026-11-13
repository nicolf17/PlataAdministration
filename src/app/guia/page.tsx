import Link from "next/link";
import { connection } from "next/server";

import {
  IconArrowDown,
  IconArrowUp,
  IconCheck,
  IconChevronRight,
  IconCreditCard,
  IconInfo,
  IconSparkles,
  IconTag,
  IconTarget,
  IconTrend,
  IconWallet,
} from "@/components/icons";
import { PageHeader } from "@/components/page-header";
import { requireUserId } from "@/lib/auth";

export const instant = false;

const RECORRIDO = [
  {
    href: "/",
    label: "Panel",
    text: "El resumen del mes: cuánto entró, cuánto salió, tu balance y cómo van tus presupuestos.",
    Icon: IconTrend,
  },
  {
    href: "/movimientos",
    label: "Movimientos",
    text: "Donde registrás cada ingreso, gasto o transferencia. Es la pantalla que más vas a usar.",
    Icon: IconArrowUp,
  },
  {
    href: "/presupuestos",
    label: "Presupuesto",
    text: "Ponés un límite por categoría y ves cuánto te queda antes de pasarte.",
    Icon: IconTarget,
  },
  {
    href: "/cuentas",
    label: "Métodos",
    text: "Tu cuenta de ahorros/débito, tus tarjetas de crédito y el panel automático de efectivo. Todo movimiento sale de acá.",
    Icon: IconWallet,
  },
  {
    href: "/categorias",
    label: "Categorías",
    text: "Las etiquetas de tus gastos e ingresos (comida, transporte, sueldo…). Podés crear las tuyas.",
    Icon: IconTag,
  },
];

const PASOS = [
  {
    n: 1,
    title: "Cargá tus cuentas y tarjetas",
    href: "/cuentas",
    Icon: IconWallet,
    body: "En «Métodos» hay dos formularios plegables: uno para agregar tu tarjeta débito / cuenta de ahorros (nombre y saldo actual) y otro para tarjeta de crédito (cupo, día de corte y día de pago). Son independientes: abrís uno y el otro queda cerrado.",
    tip: "El efectivo no se carga: ya existe por defecto. Solo lo elegís al registrar un movimiento y su panel se calcula solo.",
  },
  {
    n: 2,
    title: "Revisá y personalizá tus categorías",
    href: "/categorias",
    Icon: IconTag,
    body: "Las categorías separan tus gastos (comida, transporte, hogar…) de tus ingresos (sueldo, freelance…). Podés borrar las que no uses y crear las que se ajusten a tu vida. Cada categoría tiene su color y se ve en el panel.",
    tip: "Empezá con pocas. Es más fácil agregar una categoría después que ordenar cincuenta movimientos mal clasificados.",
  },
  {
    n: 3,
    title: "Registrá primero tus ingresos",
    href: "/movimientos#nuevo",
    Icon: IconArrowDown,
    body: "Cargá el sueldo, los honorarios o cualquier plata que haya entrado. Elegí tipo «Ingreso», poné el monto, la fecha, la cuenta donde entró y una categoría de ingreso. Sin ingresos, el panel no puede calcular tu tasa de ahorro.",
    tip: "Un ingreso es plata que ENTRA. Si te transfirieron entre tus propias cuentas, eso es una «Transferencia», no un ingreso.",
  },
  {
    n: 4,
    title: "Anotá tus gastos del día a día",
    href: "/movimientos#nuevo",
    Icon: IconArrowUp,
    body: "Cada compra es un movimiento tipo «Gasto»: monto, descripción corta, fecha y categoría. En el selector de método de pago vas a ver tres grupos: Efectivo, Débito / Ahorros (tus cuentas) y Crédito (tus tarjetas). Anotarlos en el momento evita que se te acumulen y te olvides de la mitad.",
    tip: "El efectivo no tiene tope: todo lo que gastás en efectivo se acumula en su panel de «Métodos» para que veas cuánto y en qué lo usás.",
  },
  {
    n: 5,
    title: "Definí presupuestos por categoría",
    href: "/presupuestos",
    Icon: IconTarget,
    body: "Elegí un mes, una categoría de gasto y un límite. El selector solo muestra categorías de GASTO (las de ingreso no se presupuestan). La barra te muestra cuánto llevás gastado y el panel te avisa cuando estás cerca del tope o ya lo pasaste.",
    tip: "Si creaste una categoría de gasto nueva, ya aparece en el selector sin recargar nada.",
  },
  {
    n: 6,
    title: "Revisá el panel y ajustá",
    href: "/",
    Icon: IconTrend,
    body: "El panel te muestra ingresos, gastos, balance, patrimonio neto y recomendaciones explicables. Usá el selector de mes para comparar cómo venís. Si algo no cierra, revisá los movimientos de ese mes.",
    tip: "No busques que quede perfecto el primer día. La utilidad aparece cuando hay dos o tres meses de datos.",
  },
];

const PREGUNTAS = [
  {
    q: "¿Cómo funciona el efectivo?",
    a: "Es un método nativo: no se crea, no se edita y no tiene saldo inicial ni tope. Lo elegís al registrar un movimiento y en «Métodos» ves un panel que suma lo que gastaste y lo que ingresaste en efectivo. Sirve para saber cuánto usás el efectivo, no para controlar un saldo.",
  },
  {
    q: "¿Por qué una categoría no aparece en presupuestos?",
    a: "Porque el selector solo muestra categorías de gasto. Las de ingreso (salario, prestaciones, etc.) no se presupuestan: no tiene sentido ponerle un límite a la plata que entra.",
  },
  {
    q: "¿Cuál es la diferencia entre cuenta y tarjeta?",
    a: "Una cuenta es plata que tenés (banco, ahorros, débito). Una tarjeta es plata que debés. Por eso un gasto con tarjeta sube tu deuda y no toca tu efectivo hasta que pagás el resumen. El efectivo es aparte: se acumula según los movimientos que registrás en efectivo.",
  },
  {
    q: "¿Cómo pago la tarjeta?",
    a: "Registrá una «Transferencia» desde tu cuenta de ahorros hacia la tarjeta. Así baja la deuda y baja el saldo de la cuenta, como en la vida real.",
  },
  {
    q: "¿Puedo editar o borrar un movimiento?",
    a: "Sí. En «Movimientos» cada fila tiene los botones de editar y eliminar. Los cambios se reflejan al instante en el panel, en los saldos y en los presupuestos.",
  },
  {
    q: "¿Dónde quedan mis datos?",
    a: "En una base SQLite privada dentro del servidor de la app, guardada en un volumen persistente. Cada usuario ve solo sus propios movimientos, cuentas, categorías y presupuestos, y los datos sobreviven a recargas y reinicios.",
  },
  {
    q: "¿Puedo usar la app sin internet?",
    a: "Se puede instalar como PWA y abrir desde el teléfono, pero los datos se guardan en el servidor: para registrar o ver movimientos necesitás conexión.",
  },
];

const INSTALAR = [
  "Abrí la app en el navegador del teléfono.",
  "En Android/Chrome: menú ⋮ → «Instalar aplicación» o «Agregar a pantalla principal».",
  "En iPhone/Safari: botón Compartir → «Agregar a pantalla de inicio».",
  "Se abre como una app más, con su ícono y sin barra del navegador.",
];

export default async function GuidePage() {
  await connection();
  await requireUserId();

  return (
    <>
      <PageHeader
        title="Guía de uso"
        description="Empezá por acá si es tu primera vez. En 10 minutos tenés la app funcionando."
      >
        <Link href="/movimientos#nuevo" className="btn btn-primary">
          Cargar mi primer movimiento
          <IconChevronRight className="size-4" />
        </Link>
      </PageHeader>

      {/* Atajo: el recorrido mental de la app antes de tocar botones. */}
      <section className="card p-4 sm:p-5">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <IconInfo className="size-4 text-muted" />
          Cómo moverte por la app
        </h2>
        <p className="mt-1 text-[12px] leading-relaxed text-muted">
          Abajo en el celular y a la izquierda en la compu tenés siempre el mismo menú.
          Estas son las cinco pantallas y para qué sirve cada una.
        </p>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {RECORRIDO.map(({ href, label, text, Icon }) => (
            <li key={href}>
              <Link
                href={href}
                className="flex h-full items-start gap-3 rounded-xl border border-line bg-surface/50 p-3 transition-colors hover:border-[#2f4358] hover:bg-surface-2"
              >
                <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg bg-accent-soft text-accent">
                  <Icon className="size-4" />
                </span>
                <span className="min-w-0">
                  <span className="block text-[13px] font-semibold">{label}</span>
                  <span className="mt-0.5 block text-[11px] leading-relaxed text-muted">
                    {text}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* Pasos ordenados: el orden importa porque cada uno depende del anterior. */}
      <section className="mt-4">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold">
          <IconSparkles className="size-4 text-accent" />
          Primeros pasos, en orden
        </h2>
        <ol className="space-y-3">
          {PASOS.map(({ n, title, body, tip, href, Icon }) => (
            <li key={n} className="card p-4 sm:p-5">
              <div className="flex items-start gap-3">
                <span className="grid size-8 shrink-0 place-items-center rounded-full bg-accent text-[13px] font-bold text-[#04231b]">
                  {n}
                </span>
                <div className="min-w-0 flex-1">
                  <h3 className="flex items-center gap-2 text-[14px] font-semibold">
                    <Icon className="size-4 text-muted" />
                    {title}
                  </h3>
                  <p className="mt-1.5 text-[12.5px] leading-relaxed text-muted">{body}</p>
                  <p className="mt-2 rounded-lg border border-line/70 bg-surface-2/60 px-3 py-2 text-[11.5px] leading-relaxed text-muted">
                    <span className="font-semibold text-foreground/80">Tip: </span>
                    {tip}
                  </p>
                  <Link
                    href={href}
                    className="mt-2.5 inline-flex items-center gap-1 text-[11.5px] font-semibold text-info hover:text-info/80"
                  >
                    Ir a esta pantalla
                    <IconChevronRight className="size-3.5" />
                  </Link>
                </div>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        {/* Reglas del modelo mental: evitan el error más común (contar dos veces). */}
        <section className="card p-4 sm:p-5">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <IconCheck className="size-4 text-accent" />
            Cuatro reglas que te van a salvar
          </h2>
          <ul className="mt-3 space-y-3">
            <li className="flex gap-2.5">
              <IconWallet className="mt-0.5 size-4 shrink-0 text-muted" />
              <p className="text-[12px] leading-relaxed text-muted">
                <span className="font-semibold text-foreground">Un movimiento, una sola vez.</span>{" "}
                Si anotás el gasto con tarjeta no lo vuelvas a anotar cuando llegue el resumen:
                el pago de la tarjeta es una transferencia aparte.
              </p>
            </li>
            <li className="flex gap-2.5">
              <IconArrowDown className="mt-0.5 size-4 shrink-0 text-muted" />
              <p className="text-[12px] leading-relaxed text-muted">
                <span className="font-semibold text-foreground">Ingreso no es transferencia.</span>{" "}
                Mover plata entre tus propias cuentas no es plata nueva. Usá «Transferencia»
                para no inflar tus ingresos.
              </p>
            </li>
            <li className="flex gap-2.5">
              <IconCreditCard className="mt-0.5 size-4 shrink-0 text-muted" />
              <p className="text-[12px] leading-relaxed text-muted">
                <span className="font-semibold text-foreground">La tarjeta es deuda.</span>{" "}
                El gasto con tarjeta sube la deuda; el pago del resumen la baja. El patrimonio
                neto es lo que tenés menos lo que debés.
              </p>
            </li>
            <li className="flex gap-2.5">
              <IconWallet className="mt-0.5 size-4 shrink-0 text-muted" />
              <p className="text-[12px] leading-relaxed text-muted">
                <span className="font-semibold text-foreground">El efectivo es automático.</span>{" "}
                No lo des de alta ni le pongas tope: elegilo en el movimiento y el panel de
                «Métodos» suma lo gastado y lo ingresado en efectivo.
              </p>
            </li>
          </ul>
        </section>

        <section className="card p-4 sm:p-5">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <IconInfo className="size-4 text-muted" />
            Instalar como app (PWA)
          </h2>
          <p className="mt-1 text-[12px] leading-relaxed text-muted">
            Plata se puede instalar en el teléfono sin pasar por una tienda.
          </p>
          <ol className="mt-3 space-y-2">
            {INSTALAR.map((paso, index) => (
              <li key={paso} className="flex gap-2.5 text-[12px] leading-relaxed text-muted">
                <span className="grid size-5 shrink-0 place-items-center rounded-full border border-line text-[10px] font-semibold text-foreground/70">
                  {index + 1}
                </span>
                {paso}
              </li>
            ))}
          </ol>
        </section>
      </div>

      <section className="card mt-4 p-4 sm:p-5">
        <h2 className="text-sm font-semibold">Preguntas frecuentes</h2>
        <div className="mt-3 divide-y divide-line/70">
          {PREGUNTAS.map(({ q, a }) => (
            <details key={q} className="group py-3 first:pt-0 last:pb-0">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-[12.5px] font-medium">
                {q}
                <IconChevronRight className="size-4 shrink-0 text-muted transition-transform group-open:rotate-90" />
              </summary>
              <p className="mt-2 text-[12px] leading-relaxed text-muted">{a}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="card mt-4 flex flex-col items-start gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div>
          <h2 className="text-sm font-semibold">¿Listo para arrancar?</h2>
          <p className="mt-1 text-[12px] text-muted">
            Si ya cargaste tus métodos, el siguiente paso es registrar el primer ingreso.
          </p>
        </div>
        <Link href="/movimientos#nuevo" className="btn btn-primary shrink-0">
          Registrar un ingreso
          <IconChevronRight className="size-4" />
        </Link>
      </section>
    </>
  );
}
