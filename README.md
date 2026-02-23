# Next Shadcn Admin Dashboard Boilerplate

Boilerplate admin dashboard untuk Next.js App Router yang siap dipakai ke real project.

Fokus boilerplate ini:
- UI konsisten lintas theme preset, light/dark/system, dan layout preference.
- Struktur fitur tetap rapi dengan pola colocation.
- Komponen/hook/utilitas reusable agar tim tidak reinvent dari nol.

## Quick Start

Gunakan PNPM sebagai standar di repo ini.

```bash
pnpm i
pnpm dev
```

Aplikasi berjalan di `http://localhost:3000`.

Script utama:

```bash
pnpm dev
pnpm build
pnpm start
pnpm lint
pnpm format
pnpm check
pnpm check:fix
pnpm generate:presets
```

Catatan penting:
- Husky pre-commit menjalankan `pnpm generate:presets` dan auto-add `src/lib/preferences/theme.ts`.

## Tech Stack

- Next.js 16 App Router
- React 19 + TypeScript
- Tailwind CSS v4
- shadcn/ui
- Zustand
- React Hook Form + Zod
- TanStack Table
- Recharts
- Biome + Husky

## Peta Folder

- `src/app/*`: routes, layouts, pages
- `src/components/ui/*`: primitive UI shadcn + komponen internal
- `src/components/data-table/*`: DataTable reusable
- `src/hooks/*`: reusable hooks
- `src/lib/*`: utilities, preferences, fonts, storage helper
- `src/stores/preferences/*`: Zustand store/provider preferences
- `src/navigation/sidebar/*`: config sidebar
- `src/styles/presets/*`: preset CSS
- `src/scripts/*`: theme boot + generator preset registry
- `src/server/*`: server actions (cookie/preference SSR)
- `src/data/*`: dummy data

## Routing dan Layout

Entry penting:
- Root layout: `src/app/layout.tsx`
- Global CSS + token: `src/app/globals.css`
- Redirect `/` ke dashboard default: `src/app/(external)/page.tsx`
- Redirect `/dashboard` ke `/dashboard/default`: `next.config.mjs`

Di `src/app/layout.tsx`:
- Default `data-*` pada `<html>` diambil dari `PREFERENCE_DEFAULTS`.
- `ThemeBootScript` dijalankan sebelum hydration.
- App dibungkus `PreferencesStoreProvider`.
- Toaster dirender global.

Dashboard shell:
- `src/app/(main)/dashboard/layout.tsx` membaca cookie `sidebar_state`.
- Layout SSR-critical membaca preference valid via `getPreference(...)`.

Contoh route bawaan:
- `src/app/(main)/dashboard/default/page.tsx`
- `src/app/(main)/dashboard/crm/page.tsx`
- `src/app/(main)/dashboard/finance/page.tsx`
- `src/app/(main)/dashboard/settings/page.tsx`
- `src/app/(main)/auth/v1/*`
- `src/app/(main)/auth/v2/*`

## Theme Preset dan Preferences

Sistem ini berbasis:
- `.dark` pada `<html>` untuk resolved dark mode
- atribut `data-*` pada `<html>` untuk mode/preset/layout/font
- CSS variables di `src/app/globals.css` + override di `src/styles/presets/*.css`

Atribut HTML yang dipakai:
- `data-theme-mode`: `light | dark | system`
- `data-theme-preset`: contoh `default | brutalist | soft-pop | tangerine`
- `data-content-layout`: `centered | full-width`
- `data-navbar-style`: `sticky | scroll`
- `data-sidebar-variant`: `sidebar | inset | floating`
- `data-sidebar-collapsible`: `icon | offcanvas`
- `data-font`: lihat `src/lib/fonts/registry.ts`

Konfigurasi:
- Default: `src/lib/preferences/preferences-config.ts` (`PREFERENCE_DEFAULTS`)
- Persistence per key: `src/lib/preferences/preferences-config.ts` (`PREFERENCE_PERSISTENCE`)
- Storage writer: `persistPreference(...)` di `src/lib/preferences/preferences-storage.ts`

Helper apply preference:
- Theme: `src/lib/preferences/theme-utils.ts`
- Layout/font: `src/lib/preferences/layout-utils.ts`

