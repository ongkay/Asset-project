# E2E-First Phase Plan

## 1. Tujuan
Dokumen ini adalah rencana implementasi resmi untuk membangun project dari nol sampai siap rilis dengan pendekatan phase-by-phase yang benar-benar end-to-end.

Aturan utamanya:
1. Setiap phase harus selesai lengkap dan usable.
2. Setiap phase harus lulus `lint`, `typecheck`, `build`, `unit`, `integration`, dan browser E2E sebelum lanjut ke phase berikutnya.
3. Browser E2E hanya dijalankan melalui browser agent, bukan test runner E2E di repo.
4. Jika ada error baru, phase dianggap belum selesai.

Dokumen ini diturunkan dari:
- `.docs/PRD.md`
- `.docs/DB.md`
- `.docs/agentRules/folder-structure.md`
- `migrations/README.md`

---

## 2. Prinsip Eksekusi

### 2.1. Execution Gate dan Dependency Rule
Phase tetap dipakai sebagai grouping scope produk, tetapi urutan eksekusi tidak lagi dikunci absolut oleh nomor phase.

Aturan utamanya:
- task atau subphase boleh dimulai paralel jika dependency langsungnya sudah memenuhi minimum gate
- dependency ditentukan oleh kontrak domain, route, dan regression impact, bukan hanya nomor phase
- downstream work tidak boleh mengandalkan file route-local, helper lokal, atau kontrak domain yang masih berubah liar di track paralel lain
- jika dua atau lebih track paralel akan dipakai bersama oleh phase berikutnya, phase berikutnya wajib menunggu convergence gate seluruh dependency langsungnya
- full exit gate phase tetap wajib untuk menutup phase, tetapi tidak selalu wajib sebelum track lain yang independen dimulai

### 2.2. Minimum Gate dan Exit Gate
Minimum gate dipakai agar suatu track bisa menjadi fondasi track lain yang bergantung padanya.

Minimum gate per track:
- `pnpm lint`
- `pnpm typecheck`
- targeted unit test untuk perubahan yang dibuat
- targeted integration test untuk domain yang disentuh
- tidak ada runtime error baru yang relevan
- tidak ada compilation error baru yang relevan
- browser verification hanya untuk route yang memang sudah usable pada track itu

Exit gate dipakai untuk menutup phase atau menutup convergence checkpoint.

Minimal exit gate per phase:
- `pnpm lint`
- `pnpm typecheck`
- `pnpm build`
- `pnpm test:unit`
- `pnpm test:integration`
- browser E2E checklist untuk phase itu
- browser E2E regression checklist phase yang menjadi dependency langsungnya

### 2.3. Parallel Execution Rule
Paralel diperbolehkan bila semua syarat berikut terpenuhi:
- perubahan berada pada route atau domain yang berbeda, atau kontrak shared-nya sudah cukup stabil
- import boundary tetap mengikuti `.docs/agentRules/folder-structure.md`
- regression impact yang terdampak sudah jelas dan dicatat di track tersebut
- owner task tidak saling menulis area route-local yang sama pada saat yang sama

Paralel tidak diperbolehkan bila salah satu kondisi berikut terjadi:
- dua track sama-sama mengubah kontrak domain yang sama tanpa urutan owner yang jelas
- downstream feature membutuhkan acceptance gabungan yang belum punya convergence gate
- perubahan memaksa shared abstraction baru yang belum disetujui hanya untuk mengatasi konflik paralel

### 2.4. Bentuk Test
**Unit test** dipakai untuk:
- schema Zod
- helper murni
- formatter
- mapper DTO
- kalkulasi periode dan status sederhana
- validator input

**Integration test** dipakai untuk:
- `src/server/**`
- Server Actions
- service multi-step
- query layer
- auth/session flow
- database function/view/RPC
- route handler `app/api/**`

**Browser E2E** dipakai untuk:
- flow user nyata
- redirect
- form submit
- dialog/modal
- table/filter/search/pagination
- perubahan state setelah mutation
- pengecekan browser console
- pengecekan error UI, loading, dan hasil akhir yang terlihat user

### 2.5. Browser E2E Rule
Aturan wajib untuk browser E2E:
- hanya memakai browser agent
- tidak membuat file Playwright/Vitest E2E di repo
- setiap skenario browser harus ditulis sebagai checklist di dokumen ini
- hasil browser E2E harus dicatat per phase saat eksekusi nyata
- untuk phase extension, browser agent tetap dipakai; validasi `chrome-extension://` asli membutuhkan precondition extension shell yang bisa dimuat ke browser agent

### 2.6. Ukuran Task
Agar cocok untuk junior developer atau agent AI yang lebih murah:
- satu task idealnya hanya menyentuh satu route utama
- satu task idealnya hanya menyentuh satu domain `src/server/<domain>/`
- satu task wajib membawa test unit dan integration minimum untuk perubahan yang dibuat
- shared component hanya dibuat jika benar-benar dipakai lintas route
- business logic tidak boleh ditaruh di `src/lib/`

### 2.7. PRD-Critical Rules yang Wajib Jadi Test Eksplisit
Rule berikut tidak boleh hanya dianggap implisit di service atau migration. Masing-masing harus muncul sebagai acceptance criteria atau regression test pada phase yang relevan:
- single-device login dan revoke session lama
- hanya satu subscription berjalan (`active` atau `processed`) pada satu waktu
- otorisasi asset selalu exact `platform + asset_type`
- subscription `processed` tetap memberi akses ke assignment yang sudah tersedia
- asset disabled atau expired langsung hilang dari read path aktif tanpa menunggu cron
- subscription `canceled` langsung mencabut assignment aktif dan memutus akses aktif
- asset `private` tidak pernah dipakai dua user aktif sekaligus
- asset `share` maksimal satu assignment aktif per user per platform
- package disabled memblokir pembelian baru dan assign manual baru, tetapi tidak merusak subscription aktif lama atau CD-Key lama yang sudah diterbitkan
- package disabled juga memblokir penerbitan CD-Key baru, tetapi tidak merusak CD-Key lama yang sudah diterbitkan
- hard delete asset tetap menjaga history dari snapshot assignment
- semua tabel admin memiliki `search`, `filter`, `view columns`, dan `pagination`
- semua tampilan user di admin memakai `avatar + username + email`, dengan fallback avatar konsisten bila `avatar_url` kosong
- seluruh query dan mutation admin wajib dijalankan server-side memakai session user admin biasa; browser admin tidak boleh memakai credential database istimewa atau service credential langsung
- semua endpoint extension memvalidasi header, `Origin`, session, banned status, dan format error baku; `nonce` hanya wajib untuk `GET /api/extension/asset`
- setiap halaman yang pada PRD memiliki tabel atau form wajib mengunci minimum columns, filters, form fields, dan action buttons sesuai PRD; frasa `usable penuh` tidak cukup tanpa kontrak minimum itu
- `/console` wajib menampilkan tabel histori subscription dengan kolom minimum `source`, `package`, `amount (Rp)`, `status`, dan `created_at`
- `/admin/subscriber` asset selection wajib hanya menampilkan asset `available`; asset `private` hanya jika belum dipakai user lain; asset `share` hanya jika aktif dan belum expired
- dashboard admin wajib memuat metrik wajib PRD, chart default 30 hari, dan `Live User` 50 terbaru dengan window online 10 menit berdasarkan timestamp terbaru dari app session atau extension track
- scheduler cron reconciliation wajib dijalankan minimal tiap 1 menit
- `POST /api/extension/track` wajib mengekstrak `ip_address`, `city`, dan `country` dari request server-side, lalu melakukan dedupe berdasarkan `user_id + device_id + ip_address + extension_id`

---

## 3. Test Stack yang Direkomendasikan
Project ini belum memiliki stack test. Agar rencana bisa dieksekusi konsisten, rekomendasi minimumnya adalah:
- unit dan integration: `vitest`
- React component testing: `@testing-library/react`
- user interaction: `@testing-library/user-event`
- mock ringan jika dibutuhkan: `msw`
- browser E2E: browser agent only

Script minimum yang harus ada mulai Phase 00:
- `pnpm lint`
- `pnpm typecheck`
- `pnpm build`
- `pnpm test`
- `pnpm test:unit`
- `pnpm test:integration`
- `pnpm test:smoke`

---

## 4. Environment dan Data Reset

### 4.1. Environment Wajib
Minimal ada tiga environment kerja:
- local dev
- test/local integration
- staging

### 4.2. Reset Database
Setiap phase harus bisa diuji dari database yang bersih dengan urutan migration resmi:
1. `001_extensions.sql`
2. `002_enums.sql`
3. `003_core_helpers.sql`
4. `010_profiles_and_auth_tables.sql`
5. `011_catalog_tables.sql`
6. `012_subscription_tables.sql`
7. `020_admin_access_helpers.sql`
8. `021_rls_policies.sql`
9. `022_subscription_engine.sql`
10. `023_triggers.sql`
11. `024_views.sql`
12. `030_rpc.sql`
13. `040_dev_seed_full.sql` bila butuh fixture development lengkap

### 4.3. Data Fixture
Mulai Phase 00 harus disiapkan fixture dasar berikut:
- admin user aktif
- beberapa member aktif
- package `private`, `share`, `mixed`
- asset valid, asset disabled, asset expired
- subscription `active`, `processed`, `expired`, `canceled`
- transaction `success`, `pending`, `failed`, `canceled`

### 4.4. Catatan Keamanan
`opencode.json` saat ini berisi API key InsForge. Ini harus dianggap bocor.

Sebelum implementasi lebih jauh:
1. rotate API key
2. pindahkan secret ke env lokal atau secret manager
3. jangan commit secret lagi ke repo

---

