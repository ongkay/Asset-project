# Agent Rules

Catatan penting:
- repo ini masih membawa sisa template dashboard. Jangan jadikan struktur `(main)` atau halaman demo lama sebagai source of truth product
- untuk build product baru, arahkan implementasi ke route group `(public)`, `(member)`, `(admin)`, dan `api` sesuai dokumen struktur folder
- jangan memperkenalkan HeroUI sebagai fondasi baru. Repo dan PRD saat ini mengarah ke Tailwind + primitive UI yang sudah ada di repo

## Architecture and Reuse
Wajib ikuti `docs/agent-rules/folder-structure.md`.

Aturan inti:
- `src/app/**` hanya untuk route, layout, loading, error, not-found, route handlers, dan route-local `_components`
- business logic utama harus hidup di `src/modules/<domain>`
- layer admin dashboard hidup di `src/modules/admin/**` dan tidak boleh menduplikasi business logic inti
- shared UI lintas route harus diletakkan di `src/components/**`
- shared infra teknis harus diletakkan di `src/lib/**`
- shared InsForge adapter harus diletakkan di `src/lib/insforge/**`
- shared `next-safe-action` setup harus diletakkan di `src/lib/safe-action/**`
- jangan membuat struktur `features/` flat besar atau `src/server/**` baru yang bertentangan dengan baseline repo

Konvensi file domain:
- `actions.ts` untuk Server Actions mutation
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
Semua perubahan UI wajib mengikuti `docs/agent-rules/ui-ux-rules.md`.

Aturan inti:
- prioritas token dan theme selalu mengikuti `src/app/globals.css`
- untuk authenticated app, gunakan bahasa visual dashboard demo di `src/app/(main)/dashboard/*` sebagai referensi bentuk, bukan source of truth data atau copy
- reuse primitive yang sudah ada di `src/components/ui/**` sebelum membuat primitive baru
- jangan membuat UI asal jadi, layout generik, atau copy yang terasa demo/template
- semua UI baru harus tetap responsif, accessible, dan konsisten di desktop maupun mobile

## Quality Gate
Pekerjaan belum selesai sebelum semua gate yang relevan hijau.

Gate yang benar-benar tersedia di repo saat ini:
- `pnpm lint`
- `pnpm build`
- `pnpm check`
- `pnpm markdown:check` jika mengubah dokumen Markdown di `docs/*`
- browser verification untuk flow yang terdampak menggunakan `agent-browser`
- Next.js DevTools MCP tidak menunjukkan error runtime atau compilation yang relevan

## Required Skills and Tooling
Skill dan tooling berikut wajib digunakan jika relevan terhadap tugas.

### Skills
- `next-best-practices` untuk semua perubahan Next.js, App Router, Server Actions, route handlers, metadata, caching, dan RSC boundary
- `find-docs` saat membutuhkan referensi library pihak ketiga di luar dokumentasi Next.js resmi
- `ui-ux-pro-max` saat merancang, mengubah, mengoptimalkan, atau mereview UI/UX
- `shadcn` saat bekerja dengan shadcn/ui, primitive UI, atau komponen registry yang sudah ada di repo
- `agent-browser` untuk verifikasi browser flow, UI behavior, dan E2E yang terdampak
- `insforge` saat menulis atau mereview integrasi frontend/client dengan SDK InsForge
- `insforge-cli` saat menangani operasi backend InsForge seperti schema, SQL, storage, functions, deployment, secrets, atau diagnostics
- `insforge-debug` saat menangani error, bug, atau issue performa yang terkait InsForge
- `insforge-integrations` saat menghubungkan provider auth pihak ketiga ke InsForge

Gunakan skill tambahan hanya jika konteksnya memang cocok. Jangan memanggil skill yang tidak relevan.

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
