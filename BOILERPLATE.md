# Next Shadcn Admin Dashboard Boilerplate (Agent Guide)

Dokumen ini dibuat sebagai panduan internal agar Agent AI (dan developer) memahami boilerplate ini dengan cepat.

Tujuan utama:

- Agent AI tidak membuat ulang komponen/hook/utilitas yang sudah tersedia.
- Halaman/komponen baru tetap konsisten dengan theme preset + preferences.
- Struktur routing/layout tetap sesuai pola boilerplate.

## Quick Start (PNPM)

- Install: `pnpm i`
- Dev: `pnpm dev`
- Build: `pnpm build`
- Lint/format/check (Biome):
  - `pnpm lint`
  - `pnpm format`
  - `pnpm check`
- Generate theme preset registry: `pnpm generate:presets`

Catatan:

- `.husky/pre-commit` menjalankan `generate:presets` dan auto-add `src/lib/preferences/theme.ts`.

## Tech Stack

- Next.js App Router: `next@^16.1.4`
- React: `react@^19.2.3`
- TypeScript
- Tailwind CSS v4 (via `@import "tailwindcss"` di `src/app/globals.css`)
- shadcn/ui (source code dicopy ke `src/components/ui`)
- Zustand (khusus preferences)
- Forms: React Hook Form + Zod
- Data table: TanStack Table (`@tanstack/react-table`)
- Charts: Recharts
- Tooling: Biome

## Struktur Project (Peta Folder)

- `src/app/*` : Next.js App Router (routes/layout/pages)
- `src/components/ui/*` : komponen UI (shadcn/ui + tambahan internal)
- `src/components/data-table/*` : sistem DataTable reusable
- `src/hooks/*` : hooks reusable
- `src/lib/*` : utilitas umum, theme/prefs storage, fonts
- `src/stores/preferences/*` : Zustand store/provider preferences
- `src/navigation/sidebar/*` : config-driven sidebar
- `src/styles/presets/*` : theme preset CSS
- `src/scripts/*` : theme boot + preset generator
- `src/server/*` : server actions (cookie)
- `src/data/*` : dummy data

## Routing & Layout (App Router)

Entry points penting:

- Root layout: `src/app/layout.tsx`
  - set default `data-*` pada `<html>` dari `PREFERENCE_DEFAULTS`
  - inject `ThemeBootScript` agar theme/layout preference diterapkan sebelum hydration
  - wrap app dengan `PreferencesStoreProvider`
  - render `Toaster`
- Global CSS + theme variables: `src/app/globals.css`
- Route `/` redirect ke dashboard: `src/app/(external)/page.tsx` (redirect ke `/dashboard/default`)
- Redirect `/dashboard -> /dashboard/default`: `next.config.mjs`

Dashboard shell:

- Dashboard layout (server component): `src/app/(main)/dashboard/layout.tsx`
  - membaca cookie `sidebar_state` (open/close)
  - membaca preferences SSR-critical via `getPreference(...)`:
    - `sidebar_variant`
    - `sidebar_collapsible`

Contoh halaman dashboard:

- `src/app/(main)/dashboard/default/page.tsx`
- `src/app/(main)/dashboard/crm/page.tsx`
- `src/app/(main)/dashboard/finance/page.tsx`
- Template settings: `src/app/(main)/dashboard/settings/page.tsx`

Auth UI-only:

- `src/app/(main)/auth/v1/*`
- `src/app/(main)/auth/v2/*`

## Theme Preset & Preferences System (Wajib Dipahami)

Project ini memakai sistem preferences custom berbasis:

- `.dark` class pada `<html>` untuk resolved dark mode
- `data-*` attributes pada `<html>` untuk theme/layout/font
- CSS variables di `src/app/globals.css` + override preset di `src/styles/presets/*.css`

### Atribut HTML yang digunakan

`src/app/layout.tsx` memasang (default) atribut berikut:

- `data-theme-mode` (`light|dark|system`)
- `data-theme-preset` (mis. `default|brutalist|soft-pop|tangerine`)
- `data-content-layout` (`centered|full-width`)
- `data-navbar-style` (`sticky|scroll`)
- `data-sidebar-variant` (`sidebar|inset|floating`)
- `data-sidebar-collapsible` (`icon|offcanvas`)
- `data-font` (lihat `src/lib/fonts/registry.ts`)

