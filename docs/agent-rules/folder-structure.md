# Structure Folder Rules

## Tujuan
Dokumen ini adalah source of truth untuk struktur folder project.
Semua agent wajib mengikuti aturan ini saat menambah route, komponen, query, mutation, business logic, dan integrasi eksternal.

Tujuan struktur ini:
- `src/app` tetap tipis dan fokus pada routing serta composition UI.
- business logic utama hidup di `src/modules`.
- admin tetap menjadi layer dashboard, bukan duplikasi domain utama.
- junior programmer tetap mudah menebak file yang harus dibuka.

## Prinsip Inti
- `src/app` hanya untuk route Next.js, layout, route handler, dan route-local components.
- business logic tidak boleh hidup di `page.tsx`, `layout.tsx`, `route.ts`, atau client component.
- domain utama hidup di `src/modules/<domain>`.
- mulai dari struktur sederhana, baru pecah saat ada alasan nyata.
- komponen route-local yang kompleks boleh dipecah ke subfolder agar tetap mudah dibaca.
- nama file di subfolder komponen harus eksplisit dan konsisten.

## Tree Reference
Tree ini hanya contoh struktur inti. Bukan daftar lengkap seluruh file.

```txt
src/
|- app/
|  |- (public)/
|  |- (member)/
|  |- (admin)/
|  |- api/
|  |- layout.tsx
|  |- not-found.tsx
|  `- globals.css
|- modules/
|  |- auth/
|  |  |- actions.ts
|  |  |- services.ts
|  |  |- repositories.ts
|  |  |- schemas.ts
|  |  `- types.ts
|  |- sessions/
|  |  |- services.ts
|  |  |- repositories.ts
|  |  |- schemas.ts
|  |  `- types.ts
|  |- users/
|  |  |- actions.ts
|  |  |- services.ts
|  |  |- repositories.ts
|  |  |- schemas.ts
|  |  `- types.ts
|  |- packages/
|  |- assets/
|  |- subscriptions/
|  |- transactions/
|  |- cdkeys/
|  |- console/
|  |  |- queries.ts
|  |  |- services.ts
|  |  `- types.ts
|  |- extension/
|  |  |- services.ts
|  |  |- repositories.ts
|  |  |- schemas.ts
|  |  `- types.ts
|  `- admin/
|     |- dashboard/
|     |  |- queries.ts
|     |  `- types.ts
|     |- users/
|     |  |- queries.ts
|     |  |- actions.ts
|     |  `- types.ts
|     |- assets/
|     |  |- queries.ts
|     |  |- actions.ts
|     |  `- types.ts
|     `- shared/
|        |- schemas.ts
|        `- types.ts
|- components/
|  |- ui/
|  `- shared/
|- lib/
|  |- insforge/
|  |  |- browser-client.ts
|  |  |- server-client.ts
|  |  |- admin-client.ts
|  |  |- auth.ts
|  |  |- database.ts
|  |  |- storage.ts
|  |  `- types.ts
|  |- safe-action/
|  |  `- client.ts
|  |- utils.ts
|  |- dates.ts
|  |- money.ts
|  |- cookies.ts
|  |- pagination.ts
|  `- response.ts
|- config/
`- types/
```

## Tanggung Jawab Folder

### `src/app`
- Hanya untuk file konvensi Next.js seperti `page.tsx`, `layout.tsx`, `loading.tsx`, `error.tsx`, `not-found.tsx`, dan `route.ts`.
- Boleh berisi `_components` yang spesifik untuk route itu.
- `page.tsx` hanya boleh:
  - membaca params atau session
  - memanggil `queries.ts` atau `services.ts` dari `src/modules`
  - melakukan `redirect()` atau `notFound()` bila perlu
  - merender UI
- `route.ts` hanya untuk:
  - endpoint extension
  - endpoint cron tepercaya
- UI web internal tidak boleh membuat REST endpoint baru jika bisa memakai Server Component atau Server Action.

### `src/modules/<domain>`
- Ini adalah rumah utama business logic domain.
- Struktur default dimulai sederhana dengan file tunggal per layer.
- Tidak semua domain wajib punya semua file. Tambahkan hanya jika diperlukan.

### `src/modules/admin/*`
- Ini adalah layer dashboard admin.
- Dipakai untuk read model admin, filter admin, pagination admin, dan action admin yang spesifik dashboard.
- Tidak boleh menjadi tempat duplikasi business logic inti.
- Action admin harus memanggil domain utama seperti `users/services.ts`, `assets/services.ts`, atau `subscriptions/services.ts`.

### `src/components/ui`
- Hanya untuk UI primitives dan reusable building blocks.
- Tidak boleh berisi business logic.

### `src/components/shared`
- Untuk komponen presentational yang dipakai lintas route atau lintas domain.
- Tidak boleh melakukan akses DB langsung.

### `src/lib`
- Berisi utility shared dan infrastructure adapter lintas domain.
- Yang boleh disimpan di `src/lib`:
  - formatter tanggal
  - formatter Rupiah
  - helper pagination generic
  - parser user-agent generic
  - shared `next-safe-action` setup di `src/lib/safe-action/client.ts`
  - shared InsForge client atau adapter di `src/lib/insforge/*`
- Yang tidak boleh disimpan di `src/lib`:
  - aktivasi subscription
  - revoke session user
  - validasi akses extension
  - fulfillment asset
  - business logic domain lain apa pun

### `src/lib/insforge`
- Rumah untuk shared client dan adapter SDK InsForge.
- Contoh isi yang boleh:
  - browser client
  - server client
  - admin client
  - wrapper auth, database, dan storage
- Tidak boleh berisi business logic domain.
- Jangan membuat client InsForge langsung di `page.tsx`, `route.ts`, atau client component.

### `src/lib/safe-action`
- Rumah untuk shared setup `next-safe-action`.
- File utamanya adalah `src/lib/safe-action/client.ts`.
- Isi folder ini boleh mencakup:
  - `actionClient`
  - middleware umum
  - helper error formatting umum
- Tidak boleh berisi action domain seperti login, create package, atau toggle asset.

## Arti File di Module

### `actions.ts`
- Berisi Server Actions untuk mutation dari UI web.
- Tugas utama:
  - validasi input dengan `schemas.ts`
  - panggil `services.ts`
  - kembalikan hasil ke UI
- Tidak boleh berisi query DB besar langsung.
- Jangan buat `actions.ts` di module yang tidak membutuhkannya.
- Jika project memakai `next-safe-action`, definisi action domain tetap disimpan di `src/modules/<domain>/actions.ts`.
- Shared factory seperti `actionClient` atau middleware builder disimpan di `src/lib/safe-action/client.ts`, bukan di `src/app` dan bukan di domain tertentu.
- `actions.ts` boleh mengimpor `actionClient` dari `src/lib/safe-action/client.ts`.

### `services.ts`
- Berisi business logic utama domain.
- Semua aturan inti PRD harus hidup di sini atau di DB function yang dipanggil lewat `repositories.ts`.
- Boleh memanggil beberapa repository.
- Tidak boleh tahu detail render UI.

### `repositories.ts`
- Berisi akses data murni ke tabel, view, RPC, atau client InsForge.
- Tidak boleh mengambil keputusan bisnis yang kompleks.
- Jika memakai InsForge, `repositories.ts` harus menggunakan client dari `src/lib/insforge/*`, bukan membuat client baru sendiri.

### `schemas.ts`
- Berisi schema `zod` untuk form, filter, params, payload, atau body request.

### `types.ts`
- Berisi type lokal domain.
- Jika type sudah generic lintas domain, baru pindahkan ke `src/types`.

### `queries.ts`
- Dipakai untuk read model atau composed read.
- Default untuk `console` dan `modules/admin/*`.
- Di domain utama, `queries.ts` bersifat opsional. Tambahkan hanya jika kebutuhan baca mulai kompleks dan tidak cocok ditaruh di `services.ts`.

## Rule Komponen Route-Local

### Komponen kecil
- Jika komponen masih kecil dan mudah dibaca, simpan sebagai satu file di `_components`.

### Komponen kompleks
- Jika komponen mulai kompleks, ubah menjadi subfolder baru di dalam `_components`.
- Rule ini berlaku bukan hanya untuk table, tetapi untuk komponen apa pun yang mulai besar.
- Pecah berdasarkan concern UI, misalnya:
  - table
  - columns
  - toolbar
  - row actions
  - form sections
  - tabs
  - dialog sections

### Naming di folder komponen
- Semua nama file di dalam folder komponen harus memakai prefix nama komponen atau nama feature.
- Jangan gunakan nama generik seperti:
  - `columns.tsx`
  - `table.tsx`
  - `toolbar.tsx`
  - `schema.ts`
  - `types.ts`
- Gunakan nama eksplisit seperti:
  - `users-table.tsx`
  - `users-columns.tsx`
  - `users-toolbar.tsx`
  - `users-row-actions.tsx`
  - `users-types.ts`
- Jika folder komponennya bernama `asset-detail-dialog`, gunakan pola seperti:
  - `asset-detail-dialog.tsx`
  - `asset-detail-tabs.tsx`
  - `asset-detail-sections.tsx`
  - `asset-detail-types.ts`

### Contoh
```txt
src/app/(admin)/admin/users/_components/
|- users-page.tsx
|- users-filter-bar.tsx
|- user-form-dialog.tsx
`- users-table/
   |- users-table.tsx
   |- users-columns.tsx
   |- users-toolbar.tsx
   |- users-row-actions.tsx
   `- users-types.ts
```

## Dependency Rules
- `src/app` boleh import dari:
  - `src/modules`
  - `src/components`
  - `src/lib`
  - `src/config`
  - `src/hooks`
  - `src/navigation`
  - `src/types`
- `src/app` tidak boleh menjadi sumber import untuk folder lain.
- `src/modules/*` boleh import dari:
  - `src/lib`
  - `src/config`
  - `src/types`
  - module domain lain jika dependency-nya jelas
- `src/modules/admin/*` boleh memanggil domain utama seperti `users`, `assets`, `packages`, `subscriptions`, `transactions`, dan `cdkeys`.
- `src/components/*` tidak boleh import `repositories.ts` atau client admin InsForge.
- `src/lib` tidak boleh import dari `src/modules`.
- `src/lib/insforge/*` dan `src/lib/safe-action/*` tidak boleh import dari `src/app`.

## Kapan Boleh Dipecah Lebih Lanjut

### Pecah file module
Pecah file tunggal menjadi subfolder hanya jika salah satu kondisi ini terjadi:
- file lebih dari sekitar 300 sampai 400 baris dan mulai sulit dibaca
- satu file berisi 3 atau lebih kelompok concern yang berbeda
- beberapa function di file itu sudah jelas membentuk kelompok use case terpisah

Contoh evolusi bertahap:

```txt
modules/
`- users/
   |- actions/
   |  |- create-user.ts
   |  |- update-user.ts
   |  `- ban-user.ts
   |- services/
   |  |- user-service.ts
   |  `- password-service.ts
   |- repositories/
   |  |- user-repository.ts
   |  `- profile-repository.ts
   |- schemas.ts
   `- types.ts
```

Jangan memecah lebih awal hanya karena ingin terlihat rapi atau canggih.

### Tambahkan `dto` atau `mapper`
`dto` dan `mapper` tidak wajib dari awal.

Tambahkan hanya jika:
- satu shape output dipakai di banyak tempat
- transformasi data mulai panjang dan berulang
- hasil query sudah cukup jauh berbeda dari bentuk raw data
- `queries.ts` atau `services.ts` mulai sulit dibaca karena terlalu banyak mapping

Jika belum ada alasan kuat, jangan buat `dto` dan `mapper`.

## Contoh Penempatan

### Halaman `/admin/assets`
- Route file: `src/app/(admin)/admin/assets/page.tsx`
- Route-local UI: `src/app/(admin)/admin/assets/_components/*`
- Jika tabel asset kompleks, gunakan folder `assets-table/*`
- Read model admin: `src/modules/admin/assets/queries.ts`
- Action admin: `src/modules/admin/assets/actions.ts`
- Business logic asset: `src/modules/assets/services.ts`
- Akses DB asset: `src/modules/assets/repositories.ts`

### Flow login
- Route file: `src/app/(public)/login/page.tsx`
- Form components: `src/app/(public)/login/_components/*`
- Action login: `src/modules/auth/actions.ts`
- Business logic login: `src/modules/auth/services.ts`
- Session persistence: `src/modules/sessions/services.ts`
- Akses DB auth atau session: `src/modules/auth/repositories.ts` dan `src/modules/sessions/repositories.ts`

### Endpoint extension session
- Route file: `src/app/api/extension/session/route.ts`
- Validasi payload: `src/modules/extension/schemas.ts`
- Guard dan service extension: `src/modules/extension/services.ts`
- Akses DB atau RPC extension: `src/modules/extension/repositories.ts`

### Halaman `/console`
- Route file: `src/app/(member)/console/page.tsx`
- Read model console: `src/modules/console/queries.ts`
- Mutation redeem atau extend tetap hidup di domain utama seperti `subscriptions/actions.ts`, `transactions/actions.ts`, atau `cdkeys/actions.ts`

## Larangan Wajib
- Jangan menulis query database langsung di React client component.
- Jangan menulis business logic inti di `page.tsx`, `layout.tsx`, atau `route.ts`.
- Jangan memanggil client admin InsForge dari browser.
- Jangan membuat folder global `services/` yang mencampur semua domain.
- Jangan memakai `src/lib` untuk menyimpan logic domain.
- Jangan menaruh endpoint UI web internal di `/api/*` jika bisa memakai Server Component atau Server Action.
- Jangan import dari `src/app` ke `src/modules` atau `src/lib`.
- Jangan menambah `dto` dan `mapper` tanpa alasan yang jelas.

## Checklist Saat Menambah Fitur
1. Tentukan domain utamanya.
2. Tambahkan route di `src/app` hanya jika memang menghasilkan URL baru.
3. Simpan komponen khusus halaman di `_components` route tersebut.
4. Simpan mutation di `actions.ts`.
5. Simpan business rule di `services.ts`.
6. Simpan akses DB dan RPC di `repositories.ts`.
7. Simpan validasi input di `schemas.ts`.
8. Simpan type lokal domain di `types.ts`.
9. Jika fiturnya khusus admin, gunakan `modules/admin/<feature>/*` sebagai layer dashboard.
10. Jika komponen route-local mulai besar, pecah ke folder dengan nama file yang tetap eksplisit.

## Checklist Review Struktur
- apakah `src/app` tetap tipis
- apakah query dan mutation sudah keluar dari route
- apakah `repositories.ts` bebas dari business logic berat
- apakah `services.ts` menjadi tempat aturan bisnis utama
- apakah `modules/admin/*` tetap tipis dan tidak menduplikasi domain utama
- apakah komponen kompleks sudah dipecah dengan nama file yang konsisten
- apakah junior programmer masih bisa menebak file yang harus dibuka tanpa banyak berpikir

## Prioritas Saat Ragu
1. Pilih struktur yang paling sederhana tetapi masih benar.
2. Jaga `src/app` tetap tipis.
3. Simpan aturan bisnis di domain utama.
4. Gunakan `modules/admin/*` hanya sebagai layer dashboard admin.
5. Tambahkan file atau folder baru hanya jika ada alasan nyata.
