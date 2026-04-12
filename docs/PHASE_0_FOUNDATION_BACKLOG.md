# Phase 0 Foundation Backlog
## Tujuan
Dokumen ini memecah `Phase 0` dari `docs/IMPLEMENTATION_PLAN.md` menjadi backlog implementasi yang konkret, berurutan, dan file-by-file. Fokus phase ini bukan menyelesaikan flow auth penuh, tetapi menyiapkan fondasi agar Phase 1 dan phase berikutnya bisa dibangun tanpa membongkar arsitektur lagi.

## Goal Phase 0
Setelah Phase 0 selesai:
- route shell baru `(public)`, `(member)`, dan `(admin)` sudah menjadi jalur utama app
- root layout dan providers sudah siap dipakai feature nyata
- adapter InsForge, safe action, dan react-query sudah tersedia
- contract session `app_session` sudah terkunci di server-side layer
- browser smoke test dasar sudah bisa dijalankan berulang
- repo tidak lagi bergantung pada tree demo `(main)` sebagai fondasi product code

## Batas Phase 0
Yang wajib selesai di phase ini:
- fondasi route dan layout
- fondasi env dan dependency
- fondasi session contract
- fondasi provider app
- fondasi adapter InsForge
- fondasi server-side path untuk auth dan session
- harness smoke test browser

Yang belum wajib selesai di phase ini:
- flow login, register, dan reset password penuh
- UI final `/console`
- UI final `/admin`
- CRUD admin apa pun
- extension API production-ready

## Current Repo Impact
Repo saat ini masih didominasi struktur template. Phase 0 harus memperlakukan file berikut sebagai legacy yang akan diganti atau dipindahkan dari jalur utama implementasi:
- `src/app/(main)/auth/**`
- `src/app/(main)/dashboard/**`
- `src/app/(external)/page.tsx`
- `src/server/server-actions.ts`
- `src/proxy.disabled.ts`
- metadata template di `src/config/app-config.ts`

Phase 0 tidak harus langsung menghapus semua legacy file di hari pertama. Namun, route utama baru tidak boleh bergantung pada tree `(main)` atau helper lama tersebut.

## Task Backlog
- [ ] `P0.1` Lock dependency dan env contract.
  Target: `package.json`, `pnpm-lock.yaml`, `.env.example`, `src/config/env.server.ts`, `src/config/env.client.ts`, `src/config/app-config.ts`.
  Depends on: tidak ada.
  Work: tambahkan dependency fondasi yang belum ada, minimal `next-safe-action`, `@tanstack/react-query`, paket SDK InsForge yang benar-benar akan dipakai project, dan tool E2E yang dipilih. Buat `.env.example`, `src/config/env.server.ts`, dan `src/config/env.client.ts` sebagai typed runtime contract. Pisahkan env private server-only dari env `NEXT_PUBLIC_*` agar boundary client tetap aman. Kunci kategori env yang dibutuhkan: database runtime, koneksi InsForge browser-safe, credential server/admin, secret session, allowlist extension, secret cron, dan trusted IP/geo header config. Gunakan raw extension ID untuk `EXTENSION_ALLOWED_IDS` dan origin `chrome-extension://...` untuk `EXTENSION_ALLOWED_ORIGINS`. Ganti branding dan metadata template di `APP_CONFIG` agar tidak lagi memakai identitas `Studio Admin`.
  Acceptance: repo punya contract env yang fail-fast saat nilai wajib belum ada, dependency fondasi Phase 0 sudah tercatat di `package.json`, dan metadata app tidak lagi menyebut template dashboard bawaan.

- [ ] `P0.2` Bentuk route topology baru untuk product app.
  Target: `src/app/layout.tsx`, `src/app/(public)/layout.tsx`, `src/app/(public)/login/page.tsx`, `src/app/(public)/reset-password/page.tsx`, `src/app/(member)/layout.tsx`, `src/app/(member)/console/page.tsx`, `src/app/(admin)/layout.tsx`, `src/app/(admin)/admin/page.tsx`, opsional `src/app/unauthorized/page.tsx`.
  Depends on: `P0.1`.
  Work: buat route group final sesuai `docs/agent-rules/folder-structure.md`. Root `src/app/layout.tsx` tetap menjadi layout global. Halaman `/login`, `/reset-password`, `/console`, dan `/admin` harus sudah ada sebagai shell awal. Jangan lagi memakai path `auth/v1`, `auth/v2`, atau dashboard demo sebagai entry point user. Jika butuh halaman unauthorized, letakkan pada path final yang akan dipakai nanti, bukan tetap bergantung pada `src/app/(main)/unauthorized/page.tsx`.
  Acceptance: membuka `/login`, `/reset-password`, `/console`, dan `/admin` sudah masuk ke shell route baru, bukan ke halaman demo `(main)`.