## 5. Ringkasan Dependency dan Parallel Track
| Phase | Nama                           | Hasil Akhir                                           | Depends On                                                                                           | Bisa Paralel Dengan                                            | Convergence Sebelum       |
| ----- | ------------------------------ | ----------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- | ------------------------- |
| `P0`  | Foundation and Quality Harness | project bootstrap, env, test harness, migration ready | -                                                                                                    | -                                                              | seluruh phase lain        |
| `P1`  | Auth and Session Backend       | auth/session backend, session cookie, dan guard siap  | `P0`                                                                                                 | -                                                              | `P1F`, `P2`, `P3+`        |
| `P1F` | Auth and Session Frontend      | login/register/reset/logout UI usable                 | `P1`                                                                                                 | -                                                              | `P2`, `P3+`               |
| `P2`  | Member Console Read            | dashboard member read path usable                     | `P1F`                                                                                                | `P3.4-P3.6`, `P4.1-P4.6`                                       | `P6`, `P7`, `P11`, `P12`  |
| `P3`  | Admin Package                  | admin shell dan package management usable             | `P1F`; untuk `P3.4-P3.6` cukup fondasi `P3.1-P3.3`                                                   | `P2` revisi UI, `P4`                                           | `P5`, `P6`, `P7`, `P12`   |
| `P4`  | Asset Inventory                | asset management usable                               | `P1F` dan fondasi admin shell/table `P3.1-P3.2`                                                      | `P2`, `P3.4-P3.6`                                              | `P5`, `P10`, `P11`, `P12` |
| `P5`  | Manual Subscription            | admin subscriber flow usable                          | package domain siap (`P3.3` minimum), asset domain siap (`P4.1` minimum)                             | `P6` dan `P7` pada area yang tidak menunggu UI final yang sama | `P9`, `P10`, `P11`, `P12` |
| `P6`  | Payment Dummy and Extend       | member purchase/extend usable                         | `P2`, package domain siap (`P3.3` minimum), subscriptions core `P5.1`                                | `P7`, sebagian `P9`                                            | `P10`, `P11`, `P12`       |
| `P7`  | CD-Key                         | admin create dan member redeem usable                 | package domain siap (`P3.3` minimum), subscriptions core `P5.1`                                      | `P6`, sebagian `P9`                                            | `P10`, `P11`, `P12`       |
| `P8`  | Users Management               | admin user operations usable                          | `P1F`, fondasi admin shell/table `P3.1-P3.2`                                                         | `P9` bila query contract tidak bentrok                         | `P12`                     |
| `P9`  | Dashboard and Logs             | admin stats dan logs usable                           | `P5`, plus data source yang relevan dari `P6`, `P7`, `P8`                                            | sebagian akhir `P6-P8` jika query source sudah stabil          | `P12`                     |
| `P10` | Cron and Recovery              | auto expire dan reconcile usable                      | `P4`, `P5`, `P6`, `P7`                                                                               | sebagian `P11` pada kontrak read-only yang sudah final         | `P12`                     |
| `P11` | Extension API                  | endpoint extension usable                             | `P1`, `P2`, `P4`, `P5`; rule invalid read path dan contract recovery yang relevan harus sudah stabil | sebagian akhir `P9-P10` jika contract stabil                   | `P12`                     |
| `P12` | Release Candidate              | staging full regression dan release ready             | convergence seluruh track utama                                                                      | -                                                              | -                         |

Catatan interpretasi dependency:
- `P3.1-P3.3` adalah fondasi admin/package yang sudah cukup untuk membuka track paralel `P3.4-P3.6` dan `P4`
- `P4` tidak bergantung langsung pada UI `/admin/package`, tetapi tetap bergantung pada admin shell/table baseline agar pola admin tetap konsisten
- `P5` adalah convergence pertama karena membutuhkan package dan asset secara bersamaan
- `P6` dan `P7` bergantung kuat pada package + subscription core, tetapi tidak bergantung penuh pada seluruh scope asset admin
- `P11` tidak harus menunggu seluruh `P10` selesai penuh; yang wajib sudah stabil adalah rule read path aktif, filter asset invalid, dan contract recovery yang memengaruhi endpoint extension

---

## 6. Regression Pack
Regression pack ini harus bertambah seiring phase berjalan.

### Pack A - Foundation and Auth
- app boot normal
- public route render
- protected route redirect
- login/register/reset password
- single-device session revoke

### Pack B - Member Console
- member login
- console render
- subscription overview benar
- asset list valid saja yang tampil
- asset detail raw tampil dan `Copy JSON` bekerja
- history transaction tampil

### Pack C - Package Admin
- admin login
- package list render
- create/edit/disable-enable package
- search/filter/table controls berjalan
- package disabled memblokir activation path baru yang relevan tanpa merusak history

### Pack D - Asset Admin
- asset list render
- create/edit asset
- disable-enable asset
- delete asset
- efek perubahan terlihat di member console bila relevan
- history asset yang sudah dihapus tetap bisa dibaca dari snapshot yang relevan

### Pack E - Subscription Activation
- admin manual subscription
- admin cancel subscription
- quick add asset
- payment dummy success
- extend flow
- redeem CD-Key
- rule package disabled terhadap manual assign, payment dummy, dan redeem CD-Key lama tervalidasi

### Pack F - User Operations and Reports
- add/edit user
- ban/unban
- change password
- avatar fallback dan avatar edit bekerja
- dashboard stats render
- logs render dan filter berjalan

### Pack G - Recovery and Cron
- expire subscription job
- reconcile invalid assets job
- read path langsung memblokir asset invalid

### Pack H - Extension and Release
- extension session endpoint
- extension asset endpoint
- extension track endpoint
- extension security: missing header, bad origin, missing session, revoked session, banned user, invalid nonce
- validasi origin `chrome-extension://<extension_id>` asli lulus di browser dengan extension shell
- full staging smoke

---

## 7. Detailed Phase Plan and Operational Backlog

## P0 - Foundation and Quality Harness
> Menyiapkan project dari nol agar seluruh phase berikutnya bisa dibangun di atas fondasi yang stabil, aman, dan bisa dites.
> **goal**: fondasi project, env, test harness, dan workflow database siap dipakai.
> **scope**: bootstrap Next.js 16, dependency inti, struktur folder resmi, env validation, InsForge client setup, migration reset workflow, test stack, base layout.

### Status Phase
Phase `P0` sudah selesai dikerjakan.

Ringkasan hasil:
- project Next.js 16 sudah terbentuk dan bisa `pnpm install`, `pnpm build`, dan `pnpm dev`
- stack inti sudah terpasang dan config dasar sudah aktif
- struktur folder inti sudah mengikuti rule `FOLDER-STRUCTURE.md`
- env parser, `.env.example`, dan helper server-only dasar sudah tersedia
- workflow baseline DB, manifest migration, dan helper verifikasi sudah tersedia
- test harness `vitest` dan script quality sudah tersedia
- shell publik, member, dan admin dasar sudah ada
- browser gate P0 untuk render publik dan redirect route protected sudah lulus
- quality gate yang sudah lulus: `pnpm lint`, `pnpm typecheck`, `pnpm build`, `pnpm test`, dan verifikasi baseline DB pada target environment yang benar

### Task Backlog
- [x] `P0.1` Bootstrap project Next.js 16 dengan `pnpm`.
      Target: `package.json`, `pnpm-lock.yaml`, `app/`, `src/`, `next.config.*`, `tsconfig.json`.
      Acceptance: project bisa `pnpm install`, `pnpm dev`, dan `pnpm build`.
      Tests: smoke build minimum.
      Catatan selesai: `package.json`, `pnpm-lock.yaml`, `tsconfig.json`, `next.config.ts`, `app/`, dan file dasar Next.js sudah dibuat dan build produksi sudah lulus.

- [x] `P0.2` Install dan konfigurasi stack inti.
      Target: Tailwind v4, heroUI, Zod, react-hook-form, Zustand, TanStack Query, TanStack Table, next-safe-action.
      Acceptance: dependency lengkap dan config dasar tersedia.
      Tests: typecheck dan build harus hijau.
      Catatan selesai: dependency runtime dan dev utama sudah terpasang di `package.json`, `globals.css` sudah memakai Tailwind v4 dan heroUI, dan gate `typecheck` serta `build` sudah hijau.

- [x] `P0.3` Bentuk struktur folder sesuai `.docs/agentRules/folder-structure.md`.
      Target: `app/(public)`, `app/(member)`, `app/admin`, `app/api`, `src/components`, `src/lib`, `src/server`, `tests`.
      Acceptance: struktur folder resmi sudah tersedia walau file masih minimum.
      Tests: smoke import boundary minimum.
      Catatan selesai: route group dasar, `src/components`, `src/lib`, `src/server`, `src/providers`, dan struktur `tests/` sudah dibentuk dengan scope minimum yang sesuai phase P0.

- [x] `P0.4` Amankan secret dan setup env schema.
      Target: `.env.example`, `src/lib/env/`, penghapusan secret hardcoded dari repo config bila memang dipindahkan.
      Acceptance: seluruh env tervalidasi saat boot, secret tidak lagi di-hardcode dalam file yang akan dipakai runtime.
      Tests: unit test env parser.
      Catatan selesai: `.env.example`, `src/lib/env/shared.ts`, `src/lib/env/server.ts`, dan `src/lib/env/client.ts` sudah tersedia; parser env sudah dites; secret runtime sudah dipindahkan ke env lokal.

- [x] `P0.5` Buat helper InsForge server-only dan boundary dasar.
      Target: `src/lib/insforge/**`, `src/lib/session/**`, `src/lib/cookies/**`, `src/lib/auth/**`, `src/lib/safe-action/**`.
      Acceptance: helper server-only jelas dan tidak diimpor dari client component.
      Tests: integration test koneksi/helper dasar.
      Catatan selesai: helper InsForge server-only, session cookie helper, signing boundary, auth guard dasar, `next-safe-action` client, dan provider React Query sudah dibuat dengan boundary server/client yang jelas.

