# Desplegar Plata en Vercel + Postgres

La app corre en serverless, así que la base **no puede vivir en el repo**: el
filesystem de Vercel es efímero y de solo lectura. Usamos Postgres gestionado
(Neon, Supabase o Vercel Postgres) y el driver adapter `@prisma/adapter-pg`.

## 1. Crear la base

Neon (recomendado por simplicidad y free tier):

1. Entrá a [neon.tech](https://neon.tech) y creá un proyecto.
2. Copiá la **connection string** del panel (*Connection Details*). Se ve así:

```text
postgresql://usuario:clave@ep-xxx-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require
```

> Usá la URL **pooled** (`-pooler`). Vercel abre muchas conexiones cortas y el
> pooler evita quedarte sin slots.

## 2. Aplicar las migraciones

Una sola vez, desde tu máquina:

```powershell
$env:DATABASE_URL="postgresql://...tu-url..."
npx prisma migrate deploy
```

Y si querés los datos de la base SQLite vieja (ver más abajo, sección *Migrar
datos*).

## 3. Configurar Vercel

En **Project → Settings → Environment Variables** (Production y Preview):

| Variable | Valor |
| --- | --- |
| `DATABASE_URL` | la connection string de Neon |
| `SESSION_SECRET` | una cadena larga y aleatoria |
| `RESEND_API_KEY` o `BREVO_API_KEY` | para mandar el código de registro |
| `EMAIL_FROM` | remitente verificado en el proveedor |

Generá el secreto con:

```powershell
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

**Sin `SESSION_SECRET` la app falla cerrado en producción** (a propósito): las
cookies de sesión no se pueden firmar. Sin `DATABASE_URL`, el login devuelve un
mensaje de error en vez de un 500, pero no funciona.

## 4. Desplegar

```powershell
npx vercel --prod
```

O simplemente `git push` si el proyecto está conectado al repo.

## 5. Instalarla en el celular (PWA)

Con la URL `https://tu-proyecto.vercel.app`:

- **Android / Chrome**: menú ⋮ → “Instalar app” o “Agregar a pantalla principal”.
- **iPhone / Safari**: botón Compartir → “Añadir a pantalla de inicio”.

## Migrar datos desde la base SQLite vieja

El `prisma/dev.db` viejo no se toca. El flujo es:

```powershell
# 1. Exportar SQLite a JSON (necesita better-sqlite3 al vuelo)
npm i --no-save better-sqlite3
node scripts/export-sqlite.mjs

# 2. Importar a Postgres
$env:DATABASE_URL="postgresql://...tu-url..."
npm run db:import-sqlite
```

El import es idempotente (`skipDuplicates`) y conserva IDs y fechas, así que las
relaciones quedan intactas. `prisma/sqlite-export.json` está en `.gitignore`:
tiene datos personales, no lo subas.

## Actualizaciones

Si agregás un modelo o una columna:

```powershell
npx prisma migrate dev --name lo_que_cambiaste
git add prisma/migrations
git commit -m "feat(db): ..."
```

En el deploy, Vercel **no** corre migraciones solo. Aplicalas antes:

```powershell
$env:DATABASE_URL="postgresql://...tu-url..."
npx prisma migrate deploy
```

## Backups

Neon y Supabase hacen point-in-time recovery y branching desde el panel: no
hace falta el scheduler casero que tenía la versión SQLite (se eliminó junto con
`src/lib/backup.ts` y `/api/backup`). Para una copia manual:

```powershell
pg_dump "$env:DATABASE_URL" --no-owner --no-acl -f plata-backup.sql
```

## Notas

- El cliente Prisma es perezoso: si falta `DATABASE_URL`, la conexión falla en
  el primer acceso a un modelo y las Server Actions devuelven un mensaje, no un
  500.
- Las variables se leen en runtime, no en build: cambiarlas en Vercel requiere
  un redeploy para que el server las tome.
