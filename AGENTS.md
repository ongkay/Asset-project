## Project Source of Truth
Dokumen berikut adalah acuan utama project ini. Jangan membuat asumsi yang bertentangan dengan dokumen-dokumen ini.
- `docs/PRD.md` untuk business rules, user flow, admin flow, dan kontrak API extension
- `docs/DB.md` untuk schema, relasi, constraint, dan invariant data
- `docs/IMPLEMENTATION_PLAN.md` untuk urutan phase, delivery E2E, dan browser test gate
- `docs/agent-rules/folder-structure.md` untuk struktur folder, boundary import, dan penempatan code
- `migrations/README.md` untuk urutan apply migration, dependency seed, dan runtime notes baseline SQL

Jika ada konflik:
- business rules mengikuti `docs/PRD.md`
- schema, RLS, trigger, RPC, dan invariant database mengikuti `docs/DB.md` dan `migrations/*.sql`
- struktur file mengikuti `docs/agent-rules/folder-structure.md`
- urutan delivery phase mengikuti `docs/IMPLEMENTATION_PLAN.md`

## Project Technical Baseline
Stack resmi yang dipakai proyek ini. Jangan ganti stack atau pola utamanya tanpa konfirmasi eksplisit.
- **Framework**: Next.js `v16.x` latest dengan App Router dan Server Actions
- **Package Manager**: `pnpm` only. Jangan gunakan `npm` atau `yarn`
- **UI & Styling**: `tailwindcss v4.x` + primitive yang sudah ada di `src/components/ui/**` + pattern shadcn yang sudah terpasang di repo
- **Form & Validation**: `react-hook-form v7.x` + `zod v4.x`
- **State**: Zustand `v5.x` bila memang perlu state client yang persisten
- **Table & Client Read State**: TanStack Table `v8.x` + TanStack React Query `v5.x`
- **Target Server Actions Wrapper**: `next-safe-action` sesuai PRD. Jika package belum terpasang, tambahkan pada Phase 0, jangan ganti dengan pattern lain
- **Backend**: InsForge untuk Auth, Database, dan Storage
- **Browser Verification**: gunakan skill `agent-browser` untuk verifikasi flow browser dan E2E. Jangan default ke Playwright untuk verifikasi manual flow project ini

Catatan penting:
- repo ini masih membawa sisa template dashboard. Jangan jadikan struktur `(main)` atau halaman demo lama sebagai source of truth product
- untuk build product baru, arahkan implementasi ke route group `(public)`, `(member)`, `(admin)`, dan `api` sesuai dokumen struktur folder
- jangan memperkenalkan HeroUI sebagai fondasi baru. Repo dan PRD saat ini mengarah ke Tailwind + primitive UI yang sudah ada di repo

## Delivery Mode
Project ini dikerjakan per phase secara vertical slice E2E.
- ikuti `docs/IMPLEMENTATION_PLAN.md`
- setiap phase harus selesai end-to-end sebelum membuka phase berikutnya
- setiap phase wajib punya `write path`, `read path`, dan `negative path`
- setiap phase harus bisa diuji langsung dari browser
- jangan menyatakan feature selesai jika baru selesai di UI atau baru selesai di database saja
- jika suatu phase butuh infrastruktur tambahan, masukkan ke phase itu atau Phase 0, jangan ditunda tanpa dicatat

## Architecture and Reuse
Wajib ikuti `docs/agent-rules/folder-structure.md`.

Aturan inti:
- `src/app/**` hanya untuk route Next.js, layout, loading, error, not-found, route handlers, dan route-local `_components`
- business logic utama harus hidup di `src/modules/**`, bukan di `page.tsx`, `layout.tsx`, `route.ts`, atau client component
- domain utama hidup di `src/modules/<domain>`
- layer dashboard admin hidup di `src/modules/admin/**` dan tidak boleh menduplikasi business logic inti
- shared UI lintas route harus diletakkan di `src/components/**`
- shared infra teknis harus diletakkan di `src/lib/**`
- shared InsForge adapter harus diletakkan di `src/lib/insforge/**`
- shared `next-safe-action` setup harus diletakkan di `src/lib/safe-action/**`
- jangan membuat struktur `features/` flat besar atau `src/server/**` baru yang bertentangan dengan folder baseline project ini