- [x] `P0.6` Siapkan workflow apply migration, reset DB, dan seed.
      Target: `tests/setup/`, script reset, helper verifikasi function dan view database.
      Acceptance: database bersih bisa di-apply ulang dengan urutan migration resmi.
      Tests: integration test verifikasi tabel, view, dan function penting tersedia.
      Catatan selesai: `scripts/db-apply.mjs`, `scripts/db-reset.mjs`, `scripts/db-verify.mjs`, `scripts/db-utils.mjs`, `scripts/db-manifest.json`, dan helper seed auth dev sudah dibuat; manifest migration sudah sinkron dengan baseline SQL; verifikasi baseline DB pada target environment yang benar sudah lulus.

- [x] `P0.7` Setup test harness dan scripts kualitas.
      Target: config `vitest`, testing library, setup file, script `test:unit`, `test:integration`, `test:smoke`.
      Acceptance: semua script quality berjalan walau test masih minimal.
      Tests: self-hosting smoke test harness.
      Catatan selesai: `vitest.config.ts`, setup test, unit/integration/smoke test awal, dan script quality di `package.json` sudah tersedia; `pnpm test` dan sub-script test sudah lulus.

- [x] `P0.8` Buat layout publik dasar dan protected-route shell minimum.
      Target: `app/layout.tsx`, `(public)` shell, `(member)` shell, `admin/layout.tsx` placeholder.
      Acceptance: route dasar render tanpa error dan protected route belum membuka akses liar.
      Tests: browser E2E phase 00.
      Catatan selesai: `app/layout.tsx`, route placeholder publik, shell `(member)`, shell `admin`, `RouteShell`, dan `ShellCard` sudah tersedia; `/login` render normal, `/console` dan `/admin` redirect ke `/login` saat belum ada session.

### Browser E2E Checklist
- buka halaman publik utama atau `/login` dan pastikan render normal
- akses `/console` tanpa login dan pastikan redirect ke login
- akses `/admin` tanpa login dan pastikan redirect atau ditolak
- pastikan tidak ada browser console error

### Exit Gate
- gate quality lengkap lulus
- Pack A bagian foundation lulus
- database reset dan apply migration bisa diulang

Status exit gate: lulus.

---

## P1 - Auth and Session Backend
> Menyelesaikan autentikasi dan session backend sampai benar-benar usable untuk dikonsumsi frontend phase berikutnya.
> **goal**: backend auth/session final, register auto-login berjalan, login dan reset password berbasis link berjalan, current session tervalidasi, single-device login berjalan, dan guard member/admin sudah aman.
> **scope**: `check email`, register backend + auto-login, login, `app_session`, revoke session lama, current session, `last_seen_at`, login logs, failed login counter, request reset link, set password baru dari link/reset context, role guard, dan regression server-side.

### Catatan Phase
Kontrak auth `P1` sekarang dikunci ke konfigurasi InsForge yang sudah disepakati untuk v1:
- `requireEmailVerification = false`
- `resetPasswordMethod = link`
- `register` sukses langsung membuat `app_session` dan menyiapkan redirect ke `/console`
- reset password berjalan lewat `request reset link -> buka link -> set password baru`
- browser E2E auth tetap dipindahkan ke phase `P1F` setelah backend stabil

### Task Backlog
- [x] `P1.1` Implement auth backend schemas, types, dan failed-login rules.
      Target: `src/server/auth/{schema,types,rules}.ts`.
      Acceptance: kontrak input backend, state auth, dan logic threshold gagal login tersedia dan tervalidasi.
      Tests: unit test schema dan rules.

- [x] `P1.2` Implement auth domain queries, service, dan actions.
      Target: `src/server/auth/{queries,service,actions}.ts`.
      Acceptance: flow `check email`, register backend + auto-login, login, request reset link, set password baru dari link/reset context, dan logout berjalan.
      Tests: integration test auth service dan reset flow.

- [x] `P1.3` Implement `app_session` create/read/revoke/touch helpers.
      Target: `src/lib/cookies/**`, `src/lib/session/**`, `src/lib/auth/**`.
      Acceptance: session valid bisa dibaca dari server, revoke terdeteksi, dan request authenticated memperbarui `last_seen_at`.
      Tests: integration test current session.

- [x] `P1.4` Implement login log, failed login counter, dan revoke session lama.
      Target: auth service dan query pendukung.
      Acceptance: gagal login kredensial tercatat, threshold 5x menyalakan hint reset password, dan login/register baru merevoke session aktif lama.
      Tests: unit rules + integration auth service.

- [x] `P1.5` Implement route guards untuk public/member/admin.
      Target: route layout, auth guards server-side, dan safe-action auth context.
      Acceptance: hanya admin bisa akses `/admin/*`, member non-admin ditolak, dan mutation auth bisa membaca current session tervalidasi.
      Tests: smoke test guard + integration current session.

- [x] `P1.6` Tambahkan regression test auth/session backend.
      Target: `tests/unit/**`, `tests/integration/**`, `tests/smoke/**`.
      Acceptance: semua flow auth inti backend tertutup test tanpa browser E2E.
      Tests: unit, integration, smoke.

### Browser E2E Checklist
- dipindahkan ke phase frontend auth `P1F` setelah backend `P1` selesai

### Exit Gate
- `pnpm lint`
- `pnpm typecheck`
- `pnpm build`
- `pnpm test:unit`
- `pnpm test:integration`
- `pnpm test:smoke`
- seluruh skenario server-side end-to-end auth/session lulus

---

## P1F - Auth and Session Frontend
> Menyelesaikan flow autentikasi dan session di frontend sampai benar-benar usable untuk user akhir.
> **goal**: `/login` dan `/reset-password` usable penuh, login/register/reset/logout terhubung ke backend auth `P1`, redirect session konsisten, dan browser flow auth lulus.
> **scope**: multi-step `/login`, `/reset-password` request + set password, redirect `/login` untuk session aktif, show/hide password, state loading/error/sukses, logout affordance minimum pada shell protected, dan regression frontend auth.

### Catatan Phase
Kontrak frontend auth `P1F` harus mengikuti backend `P1` dan dokumen auth flow tanpa membuat API publik baru:
- UI web hanya memakai Server Actions yang sudah ada di `src/server/auth/actions.ts`
- login dan register tetap berada dalam satu route `/login`, bukan dua halaman terpisah
- route-local auth UI tetap colocated di `app/(public)/login/**` dan `app/(public)/reset-password/**`
- `/login` boleh menolak user yang sudah punya session aktif dengan redirect ke `/console`, tetapi `/reset-password` tidak boleh diberi redirect blanket yang memblokir request-reset mandiri atau landing link reset yang valid
- reset password link mengikuti kombinasi query yang sekarang memang dipakai sistem: `email` dan `resetContext` dari backend redirect URL, ditambah `token`, `insforge_status=ready|error`, `insforge_type=reset_password`, dan `insforge_error` dari flow link InsForge
- form reset password baru hanya boleh muncul jika link reset berada pada state siap pakai; link invalid/expired, query reset yang tidak lengkap, atau hasil action `INVALID_RESET_TOKEN` harus jatuh ke error state yang jelas dan tidak melanjutkan flow seolah token valid
- redirect sukses login dan register tetap ke `/console` sesuai PRD v1; tidak ada auto-login setelah reset password sukses

### Status Phase
Phase `P1F` sudah selesai dikerjakan.

Ringkasan hasil:
- `/login` sekarang berjalan sebagai flow multi-step `email -> login/register` yang langsung memakai Server Actions auth `P1`
- `/reset-password` sekarang usable baik untuk request-reset mandiri maupun landing page link reset yang valid atau invalid
- redirect session untuk route auth sudah konsisten: user aktif ditolak dari `/login`, logout dari shell protected kembali ke `/login`, dan single-device session revoke tervalidasi di browser nyata
- affordance session minimum pada shell protected sudah tersedia lewat header session dan tombol logout
- regression frontend auth sekarang tertutup oleh test component, smoke, integration yang relevan, dan browser checklist phase ini
- quality gate dan browser gate phase ini sudah lulus: `pnpm lint`, `pnpm typecheck`, `pnpm build`, `pnpm test`, `pnpm test:unit`, `pnpm test:integration`, `pnpm test:smoke`, Next.js runtime check, dan browser E2E auth/frontend

### Task Backlog
- [x] `P1F.1` Finalisasi kontrak route auth frontend dan guard public-auth.
      Target: `app/(public)/login/{schema,types}.ts`, `app/(public)/reset-password/{schema,types}.ts`, `src/lib/auth/guards.ts`, `app/(public)/**`.
      Acceptance: schema dan type route-local mengikuti PRD + auth-flow + backend `P1`; `/login` membaca session aktif server-side lalu redirect ke `/console`; `/reset-password` tetap kompatibel untuk request-reset mandiri dan landing link reset; dan page reset-password mampu memetakan query `email`, `resetContext`, `token`, `insforge_status`, `insforge_type`, dan `insforge_error` ke state UI tanpa membuka bypass baru.
      Tests: unit test schema/presenter auth route dan smoke redirect check untuk session aktif.
      Catatan selesai: kontrak route-local auth frontend, parser query reset-password, dan guard public-auth sudah selaras dengan backend `P1`; `/login` menolak session aktif ke `/console`; `/reset-password` tetap usable untuk request-reset mandiri dan landing link reset.

- [x] `P1F.2` Implement UI/UX `/login` multi-step sesuai flow email -> login atau register.
      Target: `app/(public)/login/page.tsx`, `app/(public)/login/_components/**`, `src/components/forms/password-field.tsx` bila field show/hide dipakai lintas route auth.
      Acceptance: halaman `/login` memuat email step, password step untuk email terdaftar, dialog konfirmasi register untuk email baru, dan register step dengan `password + confirm password`; email yang sedang dipakai tetap terlihat saat user berada di password/register step; aksi ganti email tetap tersedia; semua input password mendukung show/hide; dan UI mengikuti visual language light/dark mode repo dengan fondasi HeroUI.
      Tests: component test render + interaction untuk perpindahan step, dialog register, dan show/hide password.
      Catatan selesai: UI `/login` multi-step, dialog konfirmasi register, register step, show/hide password, dan aksi ganti email sudah terimplementasi dengan route-local component di `app/(public)/login/_components/**`.

