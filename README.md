# plata.

Finanzas personales sin planillas. Registrá cuentas, ingresos, gastos en efectivo y con tarjeta, armá presupuestos por categoría y recibí recomendaciones **explicables** sobre tus últimos meses.

> Proyecto en construcción: esta es la primera vertical slice funcional.

## Qué incluye

- **Cuentas** de efectivo, banco, ahorros y billeteras, con saldo calculado desde los movimientos.
- **Tarjetas de crédito** separadas de las cuentas: una compra con tarjeta es deuda, no salida de efectivo.
- **Movimientos** de ingreso, gasto y transferencia, con categorías jerárquicas.
- **Presupuestos mensuales** por categoría (un presupuesto sobre una categoría padre suma sus hijas).
- **Dashboard** con ingresos, gastos, tasa de ahorro, patrimonio neto y gasto por categoría.
- **Motor de recomendaciones** por reglas: desvíos contra el promedio de 3 meses, uso del cupo de tarjetas, presupuestos excedidos y concentración de gasto.
- **Datos demo** de 4 meses para ver la app funcionando desde el primer minuto.

## Stack

| Capa | Tecnología |
| --- | --- |
| Framework | Next.js 16 (App Router, Server Actions) |
| Lenguaje | TypeScript |
| UI | Tailwind CSS v4 |
| Datos | SQLite + Prisma 7 (driver adapter `better-sqlite3`) |
| Validación | Zod |

## Empezar

Requisitos: **Node.js 22 o superior** (Prisma 7 lo exige).

```bash
npm install
cp .env.example .env      # en Windows: copy .env.example .env
npm run db:setup
npm run dev
```

Abrí [http://localhost:3000](http://localhost:3000).

El `seed` crea 4 cuentas, 2 tarjetas, categorías, presupuestos y ~92 movimientos de los últimos 4 meses. Está armado para que veas recomendaciones reales: un presupuesto excedido, Delivery disparado y una tarjeta al 60% del cupo.

## Scripts

| Script | Qué hace |
| --- | --- |
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Build de producción |
| `npm run typecheck` | TypeScript sin emitir |
| `npm run db:setup` | Genera el cliente, aplica migraciones y siembra datos demo (primera vez) |
| `npm run db:migrate` | Crea y aplica migraciones |
| `npm run db:seed` | Carga los datos demo |
| `npm run db:studio` | Abre Prisma Studio |
| `npm run db:reset` | Borra la DB, re-migra y re-siembra |

## Decisiones de diseño

### 1. La plata se guarda en enteros

Nunca `float` para dinero. Todos los montos son `Int` en **unidades menores**. Para COP la unidad menor es el peso (`decimals = 0`), así que `$1.800.000` se guarda como `1800000`. El formateo vive en `src/lib/money.ts`.

### 2. Cuenta ≠ medio de pago

```text
EXPENSE + accountId     -> gasto pagado con efectivo/banco (baja el saldo)
EXPENSE + creditCardId  -> compra con tarjeta (sube la deuda, no toca el saldo)
INCOME  + accountId     -> ingreso que entra a una cuenta
TRANSFER + accountId + transferAccountId -> movimiento entre cuentas propias
TRANSFER + accountId + creditCardId      -> pago de tarjeta (baja saldo y deuda)
```

Mezclar "medio de pago" con "cuenta" es el error clásico de estas apps: el reporte de gastos deja de cerrar con la plata disponible. Acá están separados desde el modelo.

### 3. Saldos derivados, no almacenados

El saldo de una cuenta se calcula desde su saldo inicial y sus movimientos. La deuda de una tarjeta, desde sus compras menos sus pagos. No hay un campo `balance` que se pueda desincronizar.

Fórmulas en `src/lib/queries.ts` (`computeAccountBalance` y `computeCardDebt`).

### 4. Recomendaciones por reglas, no por IA

Cada recomendación nace de un número auditable. El motor (`src/lib/recommendations.ts`) es una función pura: entra un snapshot de datos, sale una lista priorizada. Eso lo hace testeable y fácil de extender.

| Regla | Disparador |
| --- | --- |
| Ahorro negativo | gastos > ingresos |
| Ahorro bajo | tasa < 10% |
| Ahorro sano | tasa ≥ 20% |
| Categoría disparada | mes actual > 130% del promedio de 3 meses (y diferencia ≥ $50.000) |
| Cupo de tarjeta | uso ≥ 50% (warning) / ≥ 80% (danger) |
| Presupuesto | uso ≥ 80% (warning) / > 100% (danger) |
| Concentración | una categoría ≥ 35% del gasto total |

### 5. SQLite primero

Es una app personal: SQLite alcanza y sobra, corre sin servidor y la DB es un archivo. El acceso está aislado detrás de Prisma, así que migrar a Postgres/Turso para sincronizar entre dispositivos es un cambio de adapter, no una reescritura.

## Estructura

```text
prisma/
  schema.prisma        Modelo de dominio
  seed.ts              Datos demo de 4 meses
src/
  app/
    page.tsx           Dashboard
    movimientos/       Alta y listado de movimientos
    presupuestos/      Límites mensuales por categoría
    cuentas/           Cuentas y tarjetas
    actions.ts         Server Actions (validación + escritura)
  components/          UI
  lib/
    money.ts           Unidades menores y formateo
    dates.ts           Meses y rangos en UTC
    queries.ts         Lecturas y cálculo de saldos
    recommendations.ts Motor de reglas (puro)
    db.ts              Cliente Prisma singleton
```

## Roadmap

- [ ] Tests del motor de recomendaciones y de los cálculos de saldo
- [ ] Edición de movimientos (hoy se pueden crear y eliminar)
- [ ] Gastos recurrentes y suscripciones
- [ ] Importación de extractos CSV
- [ ] Gráfico de evolución mensual
- [ ] Metas de ahorro
- [ ] Multiusuario + Postgres/Turso para sincronizar
- [ ] PWA para usar desde el celular

## Licencia

MIT