Konvensi file domain:
- `actions.ts` untuk Server Actions mutation dari UI web
- `services.ts` untuk business logic domain
- `repositories.ts` untuk akses data ke tabel, view, RPC, atau adapter InsForge
- `schemas.ts` untuk schema Zod input/filter/payload
- `types.ts` untuk type lokal domain
- `queries.ts` untuk read model yang memang perlu dipisah

Import boundary wajib dijaga:
- client component tidak boleh import code server-only
- `src/modules/**` tidak boleh import dari `src/app/**`
- `src/lib/**` tidak boleh import dari `src/modules/**`
- `src/components/**` tidak boleh import `repositories.ts` atau admin client InsForge
- `src/lib/insforge/**` dan `src/lib/safe-action/**` tidak boleh import dari `src/app/**`

## Data, Auth, and Runtime Rules
Project ini tidak berjalan di atas Postgres polos biasa. Baseline runtime harus mengikuti migration dan RLS yang sudah ada.

Aturan inti:
- baseline migration hanya valid pada database yang sudah memiliki schema `auth.users`
- plain local Postgres tanpa schema auth tidak cukup untuk baseline project ini
- apply migration mengikuti urutan di `migrations/README.md`
- `041_dev_seed_loginable_users.sql` bergantung pada `040_dev_seed_full.sql`
- verifikasi manual harus selalu mengacu ke database yang dipakai runtime app melalui `DATABASE_URL`

Aturan auth dan session:
- cookie session web dan extension wajib bernama `app_session`
- cookie membawa opaque token; database hanya menyimpan `token_hash`
- jangan simpan token mentah ke `app_sessions`
- validasi session dilakukan dengan hash lookup ke `app_sessions`
- revoke session dilakukan dengan mengisi `revoked_at`
- invariant satu user satu session aktif harus mengikuti partial unique index baseline
- login, logout, session creation, session revoke, dan login log write harus lewat trusted server-side path yang sesuai dengan RLS baseline
- jangan mencoba menulis `app_sessions` atau `login_logs` langsung dari browser atau melalui akses tabel biasa yang melanggar RLS

Aturan activation dan subscription:
- source aktivasi hanya `payment_dummy`, `cdkey`, dan `admin_manual`
- semua source aktivasi harus menghasilkan `transaction` dan `subscription` yang konsisten
- rule `is_extended` harus identik di ketiga source tersebut
- implementasi aktivasi harus memakai shared activation service tunggal di app layer; jangan membuat tiga versi logic yang berbeda
- satu user tidak boleh punya dua subscription berjalan `active` atau `processed` pada saat yang sama

Aturan read path dan RPC:
- jika baseline SQL sudah menyediakan helper RPC yang sesuai, prioritaskan memakainya untuk read path sensitif
- helper penting yang sudah tersedia antara lain:
  - `get_user_console_snapshot(uuid)`
  - `get_user_asset_detail(uuid, uuid)`
  - `get_admin_dashboard_stats(timestamptz, timestamptz)`

Aturan background dan liveness:
- `app_sessions.last_seen_at` harus disentuh dari flow server-side yang terautentikasi agar fitur `Live User` bisa akurat
- cron reconciliation harus berjalan minimal tiap 1 menit
- wiring runtime harus menghubungkan:
  - `expire_subscriptions_job()`
  - `reconcile_invalid_assets_job()`
  - `recheck_subscription_after_asset_change(asset_id)` saat disable asset

Aturan extension API:
- hanya `/api/extension/*` dan endpoint cron tepercaya yang boleh hidup di bawah `/api/*`
- `requestNonce` untuk extension adalah app-layer concern; baseline migration tidak menyediakan tabel/helper nonce bawaan
- source allowlist `x-extension-id` dan `Origin` harus datang dari config runtime yang eksplisit, bukan hardcoded tersebar di banyak file
- source metadata `ip`, `city`, dan `country` harus jelas dan trusted