- [x] `P1F.3` Wire `/login` ke action auth yang sudah ada tanpa endpoint baru.
      Target: `app/(public)/login/_components/**`, route-local helper/presenter bila diperlukan.
      Acceptance: `checkEmailAction`, `loginAction`, dan `registerAction` dipakai langsung dari frontend auth; loading state mencegah double submit; error message tampil dekat field terkait; klasifikasi state login gagal mengikuti hasil backend `INVALID_CREDENTIALS`, tetapi copy user-facing mengikuti arah copy di `auth-flow.md`; CTA `Reset Password` baru tampil setelah backend mengembalikan `showResetPasswordHint = true`; dan login/register sukses baru redirect ke `/console` setelah cookie `app_session` siap dipakai.
      Tests: component test dengan mock action result untuk existing-email, new-email, login gagal, hint reset, login sukses, dan register sukses.
      Catatan selesai: frontend `/login` sekarang memakai `checkEmailAction`, `loginAction`, dan `registerAction` secara langsung; state loading/error dan threshold hint reset password sudah sesuai kontrak backend `P1`; login/register sukses mengarah ke `/console` setelah sesi siap dipakai.

- [x] `P1F.4` Implement `/reset-password` untuk request link dan set password baru dari link reset.
      Target: `app/(public)/reset-password/page.tsx`, `app/(public)/reset-password/_components/**`, `app/(public)/reset-password/{schema,types}.ts`.
      Acceptance: route ini usable sebagai halaman mandiri untuk request reset password dan sebagai landing page link reset; submit request reset menampilkan pesan sukses generik yang sama untuk email terdaftar maupun tidak saat action `ok`, tetapi tetap punya error state eksplisit saat action mengembalikan `RESET_REQUEST_FAILED`; form password baru hanya tampil jika `insforge_status=ready`, `insforge_type=reset_password`, `token`, `email`, dan `resetContext` tersedia; state `insforge_status=error`, `insforge_error`, token hilang, atau reset context tidak lengkap jatuh ke pesan `link invalid atau kedaluwarsa`; submit reset yang mengembalikan `INVALID_RESET_TOKEN` menggeser UI ke error state link invalid, sedangkan `RESET_PASSWORD_FAILED` tetap menampilkan pesan gagal simpan yang generik; input password baru mendukung show/hide; dan reset sukses menampilkan success state yang mengarahkan user kembali login dengan password baru.
      Tests: component test request-reset generic success, reset-ready state, invalid-link state, dan submit reset sukses/gagal.
      Catatan selesai: route `/reset-password` sekarang mendukung request-reset generik, ready state untuk link valid, invalid-link state yang jelas untuk query error atau tidak lengkap, show/hide password baru, dan success state yang mengarahkan user kembali login.

- [x] `P1F.5` Tambahkan affordance session minimum pada shell protected dan wire logout.
      Target: `app/(member)/layout.tsx`, `app/admin/layout.tsx`, route placeholder protected yang relevan, dan komponen layout shared bila benar-benar dipakai lintas shell.
      Acceptance: selama phase dashboard nyata belum selesai, user tetap bisa melihat bahwa session aktif dipakai pada area protected dan bisa logout dari UI; logout memakai `logoutAction` yang sudah ada; logout sukses menghapus akses protected dan membawa user kembali ke `/login`; dan route `/login` tetap menolak user yang masih punya session aktif.
      Tests: smoke test logout + protected redirect regression, serta browser check logout flow dari shell protected.
      Catatan selesai: shell `(member)` dan `admin` sekarang memakai `SessionHeader` shared dengan identitas session minimum dan tombol logout; logout berhasil mengeluarkan user dari area protected dan route `/login` tetap menolak session aktif.

- [x] `P1F.6` Tambahkan regression test frontend auth dan session.
      Target: `tests/components/auth/**`, `tests/smoke/**`, dan test integration yang perlu diperluas bila kontrak action presenter berubah.
      Acceptance: flow utama auth frontend tertutup oleh test yang realistis: branch email existing/new, hint reset password setelah threshold gagal login, reset password generic success, valid/invalid reset link state, redirect `/login` saat session masih aktif, kompatibilitas `/reset-password` untuk request-reset dan reset-link flow, dan logout dari protected shell.
      Tests: component, smoke, integration bila relevan, dan browser.
      Catatan selesai: regression suite frontend auth sekarang menutup branch email existing/new, reset hint threshold, generic success reset request, valid/invalid reset link, redirect `/login` saat session aktif, dan logout dari protected shell; browser checklist phase ini juga sudah lulus.

### Browser E2E Checklist
- buka `/login` sebagai guest dan pastikan email step render normal tanpa browser console error
- input email terdaftar lalu klik `Next`, pastikan password step tampil, email tetap terlihat, dan aksi ganti email bekerja
- masukkan password salah 4 kali dan pastikan CTA `Reset Password` belum tampil
- masukkan password salah ke-5 dan pastikan error login tampil serta CTA `Reset Password` muncul
- klik CTA `Reset Password` dari flow login dan pastikan user masuk ke `/reset-password`
- kembali ke `/login`, input email baru, pastikan dialog konfirmasi register tampil; batalkan dialog dan pastikan flow kembali bersih ke email step
- lanjutkan dialog register, pastikan form register tampil dengan field `Password` dan `Confirm Password` yang sama-sama punya show/hide
- submit register valid dan pastikan user auto-login lalu redirect ke `/console`
- dari shell protected, jalankan logout dan pastikan user kembali ke `/login`
- login sebagai user existing dan pastikan redirect sukses ke `/console`
- saat session masih aktif, buka `/login` lalu pastikan route itu redirect ke `/console`
- buka `/reset-password` sebagai halaman mandiri, submit email terdaftar dan email tidak terdaftar, lalu pastikan keduanya menampilkan pesan sukses generik yang sama
- buka link reset valid dengan query `token`, `insforge_status=ready`, `insforge_type=reset_password`, `email`, dan `resetContext`, lalu set password baru sampai success state tampil
- buka link reset invalid atau expired, termasuk state query `insforge_status=error` atau token/query reset tidak lengkap, dan pastikan UI menampilkan state error yang jelas serta tidak menampilkan form reset aktif
- verifikasi single-device login di browser nyata: login di browser/profile A, login lagi di browser/profile B, lalu pastikan browser/profile A kehilangan session aktif pada akses protected berikutnya
- pastikan tidak ada browser console error baru di seluruh flow di atas

Status browser checklist: lulus.

### Exit Gate
- `pnpm lint`
- `pnpm typecheck`
- `pnpm build`
- `pnpm test`
- `pnpm test:unit`
- `pnpm test:integration`
- `pnpm test:smoke`
- browser E2E checklist auth/frontend lulus
- Pack A lulus penuh

Status exit gate: lulus.

---

## P2 - Member Console Read
> Menyediakan dashboard member yang membaca data subscription, asset aktif, dan histori transaksi secara akurat.
> **goal**: member bisa melihat kondisi subscription dan akses aktifnya tanpa ambiguity.
> **scope**: `/console`, subscription overview, asset list aktif, history transaction, asset detail view.

### Status Phase
Phase `P2` sudah selesai dikerjakan tapi perlu revisi UI/UX nya karena telalu buruk


### Task Backlog
- [ ] `P2.1` Implement query dan mapper snapshot console.
      Target: `src/server/subscriptions/queries.ts`, `types.ts`, `dto.ts` bila perlu.
      Acceptance: data dari `get_user_console_snapshot` siap dipakai UI.
      Tests: integration test snapshot console.

- [ ] `P2.2` Implement page dan route-local components `/console`.
      Target: `app/(member)/console/**`.
      Acceptance: tiga section utama tampil sesuai PRD, termasuk `Subscription Overview` dengan field minimum `status`, `packageName`, `endAt`, `daysLeft`; `Asset List` dengan kolom minimum `id`, `platform`, `asset type`, `note`, `proxy`, `expires at`, `action`; dan tabel `History Subscription` dengan kolom minimum `source`, `package`, `amount (Rp)`, `status`, dan `created_at`.
      Tests: component render test dasar.

- [ ] `P2.3` Implement asset list dan asset detail action.
      Target: `app/(member)/console/_components/**`, server query tambahan bila diperlukan.
      Acceptance: hanya asset aktif dan valid yang tampil; detail asset menampilkan raw asset; tombol `Copy JSON` tersedia dan bekerja.
      Tests: integration test filter asset invalid dan browser check copy action.

- [ ] `P2.4` Implement state message untuk `processed`, `expired`, dan no subscription.
      Target: console UI mapper/presenter.
      Acceptance: user mengerti kapan akses parsial sedang terjadi.
      Tests: unit test status presenter.

- [ ] `P2.5` Tambahkan smoke dan regression test console.
      Target: `tests/integration/subscriptions/**`, `tests/components/**`.
      Acceptance: console tidak pecah untuk seluruh state utama.
      Tests: unit, integration, browser.

### Browser E2E Checklist
- login sebagai member dengan subscription aktif
- buka `/console` dan verifikasi subscription overview tampil benar
- verifikasi subscription overview menampilkan `status`, `packageName`, `endAt`, dan `daysLeft`
- verifikasi asset list hanya menampilkan asset valid
- verifikasi asset list menampilkan kolom `id`, `platform`, `asset type`, `note`, `proxy`, `expires at`, dan action `View`
- verifikasi tabel history subscription tampil dengan kolom `source`, `package`, `amount (Rp)`, `status`, dan `created_at`
- buka detail salah satu asset dan pastikan data detail muncul
- klik `Copy JSON` dan verifikasi aksi copy berhasil
- login sebagai member dengan subscription `processed` dan pastikan pesan akses parsial tampil
- login sebagai user tanpa subscription aktif dan pastikan empty state benar
- pastikan tidak ada browser console error

### Exit Gate
- gate quality lengkap lulus
- Pack A dan Pack B lulus

---

