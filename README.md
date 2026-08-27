# HoopKit

HoopKit is a mobile-first basketball move library and workout planning platform.

## Applications

- `apps/mobile`: React Native application built with Expo.
- `apps/admin`: Next.js content administration application.
- `apps/api`: NestJS API and server-side business logic.
- `supabase`: Local PostgreSQL, Auth, Storage, migrations, and seed data.

See [architecture.md](./architecture.md) for the system architecture and implementation roadmap.
See [docs/database-and-auth.md](./docs/database-and-auth.md) for the current
database, seed, local Admin account, Supabase Studio, and authentication workflow.

## Prerequisites

- Node.js 22 LTS
- pnpm 11 (managed through Corepack)
- Docker Desktop with the Linux engine running
- Android Studio or a physical device for Android development

## Quick start

```powershell
corepack enable
pnpm.cmd install
pnpm.cmd db:start
pnpm.cmd admin:create-local
pnpm.cmd --filter @hoopkit/api dev
pnpm.cmd --filter @hoopkit/admin dev
```

The default local ports are:

- Admin: `http://localhost:3000`
- API: `http://localhost:3001`
- Supabase API: `http://localhost:54321`
- Supabase Studio: `http://localhost:54323`

## Quality checks

```powershell
pnpm.cmd format:check
pnpm.cmd lint
pnpm.cmd typecheck
pnpm.cmd test
pnpm.cmd build
```

Never commit real credentials. Copy `.env.example` to an ignored local environment file and use deployment-provider secret stores outside local development.