Zustand preferences:
- Store: `src/stores/preferences/preferences-store.ts`
- Provider: `src/stores/preferences/preferences-provider.tsx`
- Provider membaca snapshot DOM supaya client state sinkron dengan hasil boot script.
- Provider subscribe ke perubahan system theme (`matchMedia`).

Theme preset registry:
- Daftar preset final ada di `src/lib/preferences/theme.ts`.
- Dibangkitkan oleh `src/scripts/generate-theme-presets.ts` dari `src/styles/presets/*.css`.

## UI Rules Wajib

### Source of truth

- Token CSS dan mapping ada di `src/app/globals.css`.
- Preset aktif lewat selector `html[data-theme-preset=...]`.
- Preferences diterapkan pre-hydration lewat `src/scripts/theme-boot.tsx`.

### Warna

Gunakan token, jangan hardcode warna umum.

Gunakan:
- `bg-background text-foreground`
- `bg-card text-card-foreground`
- `bg-popover text-popover-foreground`
- `bg-primary text-primary-foreground`
- `bg-secondary text-secondary-foreground`
- `bg-muted text-muted-foreground`
- `bg-accent text-accent-foreground`
- `border-border`
- `focus-visible:ring-ring/50`
- `focus-visible:border-ring`
- `outline-ring/50`

Hindari:
- `bg-white`, `text-black`
- `text-zinc-*`, `bg-slate-*`, `border-gray-*`
- warna hardcoded hex/rgb/hsl untuk surface/text utama

### Komponen

- Prioritaskan komponen di `src/components/ui/*`.
- Gunakan `cn(...)` dari `src/lib/utils.ts` untuk merge class.

### Theme switching

- Jangan toggle `.dark` manual.
- Jangan buat sistem theme switcher baru.
- Ambil state dari store jika dibutuhkan di client:
  - `usePreferencesStore((s) => s.themeMode)`
  - `usePreferencesStore((s) => s.resolvedThemeMode)`
  - `usePreferencesStore((s) => s.themePreset)`

### Layout-aware styling

Untuk menyesuaikan preference layout, gunakan selector berbasis atribut html.
Contoh:
- `[html[data-content-layout=centered]_&]:mx-auto`
- `[html[data-content-layout=centered]_&]:max-w-screen-2xl`
- `[html[data-navbar-style=sticky]_&]:sticky`
- `[html[data-navbar-style=sticky]_&]:top-0`

### SSR vs client

- Preference layout-critical (lihat `LAYOUT_CRITICAL_KEYS`) harus dibaca di server via `getPreference()`.
- Jika hanya untuk interaksi client, gunakan `usePreferencesStore(...)`.

### Chart dan font

- Chart wajib pakai `var(--chart-1)` sampai `var(--chart-5)`.
- Jangan set `font-family` langsung di komponen.

## Reusable Building Blocks (Jangan Reinvent)

UI primitives:
- `src/components/ui/*`
- khusus penting: `src/components/ui/sidebar.tsx`, `src/components/ui/chart.tsx`, `src/components/ui/sonner.tsx`

Forms:
- `src/components/ui/form.tsx`
- `src/components/ui/field.tsx`
- `src/components/ui/input-group.tsx`
- contoh: `src/app/(main)/auth/_components/login-form.tsx`

Data table:
- hook: `src/hooks/use-data-table-instance.ts`
- renderer: `src/components/data-table/data-table.tsx`
- pagination: `src/components/data-table/data-table-pagination.tsx`
- column toggle: `src/components/data-table/data-table-view-options.tsx`
- column header util: `src/components/data-table/data-table-column-header.tsx`

Utilities:
- `src/lib/utils.ts` (`cn`, `getInitials`, `formatCurrency`)
- `src/lib/fonts/registry.ts`
- `src/lib/cookie.client.ts`
- `src/lib/local-storage.client.ts`

## Recipes Implementasi Real Project

### 1) Buat halaman dashboard baru

Lokasi:
- `src/app/(main)/dashboard/<feature>/page.tsx`
- `src/app/(main)/dashboard/<feature>/_components/*`

Wrapper pattern umum:

```tsx
export default function Page() {
  return <div className='@container/main flex flex-col gap-4 md:gap-6'>{/* content */}</div>
}
```

### 2) Tambah menu sidebar