## P3 - Admin Package
> Menyelesaikan shell admin dan package management end-to-end.
> **goal**: admin punya shell kerja yang aman dan bisa mengelola package penuh.
> **scope**: admin layout, admin table pattern dasar, `/admin/package`, create/edit/disable/enable package.

### Status Phase
Phase `P3` belum selesai penuh.

Ringkasan status saat ini:
- `P3.1` sudah selesai: admin shell, nav, guard, placeholder route admin, dan browser verification dasar sudah lulus
- `P3.2` sudah selesai: shared admin table primitives dan shared user cell dasar sudah tersedia dan sudah diverifikasi
- `P3.3` sudah selesai: package domain backend server-side untuk create, update, disable-enable, admin query, dan admin action sudah tersedia dan sudah merge ke `main`
- `P3.4` sampai `P3.6` masih pending, jadi package management end-to-end di `/admin/package` belum usable penuh karena UI dan browser flow package belum selesai
- quality gate yang sudah lulus untuk fondasi `P3.1` sampai `P3.3`: `pnpm lint`, `pnpm typecheck`, `pnpm build`, focused package tests, `pnpm test:integration`, browser verification admin redirect `/admin -> /login`, dan Next.js runtime check

### Catatan Phase
Untuk plan ini, package management v1 diinterpretasikan sebagai `disable/enable` only. Frasa PRD tentang “menghapus package dari dashboard” ditafsirkan sebagai menghapus package dari katalog aktif, bukan hard delete row package. Jika hard delete package benar-benar diinginkan, PRD dan migration harus direvisi lebih dulu sebelum implementasi dimulai.

### Task Backlog
- [x] `P3.1` Implement admin layout, nav, dan guard shell.
      Target: `app/admin/layout.tsx`, `src/components/layout/**`, `src/server/admin/**` bila perlu.
      Acceptance: admin shell usable dan aman, seluruh query/mutation admin berjalan server-side dengan session user admin biasa, dan browser admin tidak memakai credential database istimewa atau service credential langsung.
      Tests: integration guard admin, server-boundary verification, browser access check.
      Catatan selesai: admin shell shared sudah tersedia di `src/components/layout/**`; guard server-side tetap berada di `app/admin/layout.tsx`; nav admin v1 dan placeholder route `/admin`, `/admin/package`, `/admin/assets`, `/admin/subscriber`, `/admin/users`, `/admin/cdkey`, dan `/admin/userlogs` sudah aktif; browser verification desktop/mobile, logout, dan runtime check sudah lulus.

- [x] `P3.2` Implement shared admin table wrapper.
      Target: `src/components/tables/**`, `src/components/ui/**`.
      Acceptance: search, filter, pagination, view columns bisa direuse, dan shared user cell dasar mendukung `avatar + username + email` dengan fallback avatar konsisten.
      Tests: component test dasar table shell dan user cell.
      Catatan selesai: shared table primitives `AdminTableShell`, `AdminTableToolbar`, `AdminTableSearch`, `AdminTableFilters`, `AdminTableViewColumns`, `AdminTablePagination`, dan `AdminUserCell` sudah tersedia; fallback avatar sudah stabil berbasis identity user; component test dan regression terkait sudah lulus.

- [x] `P3.3` Implement package domain backend.
      Target: `src/server/packages/{queries,actions,service,schema,types}.ts`.
      Acceptance: create/update/disable-enable package berjalan sesuai rule `access_key`, dan package disabled tersimpan sebagai state yang bisa dipakai untuk memblokir activation path baru di phase berikutnya.
      Tests: integration test package service.
      Catatan selesai: `src/server/packages/{schema,types,service,queries,actions}.ts` sudah tersedia; helper actor-aware DB context untuk admin query/mutation ada di `src/lib/db/authenticated-actor.ts`; `adminActionClient` sudah tersedia untuk boundary admin action; integration dan unit test package domain sudah lulus; query admin package sekarang juga fail-fast untuk non-admin sebelum menyentuh SQL.

- [ ] `P3.4` Implement UI `/admin/package`.
      Target: `app/admin/package/**`.
      Acceptance: tabel dan popup add/edit usable penuh, termasuk search by name, filter by ringkasan package, pagination, view columns, kolom minimum `name`, `amount (Rp)`, `duration (days)`, `checkout URL`, `total used`, `created at`, `updated at`; `total used` dihitung dari subscription berjalan berstatus `active` atau `processed`; serta field form minimum `name`, `price (Rp)`, `duration (hari)`, `checkout URL`, `is_extended`, dan entitlement matrix `accessKey`.
      Tests: component and browser checks.

- [ ] `P3.5` Implement entitlement matrix dan package summary derivation.
      Target: `app/admin/package/{schema,types}.ts`, route-local form helper, dan UI selector entitlement matrix; schema backend `src/server/packages/schema.ts` hanya disentuh jika memang ada perubahan kontrak domain yang nyata.
      Acceptance: duplicate entitlement ditolak dan summary tidak diinput manual.
      Tests: unit test normalization and summary mapping.

- [ ] `P3.6` Tambahkan regression test package management.
      Target: tests package domain dan admin page.
      Acceptance: create/edit/disable-enable stabil, dan rule package disabled didokumentasikan untuk diregress ulang pada flow manual subscription, payment dummy, dan CD-Key.
      Tests: unit, integration, browser.

### Browser E2E Checklist
- login sebagai admin dan buka `/admin/package`
- buat package baru dengan entitlement valid
- edit package yang ada
- coba input entitlement duplikat dan pastikan ditolak
- disable package lalu enable kembali
- gunakan search, filter, pagination, dan view columns
- pastikan tidak ada browser console error

### Exit Gate
- gate quality lengkap lulus
- Pack A, Pack B, dan Pack C lulus

Status exit gate: belum lulus, karena baru `P3.1` sampai `P3.3` yang selesai; package management penuh pada `P3.4` sampai `P3.6` masih pending.

---

## P4 - Asset Inventory
> Menyelesaikan asset management end-to-end dengan efek operasional yang benar.
> **goal**: admin bisa mengelola inventory asset tanpa merusak assignment dan history.
> **scope**: `/admin/assets`, add/edit/view details, disable/enable asset, delete asset aman.

### Task Backlog
- [ ] `P4.1` Implement asset domain backend.
      Target: `src/server/assets/{queries,actions,service,schema,types}.ts`.
      Acceptance: asset CRUD operasional berjalan sesuai aturan PRD dan DB.
      Tests: integration test asset queries/actions.

- [ ] `P4.2` Implement UI `/admin/assets`.
      Target: `app/admin/assets/**`.
      Acceptance: UI `/admin/assets` usable penuh dengan search by platform, note, username/email pemakai; filter by asset type, status, date range; pagination dan view columns; kolom minimum `platform`, `expires at`, `note`, `asset type`, `status`, `total used`, `created at`, `updated at`; `total used` dihitung dari jumlah assignment aktif saat ini; serta form/detail minimum `platform`, `asset type`, `expires at`, `account`, `note`, `proxy`, dan `asset JSON mentah`, dengan default `expires at = now + 30 hari`.
      Tests: component and browser checks.

- [ ] `P4.3` Implement disable/enable asset flow.
      Target: asset service.
      Acceptance: disable asset langsung memicu recheck subscription terkait.
      Tests: integration test `recheck_subscription_after_asset_change` path.

- [ ] `P4.4` Implement delete asset aman.
      Target: asset service.
      Acceptance: delete memakai `delete_asset_safely`, history tetap aman, snapshot asset yang terhapus masih bisa dibaca dari area history yang relevan, dan subscription terdampak direfresh.
      Tests: integration test delete/reassign flow dan history snapshot read.

- [ ] `P4.5` Implement detail asset users-in-use section.
      Target: asset query/UI details.
      Acceptance: admin bisa melihat siapa yang sedang memakai asset tersebut.
      Tests: integration query test.

- [ ] `P4.6` Tambahkan regression test asset management.
      Target: tests asset domain dan admin page.
      Acceptance: disable/delete asset tidak merusak read path.
      Tests: unit, integration, browser.

### Browser E2E Checklist
- login sebagai admin dan buka `/admin/assets`
- tambah asset baru
- edit asset yang ada
- buka detail asset dan lihat daftar user yang memakainya
- gunakan search, filter, pagination, dan view columns
- disable asset dan verifikasi asset itu tidak lagi boleh muncul pada read path aktif yang relevan
- enable asset kembali bila sesuai fixture
- delete asset dan verifikasi inventory aktif berubah benar
- verifikasi histori asset yang terhapus tetap tersedia dari snapshot pada area yang relevan bila fixture mendukung
- pastikan tidak ada browser console error

### Exit Gate
- gate quality lengkap lulus
- Pack A sampai Pack D lulus

---

## P5 - Manual Subscription
> Menyelesaikan flow admin subscriber untuk aktivasi manual lengkap termasuk quick add asset.
> **goal**: admin bisa mengaktifkan subscription manual sampai assignment user benar-benar terbentuk.
> **scope**: `/admin/subscriber`, add/edit/cancel subscriber, duration override, asset selection, quick add asset private.

### Task Backlog
- [ ] `P5.1` Implement subscription activation domain backend.
      Target: `src/server/subscriptions/{actions,service,schema,types}.ts`.
      Acceptance: admin manual activation dan cancel berjalan sesuai rule `is_extended`, exact entitlement, single running subscription, membuat `transaction` yang konsisten dengan `source = admin_manual`, revoke assignment saat cancel, memutus akses aktif yang tidak lagi valid, menjaga asset `private` tidak dipakai dua user aktif sekaligus, dan menjaga asset `share` maksimal satu assignment aktif per user per platform.
      Tests: integration test activation scenarios.

- [ ] `P5.2` Implement subscriber query layer dan filter.
      Target: `src/server/subscriptions/queries.ts`, `src/server/users/queries.ts` bila diperlukan.
      Acceptance: list subscriber mendukung search by username/user ID/email, filter by asset type, subscription status, date range, dan menampilkan total spent sesuai PRD.
      Tests: integration query test.