- [ ] `P0.3` Rapikan root providers tanpa mematahkan preference system yang sudah ada.
  Target: `src/app/layout.tsx`, `src/components/shared/app-providers.tsx`, opsional `src/components/shared/query-provider.tsx`.
  Depends on: `P0.1`, `P0.2`.
  Work: pertahankan `ThemeBootScript`, `PreferencesStoreProvider`, `TooltipProvider`, dan `Toaster` yang sudah ada di root app, lalu bungkus dengan provider baru untuk react-query dan provider shared lain yang memang dibutuhkan seluruh app. Jangan menaruh DB logic di provider. Jika perlu memecah root wiring agar `src/app/layout.tsx` tetap tipis, pindahkan composition provider ke `src/components/shared/app-providers.tsx`.
  Acceptance: root layout tetap stabil, preferensi theme/layout lama tidak rusak, dan provider react-query sudah siap dipakai halaman admin nantinya.

- [ ] `P0.4` Bangun adapter InsForge sebagai satu-satunya pintu masuk SDK.
  Target: `src/lib/insforge/browser-client.ts`, `src/lib/insforge/server-client.ts`, `src/lib/insforge/admin-client.ts`, `src/lib/insforge/auth.ts`, `src/lib/insforge/database.ts`, `src/lib/insforge/storage.ts`, `src/lib/insforge/types.ts`.
  Depends on: `P0.1`.
  Work: bangun wrapper browser, server, dan admin client sesuai folder rules. File server/admin wajib diberi boundary server-only. Seluruh akses SDK selanjutnya harus lewat folder ini, bukan instantiate client langsung dari `page.tsx`, `route.ts`, atau client component. `admin-client.ts` hanya boleh dipakai server-side untuk flow yang memang butuh trusted path, terutama auth/admin writes dan session lifecycle yang tidak bisa bergantung pada akses tabel biasa karena RLS.
  Acceptance: repo punya satu lapisan adapter InsForge yang jelas dan siap dipakai modules, tanpa kebocoran credential ke browser.

- [ ] `P0.5` Kunci contract session `app_session` dan trusted auth/session write path.
  Target: `src/modules/auth/types.ts`, `src/modules/auth/schemas.ts`, `src/modules/auth/repositories.ts`, `src/modules/auth/services.ts`, `src/modules/sessions/types.ts`, `src/modules/sessions/schemas.ts`, `src/modules/sessions/repositories.ts`, `src/modules/sessions/services.ts`, `src/lib/cookies.ts`.
  Depends on: `P0.1`, `P0.4`.
  Work: definisikan contract session yang mengikuti baseline SQL: cookie `app_session` membawa opaque token, database hanya menyimpan `token_hash`, validasi session dilakukan lewat hash lookup, revocation dilakukan dengan mengisi `revoked_at`, dan invariant satu session aktif tunduk pada unique partial index `app_sessions`. Kunci juga trusted server-side write path untuk login, logout, create session, revoke session, touch `last_seen_at`, dan tulis `login_logs`. Jangan arahkan implementasi Phase 1 ke akses tabel langsung dari browser karena baseline RLS tidak mengizinkan lifecycle ini dijalankan secara naif dari client.
  Acceptance: desain session sudah tertulis jelas di code structure, hash-based session path sudah diputuskan, dan modules Phase 1 punya fondasi yang benar untuk login/logout.

