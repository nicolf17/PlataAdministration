# Desplegar Plata en Fly.io

La app usa SQLite, así que necesita **una sola máquina con un volumen persistente**.
No la despliegues en Vercel: el sistema de archivos es efímero y la base se pierde.

## 1. Instalar flyctl (Windows)

```powershell
iwr https://fly.io/install.ps1 -useb | iex
```

Cerrá y abrí la terminal para que tome el PATH nuevo.

## 2. Crear cuenta o iniciar sesión

```powershell
fly auth signup   # si todavía no tenés cuenta
fly auth login    # si ya tenés cuenta
```

Fly pide una tarjeta para crear la máquina. El volumen de 1 GB y la máquina
compartida más chica son el gasto mínimo de la plataforma.

## 3. Elegir nombre de app

En `fly.toml` está `app = "plata-finanzas"`. Si ese nombre ya está tomado:

```powershell
fly apps create plata-finanzas-tu-nombre
```

Y cambiá la primera línea de `fly.toml` por el mismo nombre.

## 4. Crear el volumen persistente

Tiene que estar en la misma región que `primary_region` (por defecto `gru`):

```powershell
fly volumes create plata_data --region gru --size 1
```

## 5. Desplegar

```powershell
fly deploy
```

En el primer arranque el contenedor hace automáticamente:

1. `prisma migrate deploy` → crea las tablas (`User`, `Session` y columnas
   `userId` en las tablas de datos).
2. `prisma/bootstrap.mjs` → crea el usuario base (email `nicolaslopezforero17@gmail.com`,
   password por defecto `plata12345` o la de `BOOTSTRAP_PASSWORD`) **y** backfillea las
   filas viejas sin usuario a ese usuario. Luego crea 2 cuentas, 4 categorías y 3
   presupuestos **solo si la base está vacía**. No crea movimientos ni borra datos.
3. `next start` → levanta la app.

Las variables de entorno que usa:

- `DATABASE_URL` → `file:/data/plata.db`.
- `SESSION_SECRET` → clave de firma de las cookies de sesión (romperla invalida
  todas las sesiones).
- `BOOTSTRAP_PASSWORD` → password del usuario base en instalaciones nuevas.

Abrila con:

```powershell
fly open
```

## 6. Instalarla en el celular (PWA)

Con la URL `https://tu-app.fly.dev`:

- **Android / Chrome**: menú ⋮ → “Instalar app” o “Agregar a pantalla principal”.
- **iPhone / Safari**: botón Compartir → “Añadir a pantalla de inicio”.

Queda como una app aparte, pantalla completa, con su ícono. Necesita internet
para leer y guardar datos; si se corta la conexión muestra una pantalla offline.

## Actualizaciones

```powershell
git pull
fly deploy
```

El volumen y la base no se tocan. Las migraciones corren solas al arrancar.

## Backup de la base

La base vive en el volumen en `/data/plata.db`. Para bajarla:

```powershell
fly ssh console -C "sqlite3 /data/plata.db '.backup /data/backup.db'"
fly sftp get /data/backup.db
```

O más simple: `fly ssh console` y copiá el archivo con `cat`/`base64`, o usá
`fly sftp shell`.

## Notas

- No escales a más de una máquina: SQLite con volumen no soporta escrituras
  concurrentes entre máquinas.
- `auto_stop_machines = "off"` y `min_machines_running = 1` mantienen la app
  despierta para acceso “en todo momento”. Si preferís ahorrar, poné
  `auto_stop_machines = "stop"` y `min_machines_running = 0` (la primera visita
  tarda unos segundos).