- [ ] `P5.3` Implement UI `/admin/subscriber`.
      Target: `app/admin/subscriber/**`.
      Acceptance: tabel dan popup add/edit/cancel usable penuh, termasuk search by username/user ID/email, filter by asset type, subscription status, date range, pagination, dan view columns; kolom minimum `user`, `subscription status`, `start date`, `expires at`, `total spent (Rp)`, `package name`; form minimum `select user`, `select package`, `duration` dengan default mengikuti package tetapi bisa dioverride admin; serta asset selection yang hanya menampilkan asset `available`, asset `private` yang belum dipakai user lain, dan asset `share` yang aktif serta belum expired. Jika package sudah dipilih, candidate asset di UI harus dibatasi ke entitlement exact milik package tersebut; admin boleh memilih asset spesifik untuk satu atau lebih entitlement, tetapi entitlement yang tidak dipilih manual tetap dipenuhi oleh engine otomatis saat save, dan validasi final tetap server-side berdasarkan exact `platform + asset_type`.
      Tests: component and browser checks.

- [ ] `P5.4` Implement quick add asset di popup subscriber.
      Target: `src/server/assets/**`, subscriber UI local components.
      Acceptance: quick add asset memiliki field minimum `platform`, `account`, `duration_days`, `note`, `proxy`, dan `asset_json`; asset yang dibuat otomatis bertipe `private`; dan asset tersebut langsung terhubung ke subscription yang sedang diatur.
      Tests: integration flow quick add asset.

- [ ] `P5.5` Implement status hasil sistem `active` versus `processed`.
      Target: subscription service + UI feedback.
      Acceptance: admin tidak menginput status manual; status dihitung sistem.
      Tests: integration test partial fulfillment.

- [ ] `P5.6` Implement guard package disabled pada manual assign.
      Target: subscription service dan subscriber UI.
      Acceptance: package disabled tidak bisa dipakai untuk manual activation baru, sementara subscription aktif lama tetap aman.
      Tests: integration test disabled-package manual assign scenario.

- [ ] `P5.7` Tambahkan regression test subscriber flow.
      Target: tests subscription domain dan admin subscriber page.
      Acceptance: add/edit/cancel subscriber stabil dan tidak melanggar rule inti.
      Tests: unit, integration, browser.

### Browser E2E Checklist
- login admin dan buka `/admin/subscriber`
- tambah subscription manual untuk user yang belum punya subscription berjalan
- verifikasi member tersebut melihat perubahan di `/console`
- verifikasi histori transaction user bertambah dengan source `admin_manual`
- buat skenario partial fulfillment dan verifikasi status `processed`
- verifikasi duration default mengikuti package dan admin bisa override jumlah hari
- verifikasi asset selection hanya menampilkan asset `available`, `private` yang belum dipakai user lain, dan `share` yang aktif serta belum expired
- verifikasi setelah package dipilih, asset selection hanya menampilkan candidate asset yang cocok dengan entitlement exact package itu
- gunakan quick add asset dan verifikasi status atau assignment berubah sesuai harapan
- edit subscription manual yang masih berjalan sesuai rule package
- cancel subscription yang masih berjalan dan verifikasi asset aktif user tercabut
- verifikasi package disabled tidak bisa dipilih untuk manual activation baru
- gunakan search, filter, pagination, dan view columns
- pastikan tidak ada browser console error

### Exit Gate
- gate quality lengkap lulus
- Pack A sampai Pack E bagian admin manual lulus

---

## P6 - Payment Dummy and Extend
> Menyelesaikan flow pembelian dummy dan perpanjangan dari sisi member.
> **goal**: member bisa membeli atau memperpanjang langganan sendiri dengan hasil yang konsisten.
> **scope**: `/paymentdummy`, popup extend di `/console`, transaction `payment_dummy`, aktivasi subscription dari payment dummy.

### Task Backlog
- [ ] `P6.1` Implement payment dummy backend flow.
      Target: `src/server/subscriptions/service.ts`, `actions.ts`, transaction helper.
      Acceptance: payment success menghasilkan transaction dan subscription konsisten, dan package disabled ditolak untuk pembelian baru.
      Tests: integration test payment activation dan disabled-package payment scenario.

- [ ] `P6.2` Implement page `/paymentdummy`.
      Target: `app/(member)/paymentdummy/**`.
      Acceptance: halaman menampilkan ringkasan package dan nominal dengan benar, serta tombol bayar usable penuh.
      Tests: component and browser checks.

- [ ] `P6.3` Implement extend dialog pada `/console`.
      Target: console route-local components, subscription action.
      Acceptance: user hanya bisa memilih package aktif yang valid lalu diarahkan ke payment dummy.
      Tests: component test dialog, integration action test.

- [ ] `P6.4` Implement rule `is_extended` untuk same package versus package berbeda.
      Target: subscription service.
      Acceptance: carry-over hari hanya berlaku sesuai PRD.
      Tests: unit and integration scenarios for extend/replace.

- [ ] `P6.5` Tambahkan regression test payment and extend flow.
      Target: tests subscription domain, member flow.
      Acceptance: payment dummy dan extend flow stabil.
      Tests: unit, integration, browser.

### Browser E2E Checklist
- login member dan buka `/console`
- klik `Perpanjang Langganan`
- pilih package yang valid dan lanjut ke `/paymentdummy`
- verifikasi package disabled tidak muncul sebagai opsi extend baru
- klik `Bayar` dan pastikan kembali ke `/console`
- verifikasi overview subscription dan history transaction berubah benar
- jalankan satu skenario extend package sama
- jalankan satu skenario replace package berbeda jika fixture mendukung
- pastikan tidak ada browser console error

### Exit Gate
- gate quality lengkap lulus
- Pack A sampai Pack E bagian payment dummy lulus

---

## P7 - CD-Key
> Menyelesaikan flow penerbitan dan redeem CD-Key.
> **goal**: admin bisa menerbitkan kode dan member bisa redeem satu kali dengan hasil yang konsisten.
> **scope**: `/admin/cdkey`, create/list/filter CD-Key, redeem dari `/console`.

### Task Backlog
- [ ] `P7.1` Implement CD-Key domain backend.
      Target: `src/server/cdkeys/{queries,actions,service,schema,types}.ts`.
      Acceptance: create, generate, redeem, mark used berjalan benar; package disabled tidak bisa dipakai untuk menerbitkan CD-Key baru; redeem CD-Key mengikuti rule aktivasi yang sama dengan source lain, termasuk `is_extended`, larangan dua subscription berjalan pada saat yang sama, same-package extend bila relevan, dan replace package bila aturan PRD mensyaratkan; kode yang diterbitkan sebelum package disabled tetap valid sesuai snapshot-nya.
      Tests: integration test CD-Key service dan disabled-package old-code scenario.

- [ ] `P7.2` Implement UI `/admin/cdkey`.
      Target: `app/admin/cdkey/**`.
      Acceptance: tabel usable penuh dengan search by code, package, used by; filter by status, package, ringkasan package; pagination dan view columns; kolom minimum `code`, `package`, `status`, `used by`, `created by`, `created at`, `updated at`; serta popup add yang mendukung code manual atau auto-generate 8-12 karakter alfanumerik uppercase dan override harga opsional, dengan fallback ke harga package saat ini jika override harga kosong.
      Tests: component and browser checks.

- [ ] `P7.3` Implement redeem dialog pada `/console`.
      Target: console route-local components, subscription/CD-Key action.
      Acceptance: user bisa redeem code dan hasil langsung memengaruhi subscription.
      Tests: integration redeem flow.

- [ ] `P7.4` Implement single-use rule dan snapshot amount.
      Target: CD-Key service dan transaction linkage.
      Acceptance: satu code hanya sukses sekali dan histori tersimpan benar.
      Tests: integration duplicate redeem scenario.

- [ ] `P7.5` Tambahkan regression test CD-Key flow.
      Target: tests CD-Key domain dan member/admin flow.
      Acceptance: admin create dan member redeem stabil, termasuk menjaga asset `private` tidak dipakai dua user aktif sekaligus dan asset `share` maksimal satu assignment aktif per user per platform.
      Tests: unit, integration, browser.

### Browser E2E Checklist
- login admin dan buat CD-Key baru
- buat CD-Key tanpa mengisi code dan verifikasi sistem generate code unik 8-12 karakter uppercase
- disable package yang terkait bila skenario fixture mendukung
- verifikasi package disabled tidak bisa dipilih untuk menerbitkan CD-Key baru
- login member dan redeem code dari `/console`
- verifikasi subscription dan transaction history berubah benar
- redeem CD-Key saat user sudah punya subscription berjalan dan verifikasi rule extend/replace sesuai PRD
- coba redeem code yang sama lagi dan pastikan ditolak
- gunakan search, filter, pagination, dan view columns pada `/admin/cdkey`
- verifikasi CD-Key yang diterbitkan sebelum package disabled tetap bisa diredeem sesuai rule PRD
- pastikan tidak ada browser console error

### Exit Gate
- gate quality lengkap lulus
- Pack A sampai Pack E lulus penuh

---

## P8 - Users Management
> Menyelesaikan operasional user management untuk admin.
> **goal**: admin bisa mengelola akun user dan status aksesnya dengan aman.
> **scope**: `/admin/users`, add user, edit user, ban/unban, change password, detail popup.

### Task Backlog
- [ ] `P8.1` Implement users domain backend.
      Target: `src/server/users/{queries,actions,service,schema,types}.ts`.
      Acceptance: create/edit/ban/unban/change password berjalan benar, termasuk add user dengan input minimum `email`, `password`, dan `role`.
      Tests: integration test users service.

- [ ] `P8.2` Implement helper username suffix dan public ID.
      Target: users service/helper.
      Acceptance: add user menghasilkan username unik dan public ID otomatis.
      Tests: unit test helper.

