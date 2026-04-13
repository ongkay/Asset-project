# Asset Project
Web app Next.js 16 untuk mengelola subscription, asset access, session `app_session`, dan integrasi Chrome Extension sesuai `docs/PRD.md`.

## Main Routes
- `/login`
- `/reset-password`
- `/console`
- `/admin`

Route di `src/app/(main)/**` masih ada sebagai template legacy dan bukan source of truth product flow.

## Stack
- Next.js 16 App Router
- React 19 + TypeScript strict
- Tailwind CSS v4 + primitive UI repo
- React Hook Form + Zod
- Zustand
- TanStack React Query + TanStack Table
- `@insforge/sdk`
- Playwright

## Setup Dev Runtime
1. Install dependencies dengan `pnpm install`.
2. Siapkan `.env.local` dari `.env.example`.
3. Pastikan `DATABASE_URL` runtime app mengarah ke project InsForge yang sama dengan env InsForge lain.
4. Apply migration baseline berurutan: `001_extensions.sql` sampai `031_activation_rpc.sql`.
5. Pastikan schema `auth.users` sudah ada sebelum apply baseline.
6. Apply seed development: `040_dev_seed_full.sql` lalu `041_dev_seed_loginable_users.sql`.
7. Jalankan app dengan `pnpm dev`.

## Browser-Loginable Seed Accounts
- `seed.admin.browser@assetnext.dev`
- `seed.active.browser@assetnext.dev`
- `seed.processed.browser@assetnext.dev`
- `seed.expired.browser@assetnext.dev`
- `seed.canceled.browser@assetnext.dev`
- `seed.none.browser@assetnext.dev`

Shared password:
- `Devpass123`

## Scripts
```bash
pnpm dev
pnpm build
pnpm start
pnpm lint
pnpm typecheck
pnpm check
pnpm markdown:check
pnpm test:e2e:smoke
pnpm test:e2e:smoke:ui
```

## Phase 0 Smoke Test
Jalankan smoke test browser dasar dengan:

```bash
pnpm test:e2e:smoke
```

Spec Phase 0 memverifikasi:
- `/login` render
- `/reset-password` render
- guest ditolak dari `/console`
- guest ditolak dari `/admin`

Catatan penting:
- verifikasi browser harus mengacu ke database runtime app, bukan database tooling lain
- jika smoke test memakai akun seed, pastikan `041_dev_seed_loginable_users.sql` sudah applied ke database yang dipakai `DATABASE_URL`

## Structure Notes
- `src/app/**` hanya untuk route, layout, dan route-local UI
- business logic hidup di `src/modules/**`
- adapter InsForge hidup di `src/lib/insforge/**`
- helper cookie/session shared hidup di `src/lib/cookies.ts`
- helper lama `src/server/server-actions.ts` sudah bukan jalur product code

## Verification Gate
Sebelum melanjutkan phase berikutnya, jalankan:

```bash
pnpm lint
pnpm typecheck
pnpm build
pnpm markdown:check
pnpm test:e2e:smoke
```