Nilai aktual yang dipakai user diterapkan sebelum hydration oleh:

- `src/scripts/theme-boot.tsx`

### Default & persistence

- Defaults: `src/lib/preferences/preferences-config.ts` (`PREFERENCE_DEFAULTS`)
- Persistence per-key: `src/lib/preferences/preferences-config.ts` (`PREFERENCE_PERSISTENCE`)
  - `client-cookie`, `server-cookie`, `localStorage`, `none`

Penulisan ke storage:

- `src/lib/preferences/preferences-storage.ts` (`persistPreference(key, value)`)

### Apply helpers

- Theme:
  - `src/lib/preferences/theme-utils.ts`
    - `applyThemeMode(mode)` (toggle `.dark`, set `data-theme-mode`)
    - `applyThemePreset(value)` (set `data-theme-preset`)
- Layout + font:
  - `src/lib/preferences/layout-utils.ts`
    - `applyContentLayout`, `applyNavbarStyle`, `applySidebarVariant`, `applySidebarCollapsible`, `applyFont`

### Zustand store (client)

- Store: `src/stores/preferences/preferences-store.ts`
- Provider: `src/stores/preferences/preferences-provider.tsx`

Provider ini melakukan:

- membaca snapshot DOM (`data-*` attributes + `.dark`) agar state client sinkron dengan hasil boot script
- subscribe ke perubahan theme mode `system` (matchMedia)

### Theme preset registry (untuk dropdown preset)

- Registry values ada di `src/lib/preferences/theme.ts` (bagian `THEME_PRESET_OPTIONS`, generated)
- Generator:
  - `src/scripts/generate-theme-presets.ts`
  - scan `src/styles/presets/*.css` untuk `label:` / `value:` dan warna `--primary` (light/dark)
  - inject ke `src/lib/preferences/theme.ts`

## UI Rules (Theme-Safe)

Ikuti aturan di `rulesUI.md`.

Inti aturan:

- Jangan hardcode warna untuk surface/text/border.
- Gunakan token shadcn/tailwind yang sudah terhubung ke CSS variables (`bg-background`, `text-foreground`, `border-border`, dll).
- Jangan reimplement theme switcher; gunakan preferences system yang ada.
- Jika butuh layout-aware styling, gunakan selector `[html[data-...]]`.

## Komponen/Hooks Reusable yang Sudah Ada (Jangan Buat Ulang)

Bagian ini adalah daftar "first place to look" sebelum membuat sesuatu yang baru.

### 1) UI primitives (shadcn/ui)

Folder: `src/components/ui/*`

Gunakan komponen di sini terlebih dahulu untuk:

- Button, Card, Dialog, Drawer, DropdownMenu, Select, Tabs, Table, Tooltip, Accordion, dll.

Catatan:

- `src/components/ui/sidebar.tsx` adalah komponen sidebar (shadcn v4) yang jadi fondasi shell dashboard.
- `src/components/ui/chart.tsx` adalah wrapper Recharts yang sudah theme-aware.
- `src/components/ui/sonner.tsx` digunakan oleh root layout untuk toast.

### 2) Forms

Wrapper React Hook Form:

- `src/components/ui/form.tsx`
  - exports: `Form`, `FormField`, `FormItem`, `FormLabel`, `FormControl`, `FormMessage`, dll.

Layout helper untuk field:

- `src/components/ui/field.tsx`
  - `FieldSet`, `FieldGroup`, `FieldLabel`, `FieldDescription`, `FieldError`, dll.

Input addons:

- `src/components/ui/input-group.tsx`
  - `InputGroup`, `InputGroupAddon`, `InputGroupInput`, `InputGroupButton`, dll.

Contoh implementasi RHF + Zod:

- `src/app/(main)/auth/_components/login-form.tsx`

### 3) Data table system (TanStack Table)

Sebelum membuat table baru, gunakan modul yang sudah ada:

Hook untuk create table instance:

- `src/hooks/use-data-table-instance.ts`
  - handle sorting/filtering/pagination/visibility/rowSelection
  - `getRowId` wajib diberikan (untuk type-safety dan menghindari asumsi `id`)

Renderer table:

- `src/components/data-table/data-table.tsx`
  - props: `{ table, columns }`

Komponen pendukung:

- `src/components/data-table/data-table-column-header.tsx` (sort menu + hide)
- `src/components/data-table/data-table-pagination.tsx`
- `src/components/data-table/data-table-view-options.tsx` (toggle column visibility)

### 4) Charts

Gunakan wrapper yang sudah ada:

- `src/components/ui/chart.tsx`
  - `ChartContainer`, `ChartTooltipContent`, `ChartLegendContent`, dll.

Gunakan CSS variables untuk warna (theme-safe), hindari hardcode palette.

## Sidebar & Navigation

Definisi menu sidebar:

- `src/navigation/sidebar/sidebar-items.ts`

Renderer nav:

- `src/app/(main)/dashboard/_components/sidebar/nav-main.tsx`

Sidebar shell:

- `src/app/(main)/dashboard/_components/sidebar/app-sidebar.tsx`
- `src/components/ui/sidebar.tsx`

Cara menambah menu baru:

1. Buat route page baru di `src/app/(main)/dashboard/<slug>/page.tsx`
2. Tambahkan item ke `src/navigation/sidebar/sidebar-items.ts`

Catatan:

- Di `nav-main.tsx` badge "Soon" masih memakai warna hardcoded (`bg-gray-200`). Jika ingin 100% theme-safe, refactor ke token theme.

## Server Actions & Cookies

File: `src/server/server-actions.ts`

Exports:

- `getValueFromCookie(key)`
- `setValueToCookie(key, value, opts?)`
- `getPreference(key, allowed, fallback)` (validated read untuk SSR)

Dipakai oleh `src/app/(main)/dashboard/layout.tsx` untuk SSR layout-critical preferences.

## Utilities yang Sudah Ada

- `src/lib/utils.ts`
  - `cn(...inputs)`
  - `getInitials(str)`
  - `formatCurrency(amount, opts?)`

- Fonts:
  - `src/lib/fonts/registry.ts` (registry + `fontVars`)

- Client storage:
  - `src/lib/cookie.client.ts`
  - `src/lib/local-storage.client.ts`

## Tooling & Conventions

- ESLint config: `eslint.config.mjs`
- Prettier config: `.prettierrc.json`
- `src/components/ui` di-exclude dari rule ESLint spesifik project

- Next config: `next.config.mjs`
  - `reactCompiler: true`
  - remove console di production
  - redirect `/dashboard` -> `/dashboard/default`

Konvensi penempatan komponen:

- Komponen per-feature biasanya di folder `_components` berdampingan dengan `page.tsx`.
  - contoh: `src/app/(main)/dashboard/finance/_components/*`

## Recipes (Patterns to Copy)

Bagian ini berisi pola implementasi yang sudah terbukti bekerja di repo ini.
Saat Agent AI diminta membuat fitur/halaman/komponen baru, pilih recipe yang sesuai dan tiru polanya.

### 1) Membuat halaman dashboard baru

Lokasi yang disarankan:

- `src/app/(main)/dashboard/<feature>/page.tsx`
- Komponen pendukung: `src/app/(main)/dashboard/<feature>/_components/*`

Pola wrapper umum (mengikuti halaman yang sudah ada):

```tsx
export default function Page() {
  return <div className="@container/main flex flex-col gap-4 md:gap-6">{/* content */}</div>;
}
```

Contoh referensi:

- `src/app/(main)/dashboard/default/page.tsx`
- `src/app/(main)/dashboard/crm/page.tsx`

### 2) Menambah item menu di sidebar

- Update config di `src/navigation/sidebar/sidebar-items.ts`.
- Untuk menu bertingkat, pakai `subItems` (lihat bagian Authentication).

Renderer sidebar sudah ada, jadi jangan bikin sidebar baru:

- `src/app/(main)/dashboard/_components/sidebar/app-sidebar.tsx`
- `src/app/(main)/dashboard/_components/sidebar/nav-main.tsx`

### 3) Pola DataTable (TanStack Table)

Gunakan modul yang sudah ada (jangan membuat data table baru):

- Hook instance: `src/hooks/use-data-table-instance.ts`
- Renderer: `src/components/data-table/data-table.tsx`
- Pagination: `src/components/data-table/data-table-pagination.tsx`
- View options (toggle columns): `src/components/data-table/data-table-view-options.tsx`

Pola minimal:

```tsx
import { DataTable } from "@/components/data-table/data-table";
import { DataTablePagination } from "@/components/data-table/data-table-pagination";
import { DataTableViewOptions } from "@/components/data-table/data-table-view-options";
import { useDataTableInstance } from "@/hooks/use-data-table-instance";

const table = useDataTableInstance({
  data,
  columns,
  getRowId: (row) => row.id.toString(),
});

return (
  <>
    <div className="flex items-center justify-end gap-2">
      <DataTableViewOptions table={table} />
    </div>
    <div className="overflow-hidden rounded-md border">
      <DataTable table={table} columns={columns} />
    </div>
    <DataTablePagination table={table} />
  </>
);
```

Contoh referensi:

- `src/app/(main)/dashboard/default/_components/data-table.tsx` (view options + pagination)
- `src/app/(main)/dashboard/crm/_components/table-cards.tsx` (table di Card)

### 4) Pola Charts (Recharts + theme-safe)

Gunakan wrapper chart yang sudah ada:

- `src/components/ui/chart.tsx` (`ChartContainer`, `ChartTooltipContent`, `ChartLegendContent`)

Gunakan CSS variables untuk warna, bukan hardcode palette:

- `var(--chart-1)` sampai `var(--chart-5)`

Contoh referensi:

- `src/app/(main)/dashboard/default/_components/chart-area-interactive.tsx`

### 5) Pola Form (React Hook Form + Zod)

Gunakan form wrapper yang sudah ada:

- `src/components/ui/form.tsx`

Pattern:

- define Zod schema
- `useForm({ resolver: zodResolver(schema) })`
- compose `FormField` + `FormItem` + `FormControl` + `FormMessage`

Contoh referensi:

- `src/app/(main)/auth/_components/login-form.tsx`

### 6) Pola Preferences/Settings UI

Jika membuat UI untuk mengubah preferences (theme/layout/font):

- Apply ke DOM (helper): `src/lib/preferences/theme-utils.ts`, `src/lib/preferences/layout-utils.ts`
- Update Zustand store: `usePreferencesStore` dari `src/stores/preferences/preferences-provider.tsx`
- Persist: `persistPreference` dari `src/lib/preferences/preferences-storage.ts`

Contoh referensi:

- Full settings page: `src/app/(main)/dashboard/settings/_components/settings-page.tsx`
- Quick controls (popover) di header: `src/app/(main)/dashboard/_components/sidebar/layout-controls.tsx`

### 7) Membaca preferences di server (SSR)

Jika server component/layout perlu preference value yang valid:

- pakai `getPreference(key, allowed, fallback)` dari `src/server/server-actions.ts`

Contoh referensi:

- `src/app/(main)/dashboard/layout.tsx` (membaca `sidebar_variant` dan `sidebar_collapsible`)

### 8) Menambah theme preset baru

1. Buat file CSS preset: `src/styles/presets/<preset>.css`
2. Tambahkan header comment:
   - `label: Nama Preset`
   - `value: preset-key`
3. Define light + dark selector:
   - `:root[data-theme-preset="preset-key"] { ... }`
   - `.dark:root[data-theme-preset="preset-key"] { ... }`
4. Import preset di `src/app/globals.css`
5. Run `pnpm generate:presets` untuk update `src/lib/preferences/theme.ts`

## Pitfalls / Gotchas untuk Agent AI

- Jangan menambah sistem theme baru. Ikuti preferences system yang ada.
- Banyak dependency tersedia tapi belum dipakai (mis. axios, react-query). Jika ingin pakai, buat integrasinya dengan pola yang jelas (provider, folder `src/lib`, dsb), jangan setengah-setengah.
- Ada lebih dari satu lockfile dalam repo; gunakan PNPM sebagai standard (sesuai instruksi user).

## Do Not Reinvent (Checklist Cepat)

Sebelum membuat sesuatu yang baru, cek dulu:

- UI primitives: `src/components/ui/*`
- Form wrappers: `src/components/ui/form.tsx`, `src/components/ui/field.tsx`, `src/components/ui/input-group.tsx`
- Data table: `src/hooks/use-data-table-instance.ts` + `src/components/data-table/*`
- Theme/prefs: `src/lib/preferences/*` + `src/scripts/theme-boot.tsx` + `src/stores/preferences/*`
- Sidebar nav config: `src/navigation/sidebar/sidebar-items.ts`

Jika ternyata belum ada yang setara, baru buat komponen baru (theme-safe) dan tempatkan mengikuti konvensi folder.