- [ ] `P8.3` Implement UI `/admin/users`.
      Target: `app/admin/users/**`.
      Acceptance: UI `/admin/users` usable penuh dengan search by ID, email, username, public ID; filter by role, status subscription, ringkasan package aktif; pagination dan view columns; kolom minimum `ID`, `user`, `public ID`, `role`, `subscription status`, `expires at`, `created at`, `updated at`; serta actions `Edit`, `Ban/Unban`, `Change Password`, dan `View Details`, dengan format kolom user `avatar + username + email`.
      Tests: component and browser checks.

- [ ] `P8.4` Implement detail popup user.
      Target: users query/UI.
      Acceptance: profile, avatar editable, fallback avatar konsisten, subscription aktif, asset aktif, transaction history, login history, extension history tampil.
      Tests: integration detail query.

- [ ] `P8.5` Implement ban/unban dan change password flow.
      Target: users action/service.
      Acceptance: ban memblokir akses, unban memulihkan akses, password change bekerja, dan input password pada flow change password mendukung show/hide.
      Tests: integration scenario for ban and password change.

- [ ] `P8.6` Tambahkan regression test users management.
      Target: tests users domain dan admin page.
      Acceptance: user operations stabil.
      Tests: unit, integration, browser.

### Browser E2E Checklist
- login admin dan buka `/admin/users`
- tambah user baru
- edit user tersebut
- verifikasi kolom user menampilkan `avatar + username + email`
- buka detail popup dan verifikasi data utama tampil
- verifikasi fallback avatar muncul konsisten jika `avatar_url` kosong
- ubah avatar user bila flow ini sudah tersedia di phase ini
- ban user lalu coba login sebagai user itu dan pastikan ditolak
- unban user lalu login lagi
- change password user lalu login dengan password baru
- gunakan search, filter, pagination, dan view columns
- pastikan tidak ada browser console error

### Exit Gate
- gate quality lengkap lulus
- Pack A sampai Pack F bagian users lulus

---

## P9 - Dashboard and Logs
> Menyelesaikan admin home dashboard dan halaman logs/reporting.
> **goal**: admin punya visibilitas statistik, aktivitas, dan revenue yang bisa dipakai operasional.
> **scope**: `/admin`, dashboard stats, chart, live users, `/admin/userlogs`.

### Task Backlog
- [ ] `P9.1` Implement admin dashboard stats query.
      Target: `src/server/admin/queries.ts`, `types.ts`.
      Acceptance: dashboard stats query mengembalikan metrik wajib PRD yaitu `total member terdaftar`, `total member berlangganan`, `total subscription private`, `total subscription share`, `total subscription mixed`, `total asset`, dan `total transaksi sukses (Rp)`; `total asset` menghitung inventory yang masih ada termasuk disabled atau expired tetapi tidak termasuk hard-deleted asset; chart `jumlah member`, `jumlah transaksi`, `total sales (Rp)` dengan default range 30 hari; serta `Live User` 50 terbaru yang online jika last seen masih dalam 10 menit terakhir berdasarkan timestamp paling baru dari session atau extension track.
      Tests: integration test admin stats query.

- [ ] `P9.2` Implement UI `/admin` dashboard.
      Target: `app/admin/page.tsx`, `app/admin/_components/**`.
      Acceptance: stat cards, charts, dan live users tampil benar.
      Tests: component and browser checks.

- [ ] `P9.3` Implement userlogs backend queries.
      Target: `src/server/admin/queries.ts` atau domain log yang relevan.
      Acceptance: login history, extension track, dan transaction list bisa difilter; tab transaction memiliki ringkasan revenue; semua tabel mengikuti contract admin table.
      Tests: integration query tests.

- [ ] `P9.4` Implement UI `/admin/userlogs`.
      Target: `app/admin/userlogs/**`.
      Acceptance: UI `/admin/userlogs` usable penuh dengan tiga tab sesuai PRD; tab `Login History` memiliki kolom minimum `user`, `IP`, `browser`, `OS`, `login time` dan filter minimum `date range`, `user`, `OS`; tab `Extension Track` menampilkan kolom minimum `user`, `IP`, `city`, `country`, `browser`, `OS`, `extension version`, `device ID`, `extension ID`, `first seen at`, `last seen at`; tab `Transactions` menampilkan kolom minimum `user`, `package`, `source`, `amount (Rp)`, `status`, `created at`, `updated at` serta ringkasan revenue; seluruh tab yang relevan mendukung pagination dan view columns.
      Tests: component and browser checks.

- [ ] `P9.5` Tambahkan regression test dashboard and logs.
      Target: tests admin/reporting domain.
      Acceptance: dashboard dan logs stabil.
      Tests: unit, integration, browser.

### Browser E2E Checklist
- login admin dan buka `/admin`
- verifikasi 7 stat cards wajib tampil sesuai fixture dan definisi PRD
- verifikasi stat cards tampil
- verifikasi chart render dan range default 30 hari
- verifikasi live users tampil bila fixture ada
- buka `/admin/userlogs` dan cek tab login history
- verifikasi tab login history menampilkan kolom minimum dan filter `date range`, `user`, `OS`
- cek tab extension track
- cek tab transactions, kolom minimum, dan ringkasan revenue
- gunakan filter minimum, pagination, dan view columns di tiap tab yang relevan
- pastikan tidak ada browser console error

### Catatan Phase
Phase ini boleh memakai `extension_tracks` dari fixture atau seed agar dashboard dan logs bisa dibangun lebih awal, tetapi seluruh read model yang bergantung pada extension activity wajib diregress ulang setelah `POST /api/extension/track` benar-benar hidup di `P11`.

### Exit Gate
- gate quality lengkap lulus
- Pack A sampai Pack F lulus penuh

---

## P10 - Cron and Recovery
> Menyelesaikan self-healing system untuk subscription expired dan asset invalid.
> **goal**: sistem bisa menjaga konsistensi access state tanpa intervensi manual terus-menerus.
> **scope**: `/api/cron/expire-subscriptions`, `/api/cron/reconcile-assets`, invalid asset recovery, expire revoke flow.

### Task Backlog
- [ ] `P10.1` Implement cron route handlers.
      Target: `app/api/cron/expire-subscriptions/route.ts`, `app/api/cron/reconcile-assets/route.ts`.
      Acceptance: route bisa memanggil DB function terkait dan mengembalikan response yang jelas.
      Tests: integration route tests.

- [ ] `P10.2` Implement cron security dan config.
      Target: `src/lib/request/**`, env/config helper, route auth helper.
      Acceptance: cron tidak bisa dipanggil sembarang tanpa mekanisme yang disepakati, dan scheduler untuk expire subscription serta reconcile invalid assets dikonfigurasi berjalan minimal tiap 1 menit sesuai PRD.
      Tests: unit and integration security tests.

- [ ] `P10.3` Verifikasi path asset invalid langsung diblokir pada read path.
      Target: query/member console/extension prep helpers.
      Acceptance: asset disabled atau expired tidak muncul di read path aktif walau cron belum jalan.
      Tests: integration test invalid read filter.

- [ ] `P10.4` Implement regression test expire dan reconcile flow.
      Target: tests subscription/assets/cron integration.
      Acceptance: `expire_subscriptions_job` dan `reconcile_invalid_assets_job` bekerja sesuai PRD.
      Tests: integration heavy scenarios.

### Browser E2E Checklist
- siapkan fixture member dengan asset aktif
- disable asset dari admin UI dan verifikasi read path member berubah tanpa menunggu cron
- jalankan route cron reconcile bila perlu di test env dan verifikasi hasil di UI
- siapkan fixture subscription yang harus expired lalu jalankan route cron expire
- verifikasi asset assignment tercabut dari UI member
- pastikan tidak ada browser console error

### Exit Gate
- gate quality lengkap lulus
- Pack A sampai Pack G lulus

---

## P11 - Extension API
> Menyelesaikan API backend untuk extension setelah dependency web app yang relevan sudah stabil.
> **goal**: backend siap melayani extension dengan validasi session, asset, nonce, dan tracking yang aman.
> **scope**: `GET /api/extension/session`, `GET /api/extension/asset`, `POST /api/extension/track`, nonce helper, error contract baku.

### Task Backlog
- [ ] `P11.0` Kunci contract extension untuk subscription expired dan canceled sebelum coding endpoint.
      Target: catatan keputusan di dokumen implementasi phase atau test contract endpoint.
      Acceptance: `GET /api/extension/session` wajib menolak request dengan error baku untuk subscription `expired` atau `canceled`; endpoint ini hanya boleh sukses untuk session valid milik user non-banned dengan subscription `active` atau `processed`.
      Tests: integration contract test untuk expired/canceled subscription.

- [ ] `P11.1` Implement extension security helpers.
      Target: `src/server/extension/**`, `src/lib/request/**`, `src/lib/nonce/**`, `src/lib/errors/**`.
      Acceptance: validasi header, origin, session, banned status, endpoint-specific nonce, dan error code baku siap dipakai endpoint, termasuk `EXT_ORIGIN_DENIED`, `EXT_HEADER_REQUIRED`, `NONCE_REQUIRED`, `NONCE_INVALID`, `SESSION_MISSING`, `SESSION_REVOKED`, `USER_BANNED`, `SUBSCRIPTION_EXPIRED`, `ASSET_NOT_ALLOWED`, dan `NOT_FOUND`.
      Tests: unit test validator dan error mapper.

- [ ] `P11.2` Implement `GET /api/extension/session`.
      Target: `app/api/extension/session/route.ts`, extension service/query.
      Acceptance: response `camelCase`, asset metadata valid saja, nonce 60 detik tersedia, dan endpoint hanya sukses untuk session valid milik user non-banned dengan subscription `active` atau `processed`.
      Tests: integration endpoint test.

- [ ] `P11.3` Implement `GET /api/extension/asset`.
      Target: `app/api/extension/asset/route.ts`, extension service/query.
      Acceptance: asset detail hanya keluar bila assignment valid, subscription berstatus `active` atau `processed`, nonce valid, dan asset masih active inventory; request tanpa nonce, asset yang tidak diizinkan, atau asset yang tidak ditemukan wajib ditolak dengan error baku yang sesuai.
      Tests: integration endpoint test.