1. Tambah route halaman.
2. Update `src/navigation/sidebar/sidebar-items.ts`.
3. Gunakan `subItems` untuk menu bertingkat.

Renderer sidebar sudah ada:
- `src/app/(main)/dashboard/_components/sidebar/app-sidebar.tsx`
- `src/app/(main)/dashboard/_components/sidebar/nav-main.tsx`

### 3) Pola DataTable

Gunakan hook + komponen yang sudah ada dan selalu set `getRowId`.

```tsx
const table = useDataTableInstance({
  data,
  columns,
  getRowId: (row) => row.id.toString(),
})
```

Contoh lengkap:
- `src/app/(main)/dashboard/default/_components/data-table.tsx`
- `src/app/(main)/dashboard/crm/_components/table-cards.tsx`

### 4) Pola form

Gunakan Zod + RHF + wrapper `src/components/ui/form.tsx`.

### 5) Pola chart

Gunakan `ChartContainer` dan teman-temannya dari `src/components/ui/chart.tsx`.

### 6) Preferences/settings UI

Saat membuat UI settings:
- apply ke DOM via helper theme/layout
- update Zustand store
- persist via `persistPreference`

Contoh:
- `src/app/(main)/dashboard/settings/_components/settings-page.tsx`
- `src/app/(main)/dashboard/_components/sidebar/layout-controls.tsx`

### 7) Baca preference di SSR

Gunakan:
- `getPreference(key, allowed, fallback)` di `src/server/server-actions.ts`

Exports lain di file yang sama:
- `getValueFromCookie(key)`
- `setValueToCookie(key, value, opts?)`

### 8) Tambah preset baru

1. Tambah `src/styles/presets/<preset>.css`
2. Tambah header comment `label` dan `value`
3. Definisikan selector light + dark
4. Import di `src/app/globals.css`
5. Jalankan `pnpm generate:presets`

## Konvensi dan Tooling

- Biome config: `biome.json`
- `useSortedClasses` aktif
- `src/components/ui` dikecualikan dari pemaksaan style/lint tertentu
- `next.config.mjs`:
  - `reactCompiler: true`
  - remove `console` di production
  - redirect `/dashboard` ke `/dashboard/default`
- Konvensi feature component: simpan di folder `_components` di samping `page.tsx`

## Pitfalls yang Perlu Dihindari

- Jangan menambah sistem theme baru.
- Jangan bikin ulang DataTable/Form/Sidebar kalau sudah ada komponen reusable.
- Repo punya beberapa lockfile, tapi standar kerja yang dipakai adalah PNPM.
- Ada dependency yang belum dipakai (contoh axios, react-query). Jika dipakai, integrasikan penuh dengan pola jelas, jangan parsial.
- Catatan saat ini: badge `Soon` di `src/app/(main)/dashboard/_components/sidebar/nav-main.tsx` masih hardcoded `bg-gray-200`.

## Do Not Reinvent Checklist

Sebelum bikin file/komponen baru, cek dulu:
- UI primitives: `src/components/ui/*`
- Form wrappers: `src/components/ui/form.tsx`, `src/components/ui/field.tsx`, `src/components/ui/input-group.tsx`
- DataTable: `src/hooks/use-data-table-instance.ts` + `src/components/data-table/*`
- Theme/preferences: `src/lib/preferences/*`, `src/scripts/theme-boot.tsx`, `src/stores/preferences/*`
- Sidebar config: `src/navigation/sidebar/sidebar-items.ts`

## Checklist Sebelum Go-Live

- Tidak ada hardcoded color untuk surface/text/border utama.
- Semua screen utama mengikuti token theme-safe.
- Route dan sidebar sinkron.
- Form tervalidasi dan error state jelas.
- DataTable mengikuti stack reusable bawaan.
- Preference SSR-critical dibaca via `getPreference`.
- Preset brand diuji di light dan dark.
- `pnpm check` dan `pnpm build` lolos.

## Panduan Migrasi dari Boilerplate ke Produk

Urutan kerja yang direkomendasikan:
1. Kunci modul MVP yang akan live pertama.
2. Bentuk data layer dan kontrak API/domain.
3. Implement satu modul end-to-end sebagai golden path.
4. Jadikan modul itu template untuk fitur berikutnya.
5. Uji konsistensi theme/mode/layout sebelum scale-out.