## Non-Negotiables
- gunakan `pnpm` saja
- gunakan Next.js App Router saja
- form fitur wajib memakai `react-hook-form` + `zod`
- semua input eksternal wajib divalidasi dengan Zod dan error message yang jelas
- semua mutasi sensitif wajib berjalan di server-side
- action fitur web app targetnya memakai `next-safe-action`; jika belum terpasang, tambah di Phase 0, jangan buat wrapper ad-hoc yang berbeda arah
- `@tanstack/react-query` hanya untuk query/read state di client, bukan untuk mutation fitur
- jangan gunakan React Query di Server Components atau sebagai default data loading semua halaman
- UI web internal tidak boleh membuka REST endpoint publik baru di luar kebutuhan extension API dan trusted cron
- query dan mutation admin harus berjalan server-side dengan session user admin biasa, bukan credential database istimewa di browser
- jangan mengganti stack inti, folder baseline, boundary arsitektur, atau phase order tanpa konfirmasi eksplisit

## Engineering Rules
Semua perubahan harus:
- sekecil mungkin tetapi benar
- mudah dibaca tanpa perlu menebak intent
- rapi dan konsisten secara struktur, spacing, dan naming
- konsisten dengan struktur folder repo
- type-safe end-to-end
- mudah dikembangkan ke depan
- tidak menambah abstraction, helper, atau layer baru tanpa alasan jelas

Aturan ringkas:
- gunakan TypeScript strict
- hindari `any`
- hindari `unknown` untuk kontrak domain final
- utamakan type yang diturunkan dari schema
- gunakan penamaan yang eksplisit, mudah dipahami, dan menjelaskan intent
- hindari nama generik yang kabur seperti `data`, `item`, `temp`, `value2`, `handleSubmit`, atau `onSubmit` jika ada nama yang lebih spesifik
- untuk event handler, action handler, dan form handler, gunakan nama berbasis use case atau intent, misalnya `onSubmitRegister`, `onSubmitLogin`, `handleRedeemCdKey`, atau `handleDisableAsset`
- gunakan early return
- hindari nested logic yang terlalu dalam
- satu file satu tanggung jawab utama, kecuali memang ada alasan kuat untuk tetap digabung
- komentar hanya jika logic tidak langsung obvious
- utamakan perubahan kecil pada file yang tepat daripada refactor besar yang tidak diminta
- ikuti pola repo dan dokumen arsitektur sebelum memperkenalkan pola baru
- jika script kualitas yang diwajibkan target project belum ada, jangan pura-pura menjalankannya; tambahkan script itu di Phase 0 atau nyatakan dengan jelas bahwa gate tersebut belum tersedia

## UI Rules
Semua perubahan UI harus mengikuti design UI yang jelas, disengaja, dan konsisten dengan visual language proyek.

Aturan inti:
- reuse primitive yang sudah ada di `src/components/ui/**` sebelum membuat primitive baru
- jangan membuat UI asal jadi, layout generik, atau pola visual yang terasa tempelan
- jika bekerja dalam area UI yang sudah ada, pertahankan pattern, density, spacing, radius, typography, dan tone visual yang sudah dipakai
- jika membuat UI baru, gunakan fondasi Tailwind + primitive repo yang sudah ada dan tetap responsif, accessible, serta konsisten di desktop maupun mobile
- semua state penting pada UI harus jelas: default, hover, focus, active, disabled, loading, empty, dan error bila relevan
- hindari visual noise, dekorasi yang tidak membantu UX, dan komponen yang terlihat bagus tetapi membingungkan saat dipakai
- utamakan kejelasan informasi, hierarchy, dan usability dibanding ornamen visual
- sesuaikan implementasi UI dengan `src/app/globals.css` dan jangan membuat styling yang bertentangan dengan token, theme, atau visual language global proyek
- untuk tabel admin, patuhi rule global PRD: search, filter dropdown, view column persistence, dan pagination
- jika tabel menampilkan user, tampilkan `avatar + username + email`
- jika `avatar_url = null`, tampilkan fallback avatar dari inisial username dengan warna yang konsisten per user
- semua perubahan UI yang relevan wajib bekerja baik di light mode maupun dark mode