- [ ] `P0.6` Siapkan shared activation boundary untuk seluruh source subscription.
  Target: `src/modules/subscriptions/types.ts`, `src/modules/subscriptions/schemas.ts`, `src/modules/subscriptions/repositories.ts`, `src/modules/subscriptions/services.ts`, opsional `src/modules/transactions/{types.ts,repositories.ts,services.ts}`, opsional `src/modules/cdkeys/{types.ts,repositories.ts,services.ts}`.
  Depends on: `P0.4`.
  Work: Phase 0 belum perlu menyelesaikan UI subscription, tetapi harus mengunci satu shared activation service server-side yang nanti dipakai bersama oleh `payment_dummy`, `cdkey`, dan `admin_manual`. Service ini harus menjadi tempat rule `is_extended`, one-running-subscription invariant, revoke-before-replace, dan konsistensi `transaction + subscription` dipusatkan. Hindari tiga implementasi terpisah per source karena itu akan mudah drift dari PRD.
  Acceptance: ada satu boundary service yang jelas untuk aktivasi subscription lintas source, walau UI Phase 4 sampai 6 belum selesai.

- [ ] `P0.7` Siapkan read path foundation yang memanfaatkan baseline RPC yang sudah ada.
  Target: `src/modules/console/queries.ts`, `src/modules/console/types.ts`, `src/modules/admin/dashboard/queries.ts`, `src/modules/admin/dashboard/types.ts`.
  Depends on: `P0.4`.
  Work: siapkan query layer awal untuk `/console` dan `/admin` dengan preferensi memakai helper baseline bila sesuai kebutuhan: `get_user_console_snapshot(uuid)`, `get_user_asset_detail(uuid, uuid)`, dan `get_admin_dashboard_stats(from, to)`. Tujuannya bukan merender UI final sekarang, tetapi memastikan fondasi read model tidak berjalan liar dengan query mentah yang mengabaikan helper runtime yang sudah disediakan migration.
  Acceptance: read path sensitif punya rumah yang jelas di `src/modules`, dan keputusan memakai RPC baseline sudah terkunci sebelum Phase 6 dan Phase 9 dimulai.

- [ ] `P0.8` Bangun guard server-side untuk member dan admin shell.
  Target: `src/app/(member)/layout.tsx`, `src/app/(admin)/layout.tsx`, opsional `src/modules/users/{types.ts,repositories.ts,services.ts}`.
  Depends on: `P0.2`, `P0.5`.
  Work: layout `(member)` dan `(admin)` harus memakai helper server-side untuk membaca session aktif, memuat profile atau role, lalu melakukan redirect bila user tidak punya akses. Jangan memakai credential admin di browser. Jika perlu profile lookup, buat rumahnya di module yang benar, bukan di `page.tsx`. Shell `/console` dan `/admin` cukup placeholder tipis pada phase ini, tetapi guard-nya harus final secara arsitektur.
  Acceptance: direct URL access ke `/console` dan `/admin` sudah tunduk pada guard server-side yang benar.

- [ ] `P0.9` Putuskan strategi update `last_seen_at` dan `requestNonce` lebih awal.
  Target: `src/modules/sessions/services.ts`, `src/modules/sessions/repositories.ts`, `src/modules/extension/types.ts`, `src/modules/extension/schemas.ts`, `src/modules/extension/repositories.ts`, `src/modules/extension/services.ts`.
  Depends on: `P0.4`, `P0.5`.
  Work: baseline SQL punya `app_sessions.last_seen_at` tetapi tidak meng-update field ini secara otomatis. Kunci sekarang kapan session harus di-touch, minimal pada request atau page load terautentikasi yang relevan, agar `Live User` di Phase 9 tidak buntu. Di saat yang sama, karena migration tidak menyediakan penyimpanan nonce, kunci desain `requestNonce` yang session-bound, valid 60 detik, dan bisa divalidasi ulang di Phase 11. Phase 0 tidak harus mengirim extension API penuh, tetapi desainnya harus diputuskan sekarang.
  Acceptance: ada keputusan implementasi yang jelas untuk `last_seen_at` dan `requestNonce`, bukan area abu-abu yang ditunda sampai akhir project.

- [ ] `P0.10` Pindahkan helper lama yang salah rumah dan matikan dependensi ke tree demo.
  Target: `src/server/server-actions.ts`, `src/lib/preferences/preferences-storage.ts`, `src/app/(main)/dashboard/layout.tsx`, route legacy di `src/app/(main)/**`, `src/app/(external)/page.tsx`.
  Depends on: `P0.2`, `P0.3`, `P0.5`.
  Work: helper cookie generik yang sekarang hidup di `src/server/server-actions.ts` harus dipindahkan ke rumah yang sesuai, misalnya `src/lib/cookies.ts`, agar Phase 1 dan seterusnya tidak menambah debt baru. Setelah route baru siap, legacy route demo harus diputus dari jalur utama implementasi. Jika belum dihapus, tandai jelas sebagai template legacy yang tidak lagi dipakai untuk product flow.
  Acceptance: product app tidak lagi bergantung pada helper dan route demo lama untuk bekerja.

