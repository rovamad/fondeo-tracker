# Fondeo Tracker

Tracker personal de cuentas de fondeo (prop firms): registra gastos, retiros y KPIs clave por cuenta y por firma. Inspirado en el Tracker de Tradesfera, pensado para uso individual y corriendo en local.

## Primer arranque

```bash
pnpm install
cp .env.example .env
pnpm exec prisma migrate dev
pnpm exec prisma generate
pnpm run db:seed   # opcional, carga datos de ejemplo
pnpm run dev
```

Abre `http://localhost:3000`.

## Scripts

- `pnpm run dev` — servidor de desarrollo
- `pnpm run build` / `pnpm run start` — build y arranque de producción
- `pnpm run test` — tests de la lógica de KPIs (Vitest)
- `pnpm run db:migrate` — crea/aplica migraciones de Prisma
- `pnpm run db:generate` — regenera el cliente de Prisma
- `pnpm run db:seed` — **borra y repuebla** la base con datos de ejemplo
- `pnpm run db:studio` — abre Prisma Studio para ver/editar los datos a mano

## Datos y respaldo

Todo se guarda en un único archivo SQLite: `prisma/dev.db`. Para respaldar tus datos, simplemente copia ese archivo a otro lugar (o súbelo a un Drive/Dropbox). Para restaurar, sobrescribe `prisma/dev.db` con tu copia.

## Estructura

- `src/lib/metrics.ts` — cálculo de KPIs (funciones puras, con tests en `metrics.test.ts`)
- `src/lib/actions.ts` — server actions (crear/editar/eliminar cuentas y movimientos)
- `src/lib/data.ts` — lectura de datos desde Prisma
- `src/app/` — páginas: `/` (dashboard), `/cuentas`, `/cuentas/[id]`, `/movimientos`, `/firmas`
- `prisma/schema.prisma` — modelo de datos (Account, Transaction)
