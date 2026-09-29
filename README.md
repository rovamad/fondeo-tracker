# Fondeo Tracker

Tracker personal de cuentas de fondeo (prop firms): registra gastos, retiros y KPIs clave por cuenta y por firma. Inspirado en el Tracker de Tradesfera, pensado para uso individual y corriendo en local.

## Primer arranque

```bash
npm install
cp .env.example .env
npx prisma migrate dev
npx prisma generate
npm run db:seed   # opcional, carga datos de ejemplo
npm run dev
```

Abre `http://localhost:3000`.

## Scripts

- `npm run dev` — servidor de desarrollo
- `npm run build` / `npm run start` — build y arranque de producción
- `npm run test` — tests de la lógica de KPIs (Vitest)
- `npm run db:migrate` — crea/aplica migraciones de Prisma
- `npm run db:generate` — regenera el cliente de Prisma
- `npm run db:seed` — **borra y repuebla** la base con datos de ejemplo
- `npm run db:studio` — abre Prisma Studio para ver/editar los datos a mano

## Datos y respaldo

Todo se guarda en un único archivo SQLite: `prisma/dev.db`. Para respaldar tus datos, simplemente copia ese archivo a otro lugar (o súbelo a un Drive/Dropbox). Para restaurar, sobrescribe `prisma/dev.db` con tu copia.

## Estructura

- `src/lib/metrics.ts` — cálculo de KPIs (funciones puras, con tests en `metrics.test.ts`)
- `src/lib/actions.ts` — server actions (crear/editar/eliminar cuentas y movimientos)
- `src/lib/data.ts` — lectura de datos desde Prisma
- `src/app/` — páginas: `/` (dashboard), `/cuentas`, `/cuentas/[id]`, `/movimientos`, `/firmas`
- `prisma/schema.prisma` — modelo de datos (Account, Transaction)