- [ ] `P0.11` Tambahkan harness E2E browser dasar.
  Target: `package.json`, `playwright.config.ts`, `tests/e2e/phase-0-smoke.spec.ts`, opsional `tests/e2e/helpers/**`.
  Depends on: `P0.1`, `P0.2`, `P0.8`.
  Work: pasang Playwright sebagai harness smoke test minimal untuk Phase 0. Tambahkan script yang jelas di `package.json`, misalnya untuk smoke run headless dan UI mode lokal. Spec awal cukup memverifikasi bahwa `/login` dan `/reset-password` render, `/console` dan `/admin` menolak guest, dan route shell baru tidak error. Ini penting agar semua phase berikutnya bisa menambah test di jalur yang sama, bukan memulai dari nol di tengah project.
  Acceptance: ada satu command yang dapat menjalankan browser smoke test dasar Phase 0 secara repeatable.

- [ ] `P0.12` Dokumentasikan workflow setup yang benar untuk dev browser testing.
  Target: `docs/PHASE_0_FOUNDATION_BACKLOG.md`, `README.md`, `docs/IMPLEMENTATION_PLAN.md`.
  Depends on: `P0.1`, `P0.11`.
  Work: tulis langkah real setup untuk developer: apply migration `001-030`, pastikan `auth.users` tersedia, apply `040`, apply `041`, jalankan app dengan `DATABASE_URL` runtime yang benar, dan jalankan smoke test browser. Catat juga bahwa verifikasi browser harus mengacu ke database runtime app, bukan database tooling yang kebetulan aktif.
  Acceptance: developer baru dapat menyiapkan baseline browser-loginable environment tanpa menebak urutan seed atau target database.

## Suggested Execution Order
1. `P0.1` Lock dependency dan env contract
2. `P0.2` Bentuk route topology baru
3. `P0.3` Rapikan root providers
4. `P0.4` Bangun adapter InsForge
5. `P0.5` Kunci contract session dan trusted auth/session path
6. `P0.6` Siapkan shared activation boundary
7. `P0.7` Siapkan read path foundation
8. `P0.8` Bangun guard server-side
9. `P0.9` Putuskan strategi `last_seen_at` dan `requestNonce`
10. `P0.10` Matikan dependensi ke helper dan route demo lama
11. `P0.11` Tambahkan harness E2E browser dasar
12. `P0.12` Dokumentasikan workflow setup developer

## Exit Gate Phase 0
Phase 0 baru dianggap lulus jika seluruh kondisi ini sudah benar:
- `/login` render dari route baru
- `/reset-password` render dari route baru
- guest yang membuka `/console` ditolak atau diarahkan ke auth flow
- guest yang membuka `/admin` ditolak atau diarahkan ke auth flow
- root layout baru sudah memuat provider yang akan dipakai app final
- session contract `app_session` sudah jelas, hash-based, dan siap diimplementasikan pada Phase 1
- jalur trusted server-side untuk auth/session tidak bertentangan dengan baseline RLS
- Playwright smoke test dasar bisa dijalankan berulang

## Browser Smoke Checklist
- [ ] buka `/login` dan pastikan tidak ada runtime error
- [ ] buka `/reset-password` dan pastikan tidak ada runtime error
- [ ] akses `/console` tanpa login dan pastikan guest tidak bisa masuk
- [ ] akses `/admin` tanpa login dan pastikan guest tidak bisa masuk
- [ ] reload setiap route shell baru dan pastikan tidak ada hydration error atau crash

## Catatan Praktis
- jangan implementasikan Phase 1 di atas `src/app/(main)/auth/**`
- jangan implementasikan shell admin final di atas `src/app/(main)/dashboard/**`
- jangan menunda keputusan `app_session`, `last_seen_at`, atau `requestNonce` sampai Phase 9 atau Phase 11
- jangan buat client InsForge langsung di route atau component; pakai `src/lib/insforge/*`
- jangan membangun flow auth dengan asumsi bisa menulis `app_sessions` atau `login_logs` langsung dari browser