- [ ] `P11.4` Implement `POST /api/extension/track`.
      Target: `app/api/extension/track/route.ts`, extension service.
      Acceptance: heartbeat hanya boleh sukses untuk session valid milik user non-banned dengan subscription `active` atau `processed`; jika subscription `expired`, `canceled`, atau tidak ada subscription berjalan, request ditolak dengan `SUBSCRIPTION_EXPIRED`. Untuk request yang valid, server mengekstrak `ip_address`, `city`, dan `country` secara server-side; menulis atau meng-update `extension_tracks` dengan identity `user_id + device_id + ip_address + extension_id`; jika identity sama maka `last_seen_at`, `extension_version`, `browser`, dan `os` diperbarui; jika identity berbeda maka row baru dibuat.
      Tests: integration endpoint test.

- [ ] `P11.5` Implement standar error response extension.
      Target: error helper/mapper.
      Acceptance: seluruh endpoint mengembalikan format error baku.
      Tests: unit and integration error scenarios.

- [ ] `P11.6` Siapkan precondition browser untuk validasi origin extension asli.
      Target: extension shell minimal atau konteks browser yang bisa memuat `chrome-extension://<extension_id>`.
      Acceptance: browser agent dapat menguji allowlist origin extension asli, bukan hanya simulasi HTTP biasa.
      Tests: browser-assisted verification untuk origin asli.

- [ ] `P11.7` Tambahkan regression test extension API.
      Target: tests extension domain dan route handlers.
      Acceptance: semua kombinasi error penting dan success path tertutup test.
      Tests: unit, integration, browser-assisted verification.

### Browser E2E Checklist
- login member dari web app agar `app_session` tersedia
- dari browser agent, verifikasi endpoint session dapat dipanggil dari origin extension yang di-allowlist
- verifikasi response session hanya berisi asset metadata yang valid
- verifikasi subscription `expired` atau `canceled` ditolak dengan error baku
- verifikasi request asset dengan nonce valid mengembalikan detail asset yang diizinkan
- verifikasi request tanpa `x-extension-id` ditolak dengan error baku
- verifikasi request dengan `Origin` yang tidak di-allowlist ditolak dengan error baku
- verifikasi request tanpa session atau dengan session hilang ditolak dengan error baku
- verifikasi request asset tanpa nonce ditolak dengan error baku
- verifikasi request asset dengan nonce salah atau kedaluwarsa ditolak dengan format error baku
- verifikasi request asset yang tidak diizinkan ditolak dengan `ASSET_NOT_ALLOWED`
- verifikasi request asset yang tidak ditemukan ditolak dengan `NOT_FOUND`
- verifikasi track endpoint menulis heartbeat sukses
- verifikasi track endpoint ditolak dengan `SUBSCRIPTION_EXPIRED` untuk subscription `expired`, `canceled`, atau tanpa subscription berjalan
- kirim heartbeat dua kali dengan identity yang sama dan verifikasi row yang sama di-update, bukan membuat duplikasi
- verifikasi user banned atau session revoked ditolak
- pastikan tidak ada browser console error

### Catatan Phase
Validasi `chrome-extension://<extension_id>` yang benar-benar asli adalah gate wajib phase ini. Jika precondition extension shell atau konteks browser yang bisa memuat origin extension belum tersedia, maka phase ini belum boleh ditandai selesai.

### Exit Gate
- gate quality lengkap lulus
- Pack A sampai Pack H bagian extension lulus penuh
- validasi origin extension asli di browser lulus

---

## P12 - Release Candidate
> Menutup seluruh pekerjaan dengan staging regression penuh dan kesiapan rilis.
> **goal**: project lolos full regression di staging dan siap dipromosikan ke release v1.
> **scope**: full regression staging, env hardening, release checklist, rollback note, deployment readiness.

### Task Backlog
- [ ] `P12.1` Rapikan env, secret, dan deployment config.
      Target: env docs, deployment config, scheduler config.
      Acceptance: staging dan production punya konfigurasi yang jelas dan aman, termasuk scheduler cron minimal tiap 1 menit untuk expire subscription dan reconcile invalid assets.
      Tests: smoke deploy verification.

- [ ] `P12.2` Buat checklist operasional release.
      Target: release doc, rollback note, post-deploy checklist.
      Acceptance: tim tahu urutan deploy, verifikasi, dan rollback dasar.
      Tests: dry run checklist review.

- [ ] `P12.3` Jalankan full regression di staging.
      Target: seluruh app dan data staging test.
      Acceptance: semua pack A-H lulus di staging yang bersih.
      Tests: browser E2E full sweep + quality gate penuh.

- [ ] `P12.4` Tutup defect release-blocker dan freeze scope.
      Target: backlog release.
      Acceptance: tidak ada blocker terbuka untuk acceptance rules PRD.
      Tests: rerun full suite setelah fix.

### Browser E2E Checklist
- jalankan seluruh critical path member
- jalankan seluruh critical path admin
- jalankan cron validation di staging jika memungkinkan
- jalankan extension API validation termasuk origin extension asli, missing header, bad origin, missing session, revoked session, banned user, dan invalid nonce
- pastikan semua halaman utama bebas browser console error

### Exit Gate
- seluruh quality gate lulus di staging
- seluruh regression pack lulus
- acceptance rules utama PRD tidak dilanggar

---

## 8. Backlog Order yang Direkomendasikan
Urutan kerja yang direkomendasikan sekarang mengikuti dependency graph dan convergence gate berikut:

### Track 0 - Fondasi Global
- `P0` selesai penuh
- `P1` selesai penuh
- `P1F` selesai penuh

### Track 1 - Read Path dan Fondasi Admin
- `P2` boleh berjalan setelah `P1F`
- `P3.1-P3.3` harus tersedia sebagai fondasi admin shell, shared admin table, dan package domain

### Track 2 - Paralel Agresif Pertama
Setelah `P3.1-P3.3` tersedia, track berikut boleh berjalan paralel:
- `P3.4-P3.6` package UI dan package regression
- `P4.1-P4.6` asset domain, asset UI, dan asset regression
- revisi UI/UX `P2` bila diperlukan, selama tidak mengubah kontrak domain secara liar

### Convergence Alpha
Sebelum `P5` dimulai penuh, seluruh dependency langsung berikut harus minimal hijau:
- package domain `P3.3`
- asset domain `P4.1`
- regression yang relevan dari track package dan asset tidak merah

Idealnya `P3.4-P3.6` dan `P4.2-P4.6` juga sudah selesai bila targetnya adalah browser workflow admin yang utuh.

### Track 3 - Activation Channels
Setelah Convergence Alpha:
- `P5` menjadi track utama pertama yang menggabungkan package + asset + subscription engine
- `P6` boleh mulai setelah package domain stabil, member console read path stabil, dan subscription core `P5.1` siap
- `P7` boleh mulai setelah package domain stabil dan subscription core `P5.1` siap

`P6` dan `P7` boleh berjalan paralel selama kontrak subscription atau package yang dipakai bersama tidak diubah tanpa koordinasi.

### Convergence Beta
Sebelum `P9`, `P10`, dan `P11` ditutup penuh:
- activation path admin manual, payment dummy, dan CD-Key harus stabil
- disabled package rule harus lolos pada manual assign, payment dummy, dan CD-Key
- read path asset dan subscription harus konsisten terhadap disable, delete, cancel, expire, dan processed state

### Track 4 - Operasional Admin dan Sistem
- `P8` dapat berjalan setelah fondasi admin shell/table cukup stabil
- `P9` dapat mulai ketika data source dashboard dan logs yang dipakai sudah tersedia dan cukup stabil
- `P10` menunggu domain subscriptions dan assets final cukup stabil
- `P11` menunggu session, subscription, dan asset read path final cukup stabil; tidak harus menunggu seluruh `P10` selesai penuh, tetapi rule invalid read path dan contract recovery yang memengaruhi endpoint extension tidak boleh masih berubah liar

### Final Convergence
- `P12` menutup seluruh pekerjaan setelah semua track utama, regression pack, dan browser checklist lintas dependency hijau penuh

---

## 9. Aturan Kerja untuk Junior Developer atau Agent AI Murah
Aturan implementasi harian:
- ambil hanya satu task backlog aktif pada satu waktu
- kerjakan task sampai selesai berikut test unit dan integration minimumnya
- jangan mulai task dependency downstream jika minimum gate dependency upstream masih merah
- task dari phase berbeda boleh aktif bersamaan hanya jika berada di track paralel yang sah dan owner area kodenya jelas
- setelah satu track atau subphase usable, jalankan browser E2E checklist yang relevan untuk route tersebut
- setelah convergence gate tercapai, rerun regression pack yang diwajibkan oleh dependency yang bertemu
- phase baru dinyatakan selesai setelah exit gate phase itu hijau, walaupun task paralel phase lain masih berjalan

Aturan review:
- setiap task harus menyebut file target utama
- setiap task harus punya acceptance criteria yang bisa diuji
- setiap task harus menyebut test minimum yang wajib ditambah
- setiap perubahan harus menjaga import boundary sesuai `FOLDER-STRUCTURE.md`
- jika task menyentuh admin table, review wajib mengecek `search`, `filter`, `view columns`, dan `pagination`
- jika task menyentuh flow yang termasuk PRD-critical rules, regression test eksplisitnya wajib disebut di review

---

## 10. Definition of Release Ready
Project dianggap siap rilis jika seluruh kondisi berikut terpenuhi:
- semua phase `P0` sampai `P12` selesai
- semua regression pack lulus
- seluruh acceptance rule utama di `PRD.md` terjaga
- migration bisa di-apply dari nol tanpa error
- staging lolos full regression
- secret sudah aman dan tidak hardcoded di repo
- cron aktif dan tervalidasi
- extension API siap dipakai dan validasi origin extension asli sudah lulus

Dokumen ini harus dipakai sebagai urutan implementasi utama sampai project v1 selesai.
