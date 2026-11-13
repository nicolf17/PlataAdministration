import Link from "next/link";
import { requireUserId } from "@/lib/auth";
import { connection } from "next/server";
import { PageHeader } from "@/components/page-header";

export const instant = false;

const RECORRIDO = [
  { href: "/", label: "Panel", text: "Resumen", Icon: null },
  { href: "/movimientos", label: "Movimientos", text: "Gastos e ingresos", Icon: null },
];

const PREGUNTAS = [
  { q: "¿Cómo registro mis ingresos mensuales?", a: "En el onboarding inicial ingresá tu ingreso mensual y frecuencia. Después podés agregarlo desde el panel principal en la sección de configuración." },
  { q: "¿Cómo creo categorías de gastos?", a: "Seleccioná las categorías que aplican en el onboarding o añadí nuevas desde el menú «Categorías». Podés personalizar colores y tipos (ingreso/egreso)." },
  { q: "¿Cómo agrego un método de pago?", a: "En el onboarding definí tu método principal (ahorro o tarjeta). Después podés agregar más cuentas o tarjetas desde la sección de métodos de pago." },
  { q: "¿Cómo funcionan los límites de presupuesto?", a: "Asigná límites mensuales a cada categoría en el onboarding. Estos se pueden editar, agregar o borrar desde el panel de presupuestos en cualquier momento." },
  { q: "¿Cómo veo mis movimientos y transacciones?", a: "Todos los movimientos aparecen en la sección «Movimientos». Podés filtrar por fecha, categoría o tipo (ingreso/egreso)." },
  { q: "¿Cómo restablezco mi contraseña?", a: "Usá la opción «¿Olvidaste tu contraseña?» en la pantalla de ingreso y seguí las instrucciones por correo electrónico." },
  { q: "¿Mis datos están seguros y privados?", a: "Sí. Tus datos están en tu cuenta personal y encriptados. La aplicación no comparte tu información con terceros." },
];

export default async function GuidePage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string }>;
}) {
  await connection();
  await requireUserId();

  return (
    <>
      <PageHeader
        title="Guía de uso"
        description="Documentación de la aplicación."
      >
        <Link href="/movimientos#nuevo" className="btn btn-primary">
          Movimiento
        </Link>
      </PageHeader>

      <section className="p-4">
        <h2>Bienvenido</h2>
        <p>Guía de ayuda de la aplicación Plata.</p>
      </section>

      <section>
        <h2>Preguntas frecuentes</h2>
        {PREGUNTAS.map(({ q, a }) => (
          <div key={q}>
            <strong>{q}</strong>: {a}
          </div>
        ))}
      </section>
    </>
  );
}