## Quality Gate
Pekerjaan belum selesai sebelum semua gate yang relevan hijau.

Gate yang benar-benar tersedia di repo saat ini:
- `pnpm lint`
- `pnpm build`
- `pnpm check`
- `pnpm markdown:check` jika mengubah dokumen Markdown
- browser verification untuk flow yang terdampak menggunakan `agent-browser`
- Next.js DevTools MCP tidak menunjukkan error runtime atau compilation yang relevan

Gate target project setelah Phase 0 menambahkan script yang dibutuhkan:
- `pnpm lint`
- `pnpm typecheck`
- `pnpm build`
- `pnpm test` untuk unit dan integration yang relevan
- browser verification untuk flow yang terdampak menggunakan `agent-browser`
- Next.js DevTools MCP tidak menunjukkan error runtime atau compilation yang relevan

Aturan praktis:
- jangan klaim `typecheck` atau `test` sudah hijau jika script-nya belum ada
- jika tugas menyentuh fondasi repo, lebih baik tambahkan script/gate yang memang dibutuhkan daripada membiarkannya implisit
- jika sebuah phase punya browser checklist khusus di `docs/IMPLEMENTATION_PLAN.md`, checklist itu ikut menjadi gate kelulusan

## Required Skills and Tooling
Skill dan tooling berikut wajib digunakan jika relevan terhadap tugas.

### Skills
- `next-best-practices` untuk semua perubahan Next.js, App Router, Server Actions, route handlers, metadata, caching, dan RSC boundary
- `find-docs` saat membutuhkan referensi library pihak ketiga di luar dokumentasi Next.js resmi
- `ui-ux-pro-max` saat merancang, mengubah, mengoptimalkan, atau mereview UI/UX
- `insforge` saat menulis atau mereview integrasi frontend/client dengan SDK InsForge
- `insforge-cli` saat menangani operasi backend InsForge seperti schema, SQL, storage, functions, deployment, secrets, atau diagnostics
- `insforge-debug` saat menangani error, bug, atau issue performa yang terkait InsForge
- `insforge-integrations` saat menghubungkan provider auth pihak ketiga ke InsForge
- `agent-browser` untuk verifikasi browser flow, UI behavior, dan E2E yang terdampak

### MCP dan Tooling
- jalankan `next-devtools_init` di awal sesi kerja Next.js agar workflow dokumentasi dan tooling runtime aktif
- gunakan `next-devtools_nextjs_index` untuk menemukan server dev yang sedang berjalan dan tool runtime yang tersedia
- gunakan `next-devtools_nextjs_call` untuk inspeksi runtime, error, route, dan diagnosis app yang sedang berjalan
- untuk dokumentasi library pihak ketiga, gunakan skill `find-docs`; jangan mengandalkan ingatan model
- untuk tugas InsForge, gunakan skill `insforge`, `insforge-cli`, `insforge-debug`, atau `insforge-integrations` sesuai konteks; jangan membuat asumsi manual terhadap API atau schema
- untuk browser verification, utamakan skill `agent-browser`

<!-- BEGIN:nextjs-agent-rules -->
## Next.js-Specific Warning
Ini bukan Next.js lama. Versi ini memiliki breaking changes pada API, konvensi, dan struktur file.

Sebelum menulis atau mengubah code Next.js:
- baca dokumentasi Next.js yang relevan
- perhatikan deprecation notice dan perubahan behavior Next.js `v16`
- jangan mengandalkan pola lama jika bertentangan dengan dokumentasi versi yang dipakai proyek ini
<!-- END:nextjs-agent-rules -->
