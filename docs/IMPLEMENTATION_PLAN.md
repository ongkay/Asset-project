# E2E Implementation Plan
## Tujuan
Dokumen ini menjadi rencana implementasi delivery project secara bertahap dengan prinsip vertical slice E2E. Setiap phase harus selesai end-to-end, bisa diuji langsung dari browser, dan tidak dianggap lulus jika baru selesai di level UI saja atau backend saja.

Dokumen source of truth yang harus selalu diikuti:
- `docs/PRD.md` untuk business rules, flow, dan kontrak API
- `docs/DB.md` untuk schema, constraint, dan invariant database
- `docs/agent-rules/folder-structure.md` untuk struktur folder implementasi

## Prinsip Delivery E2E
- setiap phase harus punya `write path`, `read path`, dan `negative path`
- hasil mutation harus bisa langsung dibaca kembali dari UI phase yang sama
- phase tidak lulus jika pembuktiannya hanya mengandalkan browser tanpa invariant backend, atau hanya mengandalkan query backend tanpa flow browser nyata
- verifikasi browser manual wajib dilakukan pada route nyata memakai `agent-browser` CLI melalui skill `agent-browser`, bukan hanya pemeriksaan non-browser atau inspeksi database
- verifikasi browser tidak mensyaratkan pembuatan file test; gunakan checklist phase sebagai panduan manual yang dijalankan lewat `agent-browser` CLI
- role guard, session guard, dan error state yang relevan wajib ikut selesai di phase tempat feature itu dikirim
- setiap phase harus tetap menjaga acceptance rules utama di `docs/PRD.md`
- invariant server-side yang tidak browser-visible tetap wajib benar, dan pembuktiannya harus lewat trusted server-side diagnostic path yang repeatable
- untuk project ini, trusted server-side diagnostic path default adalah `npx @insforge/cli` dengan mode read-only

## Definition of Done per Phase
Sebuah phase baru dianggap lulus jika semua poin ini terpenuhi:
- route utama phase dapat dibuka langsung dari browser tanpa runtime error
- flow utama phase bisa dijalankan sampai selesai dari UI
- hasil perubahan data bertahan setelah reload halaman
- negative path utama menampilkan error state yang benar dan tidak merusak data
- direct URL access ke route phase tetap aman dan tunduk pada role guard
- backend invariant phase yang relevan lolos melalui verifikasi read-only memakai InsForge CLI
- tidak ada langkah verifikasi yang bergantung pada edit database manual di tengah flow

## Prasyarat Global Sebelum Mulai
- apply migration mengikuti urutan di `migrations/README.md`, dari `001` sampai `030`
- baseline migration hanya boleh dijalankan pada database yang sudah memiliki schema `auth.users`
- plain local Postgres tanpa schema auth tidak cukup untuk baseline project ini
- `040_dev_seed_full.sql` membutuhkan auth user development lebih dulu di `auth.users`
- `041_dev_seed_loginable_users.sql` bergantung pada `040_dev_seed_full.sql` dan tidak boleh dijalankan sendiri pada database kosong
- migration baseline `001` sampai `030`, `040`, dan `041` harus applied ke database InsForge yang benar-benar dipakai runtime app
- route app sudah dipindah mengikuti struktur `(public)`, `(member)`, `(admin)`, dan `api`
- `DATABASE_URL` dan env InsForge runtime sudah mengarah ke project yang sama dengan data seed
- database yang dipakai tooling admin atau MCP tidak boleh diasumsikan identik dengan database runtime app; verifikasi harus selalu mengacu ke `DATABASE_URL` runtime
- tersedia inbox email development untuk flow reset password
- tersedia strategi verifikasi browser manual yang dapat diulang memakai `agent-browser` CLI melalui skill `agent-browser`
  - gunakan checklist browser pada setiap phase sebagai panduan verifikasi manual
  - jangan membuat file test browser hanya untuk memenuhi gate phase, kecuali ada kebutuhan eksplisit terpisah
  - alat browser lain hanya boleh dipakai jika `agent-browser` CLI terbatas untuk langkah tertentu, dan alasannya harus dicatat
- tersedia extension dev harness khusus untuk phase Extension API karena validasi `Origin` extension tidak bisa diverifikasi akurat dari tab browser biasa
- verifikasi baseline minimum setelah apply migration:
  - semua enum, tabel, trigger, view, dan helper function terbentuk
  - RLS aktif
  - grants untuk `authenticated` dan `project_admin` tersedia
  - helper RPC bisa dipanggil

## Akun Seed Browser
Gunakan akun dari `migrations/041_dev_seed_loginable_users.sql` untuk verifikasi manual dan verifikasi dasar browser.

Shared password:
- `Devpass123`

Akun utama:
- `seed.admin.browser@assetnext.dev`
- `seed.active.browser@assetnext.dev`
- `seed.processed.browser@assetnext.dev`
- `seed.expired.browser@assetnext.dev`
- `seed.canceled.browser@assetnext.dev`
- `seed.none.browser@assetnext.dev`

## Catatan Khusus `/admin` dan `/console`
- final dashboard statistik `/admin` sengaja ditunda ke Phase 9
- namun route `/admin` tetap harus sudah ada sejak Phase 1 sebagai guarded admin shell
- pada Phase 1 sampai Phase 8, `/admin` boleh berupa placeholder atau hub admin minimal yang berisi link ke feature admin yang sudah selesai
- final dashboard member `/console` baru dianggap selesai di Phase 6
- namun route `/console` tetap harus sudah ada sejak Phase 1 sebagai guarded member shell agar redirect auth tetap konsisten dengan PRD

## Guardrail Teknis Global
Semua phase harus mematuhi rule teknis berikut agar hasil implementasi tetap sesuai PRD:
- UI web internal tidak boleh membuka REST endpoint publik baru selain `/api/extension/*` dan endpoint cron tepercaya
- mutation UI web harus memakai Server Actions atau server-side layer internal
- query dan mutation admin harus berjalan server-side dengan session user admin biasa
- browser admin tidak boleh memakai credential `project_admin`, service credential, atau credential database istimewa lain di client side
- lifecycle auth, session, login log, dan activation tidak boleh diimplementasikan sebagai akses tabel langsung dari browser; flow ini harus lewat trusted server-side path yang sesuai dengan baseline RLS
- semua read path admin dan member harus tunduk pada policy aplikasi dan session aktif
- jika baseline SQL sudah menyediakan safe RPC untuk read path sensitif, implementasi harus memanfaatkannya sebelum membuat ulang query manual yang setara
- seluruh route `/admin/*` wajib admin-only
- seluruh password input wajib mendukung show/hide
- semua tabel admin wajib punya search, filter dropdown, view column persistence, dan pagination
- jika tabel admin menampilkan user, format tampilannya wajib `avatar + username + email`
- jika avatar user kosong, UI wajib menampilkan fallback avatar dari inisial username dengan warna background acak tetapi konsisten per user

## Backend Invariant Verification Via InsForge CLI
Gunakan InsForge CLI untuk membuktikan side effect backend yang tidak terlihat langsung di browser.

Aturan umum:
- selalu gunakan `npx @insforge/cli`, jangan install global dan jangan memanggil binary global `insforge`
- mulai sesi verifikasi dengan:
  - `npx @insforge/cli whoami`
  - `npx @insforge/cli current`
- jika perlu memeriksa konfigurasi backend lebih luas, lanjutkan dengan `npx @insforge/cli metadata --json`
- default output yang disarankan adalah `--json` bila command mendukungnya agar hasil mudah ditinjau agent
- utamakan `npx @insforge/cli db rpc <fn>` bila baseline sudah menyediakan helper RPC yang relevan
- gunakan `npx @insforge/cli db query "<sql>"` hanya untuk query read-only seperti `select`, `count`, `exists`, atau memeriksa row hasil side effect
- untuk schedule, cron, atau eksekusi backend terjadwal, gunakan `npx @insforge/cli schedules *`, `npx @insforge/cli logs *`, atau `npx @insforge/cli diagnose *` bila relevan
- verifikasi backend tidak boleh memakai `insert`, `update`, `delete`, `import`, `seed`, atau mutasi lain untuk membantu feature tampak lolos
- verifikasi backend harus mengarah ke project yang sama dengan app runtime, bukan sekadar project yang sedang linked tetapi berbeda dari `DATABASE_URL` runtime

Prinsip pembuktian:
- browser manual membuktikan user journey
- InsForge CLI membuktikan side effect server-side dan invariant data
- jika invariant backend sudah browser-visible di phase yang sama, tetap boleh divalidasi dari browser; CLI dipakai untuk hal yang tidak cukup terlihat di UI

Contoh pola command yang dianjurkan:
```bash
npx @insforge/cli whoami
npx @insforge/cli current
npx @insforge/cli metadata --json
npx @insforge/cli db rpc get_admin_dashboard_stats --data '{"p_from":"2026-04-01T00:00:00Z","p_to":"2026-04-30T23:59:59Z"}'
npx @insforge/cli db rpc get_user_console_snapshot --data '{"p_user_id":"<user-uuid>"}'
npx @insforge/cli db query "select user_id, revoked_at, last_seen_at from public.app_sessions where user_id = '<user-uuid>' order by created_at desc" --json
```

Catatan pemakaian:
- `db rpc` dipakai untuk helper runtime yang memang sudah tersedia di baseline SQL
- `db query` dipakai untuk verifikasi read-only saat tidak ada helper RPC yang cocok
- query verifikasi harus spesifik pada row yang baru dipengaruhi flow browser, bukan query lebar yang sulit diaudit

## Urutan Phase
| Phase | Nama                             | Fokus Utama                                      |
| ----- | -------------------------------- | ------------------------------------------------ |
| 0     | Foundation                       | fondasi app, env, shell route, dan verifikasi    |
| 1     | Auth                             | login, register, reset password, logout, session |
| 2     | Admin Package                    | CRUD package dan entitlement                     |
| 3     | Admin Asset                      | inventory asset dan operasional dasar            |
| 4     | Admin Subscriptions              | manual subscription dan assignment override      |
| 5     | Admin CD-Key                     | issue dan kelola CD-Key                          |
| 6     | Member Console dan Payment Dummy | console member, extend, redeem, payment dummy    |
| 7     | User Management                  | create user, ban, password, detail user          |
| 8     | User Logs                        | login history, extension track, transaction logs |
| 9     | Admin Home                       | statistik `/admin`, chart, live user             |
| 10    | Cron and Recovery                | reconciliation job dan recovery flow             |
| 11    | Extension API                    | session, asset detail, track, standard error     |

## Phase 0. Foundation
Tujuan phase ini adalah menyiapkan fondasi agar phase selanjutnya benar-benar bisa dikerjakan dan diuji secara E2E tanpa bolak-balik merombak infrastruktur.

Backlog rinci untuk phase ini ada di `docs/PHASE_0_FOUNDATION_BACKLOG.md`.

Scope wajib:
- setup env runtime dan koneksi InsForge
- env contract dipisah aman antara server-only dan client-safe access
- setup `src/lib/insforge/*`
- setup `src/lib/safe-action/client.ts`
- setup `@tanstack/react-query` provider
- setup session helper, cookie helper, dan role guard dasar
- dokumentasikan contract session web:
  - cookie `app_session` membawa opaque token
  - database hanya menyimpan `token_hash`, bukan token mentah
  - validasi session dilakukan dengan hash lookup ke `app_sessions`
  - revoke session dilakukan dengan mengisi `revoked_at`
  - invariant satu session aktif per user harus mengikuti unique partial index baseline
- tentukan trusted server-side path untuk write yang tidak bisa mengandalkan akses tabel biasa karena RLS, minimal untuk:
  - login dan logout
  - create dan revoke `app_sessions`
  - tulis `login_logs`
  - activation flow `payment_dummy`, `cdkey`, dan `admin_manual`
- tetapkan shared activation service tunggal di app layer yang dipakai bersama oleh `payment_dummy`, `cdkey`, dan `admin_manual`
- phase 0 hanya perlu mengunci boundary dan kontrak service ini; jangan menghidupkan helper SQL aktivasi lintas source baru sebelum phase yang benar-benar membutuhkannya
- tetapkan strategi update `app_sessions.last_seen_at` pada request atau page load terautentikasi agar `Live User` dapat berfungsi
- tetapkan strategi `requestNonce` yang session-bound dan valid 60 detik untuk phase extension API
- tetapkan sumber config extension allowlist dan sumber metadata jaringan:
  - allowlist `x-extension-id` dan `Origin`
  - trusted source untuk `ip`, `city`, dan `country`
- buat route shell dasar:
  - `src/app/(public)/login/page.tsx`
  - `src/app/(public)/reset-password/page.tsx`
  - `src/app/(member)/console/page.tsx`
  - `src/app/(admin)/admin/page.tsx`
- siapkan layout dasar untuk `(member)` dan `(admin)`
- dokumentasikan cara reset data seed dan memulai dev server
- siapkan baseline verifikasi dasar browser manual memakai `agent-browser` CLI melalui skill `agent-browser`

Hasil minimal yang harus ada:
- app bisa boot dengan struktur folder final
- route auth, member shell, dan admin shell sudah bisa dibuka
- role guard dasar sudah bekerja
- seed account bisa dipakai pada phase auth berikutnya
- keputusan runtime yang memengaruhi semua phase berikutnya sudah terkunci:
  - contract `app_session`
  - shared activation service
  - touch `last_seen_at`
  - desain `requestNonce`
  - source allowlist extension dan metadata IP/geo

Checklist verifikasi browser manual untuk lulus:
- [ ] buka `/login` dan pastikan halaman render tanpa runtime error
- [ ] buka `/reset-password` dan pastikan halaman render tanpa runtime error
- [ ] akses `/console` tanpa login harus diarahkan ke flow auth
- [ ] akses `/admin` tanpa login harus diarahkan ke flow auth
- [ ] login sebagai admin atau member belum wajib sukses pada phase ini, tetapi shell route dan guard dasar harus siap untuk phase 1

Backend invariant verification via InsForge CLI:
- [ ] `npx @insforge/cli whoami` dan `npx @insforge/cli current` berhasil dan menunjuk ke project yang sama dengan runtime app
- [ ] verifikasi baseline schema minimum tersedia melalui `npx @insforge/cli db tables`, `db policies`, `db triggers`, atau `metadata --json`
- [ ] verifikasi helper runtime minimum tersedia, terutama `get_user_console_snapshot`, `get_user_asset_detail`, `get_admin_dashboard_stats`, `expire_subscriptions_job`, dan `reconcile_invalid_assets_job`
- [ ] verifikasi akun seed browser ada pada data runtime yang benar sebelum masuk ke phase berikutnya

### Workflow Setup Browser Dev
- apply migration `001_extensions.sql` sampai `030_rpc.sql` secara berurutan
- pastikan target database sudah memiliki schema `auth.users` sebelum apply baseline
- apply `040_dev_seed_full.sql`
- apply `041_dev_seed_loginable_users.sql`
- pastikan `DATABASE_URL` runtime app mengarah ke database yang sama dengan data seed tersebut
- jalankan `pnpm dev`
- jalankan checklist browser phase secara manual memakai `agent-browser` CLI melalui skill `agent-browser` untuk verifikasi dasar yang dapat diulang
- jika verifikasi manual memakai browser, selalu cek terhadap app runtime yang memakai `DATABASE_URL`, bukan database tooling admin/MCP yang kebetulan aktif

## Phase 1. Auth
Tujuan phase ini adalah menyelesaikan seluruh flow autentikasi sampai user benar-benar bisa masuk, keluar, dan mengganti password dari browser.

Scope wajib:
- `/login` dengan email step, password step, dan register step dalam satu flow
- cek email terdaftar vs belum terdaftar
- register dengan password dan confirm password
- password minimum 6 karakter pada register dan reset password
- show/hide password untuk semua field password
- auto login setelah register berhasil
- failed login counter per email
- CTA `Reset Password` baru muncul setelah 5 gagal login berturut-turut
- counter gagal login reset saat login berhasil atau setelah lewat 15 menit sejak kegagalan terakhir
- `/reset-password` untuk request reset dan set password baru
- response request reset password harus generik agar tidak membocorkan email terdaftar atau tidak
- reject user banned sebelum session `app_session` baru dibuat
- create session `app_session`
- simpan hanya `token_hash` ke `app_sessions`, bukan token mentah
- validasi session aktif memakai hash lookup ke row `app_sessions` yang `revoked_at is null`
- revoke session lama saat login atau register berhasil
- logout
- login log sukses dan gagal
- redirect role:
  - member ke `/console`
  - admin ke `/admin`

Hasil minimal yang harus ada:
- `/console` dan `/admin` sudah menjadi guarded shell yang benar setelah login berhasil
- single-device login enforcement sudah aktif
- banned user sudah ditolak pada login dan tidak bisa melewati guarded shell

Checklist verifikasi browser manual untuk lulus:
- [ ] login sebagai `seed.active.browser@assetnext.dev` dengan password benar dan pastikan redirect ke `/console`
- [ ] login sebagai `seed.admin.browser@assetnext.dev` dengan password benar dan pastikan redirect ke `/admin`
- [ ] masukkan email baru di `/login`, lanjut register, lalu pastikan user auto login dan mendapat `app_session`
- [ ] coba register dengan password kurang dari 6 karakter dan pastikan form ditolak dengan error yang jelas
- [ ] pastikan semua field password di login, register, dan reset password mendukung show/hide
- [ ] lakukan 5 kali login gagal pada email yang sama dan pastikan CTA atau dialog reset password muncul
- [ ] sebelum 5 kali gagal, pastikan CTA reset password belum tampil
- [ ] setelah login berhasil pada email yang sama, pastikan failed counter reset dan CTA reset password hilang kembali
- [ ] verifikasi reset counter berbasis 15 menit dengan clock dev, seeded state, atau helper dev yang setara agar tidak perlu menunggu manual 15 menit di browser
- [ ] jalankan flow `/reset-password` sampai set password baru berhasil lalu pastikan user diarahkan kembali ke shell yang benar, atau ke `/login` dengan instruksi jelas jika auth provider tidak mengembalikan authenticated context
- [ ] pada flow set password baru, coba simpan password kurang dari 6 karakter dan pastikan form ditolak
- [ ] kirim request reset password untuk email yang tidak terdaftar dan pastikan UI tetap menampilkan pesan sukses generik yang sama
- [ ] buka link reset token yang invalid atau expired dan pastikan UI menampilkan state error yang benar
- [ ] siapkan satu akun member dalam status banned lewat trusted admin atau dev setup, lalu pastikan login ditolak tanpa membuat session app baru
- [ ] klik logout dan pastikan route member atau admin tidak lagi bisa diakses tanpa login ulang
- [ ] login pada browser normal lalu login lagi dengan user yang sama di incognito atau browser lain dan pastikan session lama langsung tidak valid
- [ ] reload halaman setelah login dan pastikan session tetap terbaca dengan benar

Backend invariant verification via InsForge CLI:
- [ ] verifikasi login sukses menulis row `login_logs` dengan `is_success = true` untuk email yang dipakai
- [ ] verifikasi login gagal menulis row `login_logs` dengan `is_success = false` dan `failure_reason` yang relevan
- [ ] verifikasi setelah login sukses hanya ada satu row aktif di `app_sessions` untuk user tersebut
- [ ] verifikasi saat login kedua pada browser lain, session lama mendapat `revoked_at` dan session baru menjadi satu-satunya row aktif
- [ ] verifikasi akun banned tidak menghasilkan session aktif baru di `app_sessions`

## Phase 2. Admin Package
Tujuan phase ini adalah menyelesaikan pengelolaan package sehingga package sudah siap dipakai oleh phase subscription, CD-Key, dan payment dummy.

Scope wajib:
- route `/admin/package`
- tabel admin dengan search, filter, pagination, dan view column persistence
- kolom minimum tabel: `name`, `amount (Rp)`, `duration (days)`, `checkout URL`, `total used`, `created at`, `updated at`, `action`
- create package
- edit package
- validasi entitlement exact `platform + asset_type`
- validasi duplicate entitlement pada package yang sama
- `is_extended`
- `checkout_url`
- `Disable/Enable` package
- read model admin untuk `total used`

Hasil minimal yang harus ada:
- package aktif dan nonaktif bisa dibedakan jelas di UI
- data package yang dibuat pada phase ini siap dipakai phase 4, 5, dan 6
- ringkasan package `private/share/mixed` hanya dipakai untuk badge, filter, dan reporting, bukan untuk otorisasi asset

Checklist verifikasi browser manual untuk lulus:
- [ ] login sebagai admin dan buka `/admin/package`
- [ ] buat package baru dengan kombinasi entitlement valid lalu pastikan row baru muncul di tabel setelah submit
- [ ] coba simpan package dengan duplicate entitlement dan pastikan form ditolak dengan error yang jelas
- [ ] edit package yang sudah ada lalu pastikan perubahan tampil setelah reload
- [ ] search package berdasarkan nama dan filter berdasarkan ringkasan package lalu pastikan hasil tabel berubah sesuai input
- [ ] disable package dari tabel lalu pastikan status visual berubah dan data tetap ada
- [ ] enable kembali package yang sama lalu pastikan bisa aktif lagi tanpa kehilangan history row
- [ ] ubah pilihan kolom tabel, reload halaman, lalu pastikan preferensi kolom tetap tersimpan

Backend invariant verification via InsForge CLI:
- [ ] verifikasi package baru atau hasil edit benar-benar tersimpan di `public.packages`
- [ ] verifikasi field penting `amount_rp`, `duration_days`, `is_extended`, `access_keys_json`, `checkout_url`, dan `is_active` sesuai hasil UI
- [ ] verifikasi `access_keys_json` hanya berisi access key exact yang valid dan tidak mengandung duplikasi
- [ ] verifikasi label ringkasan package konsisten dengan `public.get_package_summary(access_keys_json)` bila helper ini dipakai pada read model

## Phase 3. Admin Asset
Tujuan phase ini adalah menyelesaikan inventory asset dan operasi dasar asset agar admin bisa menyiapkan bahan fulfillment subscription.

Scope wajib:
- route `/admin/assets`
- tabel admin dengan search, filter, pagination, dan view column persistence
- kolom minimum tabel: `platform`, `expires at`, `note`, `asset type`, `status`, `total used`, `created at`, `updated at`, `actions`
- search by platform, note, username, dan email pemakai
- filter by asset type, status, dan date range
- create asset
- edit asset
- view detail asset
- tampilkan user yang sedang memakai asset bila ada
- `Disable/Enable` asset
- `Delete` asset aman
- status turunan asset: `available`, `assigned`, `expired`, `disabled`
- `total used`
- default `expires_at = now + 30 hari` pada flow create asset

Hasil minimal yang harus ada:
- admin dapat mengelola inventory asset dari browser tanpa SQL manual
- data asset siap dipakai phase subscription dan recovery

Checklist verifikasi browser manual untuk lulus:
- [ ] login sebagai admin dan buka `/admin/assets`
- [ ] buat asset `private` baru lalu pastikan row muncul di tabel
- [ ] buat asset `share` baru lalu pastikan row muncul di tabel
- [ ] saat membuka form create asset baru, pastikan `expires_at` default terisi `now + 30 hari`
- [ ] buka detail asset dan pastikan field penting tampil lengkap
- [ ] edit `note`, `proxy`, atau `expires_at` lalu pastikan perubahan bertahan setelah reload
- [ ] disable asset aktif dan pastikan status berubah menjadi `disabled`
- [ ] enable kembali asset yang sama dan pastikan status kembali valid
- [ ] delete asset yang tidak sedang dipakai dan pastikan row hilang dari inventory aktif
- [ ] search asset berdasarkan platform, note, atau user pemakai dan pastikan hasil tabel berubah sesuai query
- [ ] filter asset berdasarkan `asset_type` atau status dan pastikan hasil tabel berubah sesuai filter

Backend invariant verification via InsForge CLI:
- [ ] verifikasi asset baru atau hasil edit benar-benar tersimpan di `public.assets`
- [ ] verifikasi field `platform`, `asset_type`, `account`, `note`, `proxy`, `asset_json`, `expires_at`, dan `disabled_at` sesuai aksi UI
- [ ] verifikasi status turunan asset konsisten melalui `v_asset_status`
- [ ] verifikasi disable asset mengisi `disabled_at` dan enable asset mengembalikannya ke kondisi aktif
- [ ] verifikasi hard delete benar-benar menghapus row asset dari inventory aktif tanpa membuat data yatim yang melanggar constraint

## Phase 4. Admin Subscriptions
Tujuan phase ini adalah menyelesaikan pengelolaan subscription manual oleh admin, termasuk assignment override dan pembentukan transaction `admin_manual`.

Scope wajib:
- route `/admin/subscriber`
- tabel admin dengan search, filter, pagination, dan view column persistence
- kolom minimum tabel: `user`, `subscription status`, `start date`, `expires at`, `total spent (Rp)`, `package name`, `action`
- auto-search by username, user ID, dan email
- filter by asset type, subscription status, dan date range
- popup `Add New / Edit Subscriber`
- pilih user
- pilih package
- override duration
- candidate asset sesuai exact entitlement package
- manual asset override untuk satu atau lebih entitlement
- fallback fulfillment otomatis untuk entitlement yang tidak dioverride manual
- quick add asset dari popup subscriber
- quick add asset minimal meminta `platform`, `account`, `duration_days`, `note`, `proxy`, dan `asset_json`
- create transaction source `admin_manual`
- semua aktivasi `admin_manual` wajib menghasilkan `transaction` dan `subscription` yang konsisten
- status subscription dihitung sistem menjadi `active` atau `processed`
- admin tidak boleh menginput status subscription secara manual
- admin dapat membatalkan subscription berjalan sehingga status menjadi `canceled`
- tampilkan `total spent (Rp)` sebagai jumlah seluruh transaksi sukses user tersebut
- jaga invariant satu user hanya punya satu subscription berjalan
- rule `is_extended` untuk admin manual wajib sama dengan source lain:
  - jika package sama dan `is_extended = true`, perpanjang subscription berjalan yang sama
  - jika package berbeda dan `is_extended = true`, tutup subscription lama lalu buat subscription baru mulai `now()`
  - jika `is_extended = false`, sisa periode lama tidak boleh terbawa
- implementasi aktivasi manual wajib memakai shared activation service yang sama dengan source lain, bukan flow terpisah yang menyalin logic sendiri

Hasil minimal yang harus ada:
- admin bisa membuat subscription baru atau mengganti subscription berjalan tanpa SQL
- hasilnya langsung terlihat di tabel subscriber

Checklist verifikasi browser manual untuk lulus:
- [ ] login sebagai admin dan buka `/admin/subscriber`
- [ ] cari subscriber berdasarkan username, user ID, atau email lalu pastikan hasil tabel berubah sesuai query
- [ ] filter subscriber berdasarkan asset type, subscription status, atau date range lalu pastikan hasil tabel berubah sesuai filter
- [ ] buat subscription baru untuk user tanpa subscription dan pastikan row muncul dengan status yang dihitung sistem
- [ ] buat subscription dengan asset tidak lengkap lalu pastikan status menjadi `processed`
- [ ] buat subscription dengan semua entitlement terpenuhi lalu pastikan status menjadi `active`
- [ ] pilih asset manual yang tuple exact-nya cocok dan pastikan submit berhasil
- [ ] coba pilih asset yang tuple exact-nya tidak cocok dan pastikan submit ditolak server-side
- [ ] gunakan `Quick Add Asset` dari popup lalu simpan subscription dan pastikan asset baru bertipe `private` dan langsung terhubung ke subscription itu
- [ ] coba pilih package yang sedang disabled untuk assign manual dan pastikan flow ditolak
- [ ] lakukan cancel subscription dari admin lalu pastikan status berubah menjadi `canceled` dan asset aktif user ikut tercabut
- [ ] pastikan kolom `total spent (Rp)` menghitung jumlah transaksi sukses user dengan benar
- [ ] verifikasi user tidak pernah memiliki dua subscription berjalan `active` atau `processed` pada saat yang sama
- [ ] verifikasi entitlement `share` tidak memberi lebih dari satu assignment aktif per user per platform
- [ ] lakukan aktivasi manual dengan package yang sama dan `is_extended = true`, lalu pastikan masa aktif memanjang tanpa membuat dua subscription berjalan
- [ ] lakukan aktivasi manual dengan package berbeda saat masih ada subscription berjalan dan `is_extended = true`, lalu pastikan subscription lama ditutup dan package baru mulai berlaku dari `now()`
- [ ] lakukan aktivasi manual dengan package `is_extended = false`, lalu pastikan sisa periode subscription lama tidak ikut terbawa
- [ ] edit subscriber yang sudah punya subscription berjalan dan pastikan sistem tidak membuat dua subscription berjalan aktif bersamaan
- [ ] reload halaman lalu pastikan start date, expires at, package, dan status tetap konsisten

Backend invariant verification via InsForge CLI:
- [ ] verifikasi setiap aktivasi manual membuat row `transactions` dengan `source = 'admin_manual'` yang konsisten dengan row `subscriptions`
- [ ] verifikasi user target tetap hanya memiliki satu subscription berjalan dengan status `active` atau `processed`
- [ ] verifikasi `subscriptions.access_keys_json` dan `asset_assignments.access_key` hanya memakai tuple exact yang diizinkan package
- [ ] verifikasi assignment aktif mengikuti rule `private` dan `share`, termasuk tidak ada lebih dari satu assignment aktif `share` per user per platform
- [ ] verifikasi cancel subscription mengubah status menjadi `canceled` dan me-revoke assignment aktif terkait

## Phase 5. Admin CD-Key
Tujuan phase ini adalah menyelesaikan issue dan pengelolaan CD-Key dari sisi admin. Flow redeem user memang baru final di Phase 6.

Scope wajib:
- route `/admin/cdkey`
- tabel admin dengan search, filter, pagination, dan view column persistence
- kolom minimum tabel: `code`, `package`, `status`, `used by`, `created by`, `created at`, `updated at`
- search by code, package, dan used by
- filter by status, package, dan ringkasan package
- create CD-Key manual
- generate CD-Key otomatis
- generated code harus unik, uppercase, dan panjang 8 sampai 12 karakter
- optional price override
- tampilkan status `used` atau `unused`
- tampilkan `used_by`, `created_by`, dan snapshot package
- blok penerbitan CD-Key baru dari package yang sedang disabled

Hasil minimal yang harus ada:
- admin bisa menerbitkan CD-Key dari browser dan melihat hasilnya langsung di tabel
- phase ini hanya menutup sisi admin issuance, bukan redeem member

Checklist verifikasi browser manual untuk lulus:
- [ ] login sebagai admin dan buka `/admin/cdkey`
- [ ] buat CD-Key baru dengan code manual lalu pastikan row baru muncul di tabel
- [ ] buat CD-Key baru tanpa isi code lalu pastikan sistem meng-generate code unik otomatis
- [ ] pastikan code hasil generate otomatis berupa uppercase alfanumerik dengan panjang 8 sampai 12 karakter
- [ ] isi harga override lalu pastikan nilai override tampil benar di detail atau tabel yang relevan
- [ ] filter data `used` dan `unused` lalu pastikan hasil tabel berubah sesuai filter
- [ ] search berdasarkan code, package, atau `used by` lalu pastikan row yang dicari muncul
- [ ] coba issue CD-Key untuk package disabled dan pastikan flow ditolak

Backend invariant verification via InsForge CLI:
- [ ] verifikasi row `cd_keys` baru tersimpan dengan snapshot `package_id`, `duration_days`, `is_extended`, `access_keys_json`, dan `amount_rp`
- [ ] verifikasi key baru berstatus belum terpakai dengan `used_by is null` dan `used_at is null`
- [ ] verifikasi key yang di-generate otomatis unik, uppercase, dan panjangnya sesuai rule
- [ ] verifikasi issue key untuk package disabled tidak membuat row baru yang invalid

## Phase 6. Member Console dan Payment Dummy
Tujuan phase ini adalah menyelesaikan seluruh flow member dari membaca status subscription sampai extend langganan, redeem code, dan simulasi bayar.

Scope wajib:
- route `/console`
- section `Subscription Overview`
- `Subscription Overview` minimal menampilkan `status`, `packageName`, `endAt`, dan `daysLeft`
- section `Asset List`
- `Asset List` minimal menampilkan kolom `id`, `platform`, `asset type`, `note`, `proxy`, `expires at`, dan `action`
- section `History Subscription`
- `History Subscription` minimal menampilkan kolom `source`, `package`, `amount (Rp)`, `status`, dan `created_at`
- dialog `Perpanjang Langganan`
- pilihan package pada flow extend hanya boleh menampilkan package aktif
- dialog `Redeem Code`
- route `/paymentdummy`
- halaman payment dummy menampilkan ringkasan package dan nominal
- create transaction `payment_dummy`
- aktivasi subscription sesuai rule `is_extended`
- semua aktivasi dari payment dummy dan redeem CD-Key wajib menghasilkan `transaction` dan `subscription` yang konsisten
- rule `is_extended` pada payment dummy dan redeem CD-Key wajib sama dengan admin manual:
  - jika package sama dan `is_extended = true`, perpanjang subscription berjalan yang sama
  - jika package berbeda dan `is_extended = true`, tutup subscription lama lalu buat subscription baru mulai `now()`
  - jika `is_extended = false`, sisa periode lama tidak boleh terbawa
- implementasi payment dummy dan redeem CD-Key wajib memanggil shared activation service yang sama dengan admin manual
- read path asset aktif yang hanya menampilkan inventory valid
- asset detail `View` dan `Copy JSON`
- read path `/console` dan detail asset sebaiknya memakai helper RPC baseline berikut bila tetap sesuai kebutuhan UI:
  - `get_user_console_snapshot(uuid)`
  - `get_user_asset_detail(asset_id, user_id)`

Hasil minimal yang harus ada:
- member bisa menyelesaikan journey dari login sampai memiliki subscription dan akses asset dari browser
- seed state `active`, `processed`, `expired`, `canceled`, dan `none` bisa diverifikasi jelas di `/console`

Checklist verifikasi browser manual untuk lulus:
- [ ] login sebagai `seed.active.browser@assetnext.dev` dan pastikan `/console` menampilkan status aktif, package, tanggal berakhir, dan asset aktif
- [ ] pastikan `/console` menampilkan `daysLeft` pada overview subscription
- [ ] login sebagai `seed.processed.browser@assetnext.dev` dan pastikan `/console` menampilkan pesan bahwa akses masih parsial serta tetap menampilkan asset yang memang sudah berhasil di-assign
- [ ] pastikan tabel asset di `/console` memuat kolom minimum `id`, `platform`, `asset type`, `note`, `proxy`, `expires at`, dan `action`
- [ ] login sebagai `seed.expired.browser@assetnext.dev` dan pastikan state expired terlihat jelas
- [ ] login sebagai `seed.canceled.browser@assetnext.dev` dan pastikan state canceled terlihat jelas
- [ ] login sebagai `seed.none.browser@assetnext.dev` dan pastikan state belum punya subscription terlihat jelas
- [ ] pastikan tabel history di `/console` dapat menampilkan transaksi dari source `payment_dummy`, `cdkey`, dan `admin_manual` bila data user memilikinya
- [ ] pastikan tabel history di `/console` memuat kolom minimum `source`, `package`, `amount (Rp)`, `status`, dan `created_at`
- [ ] pada flow extend, pastikan daftar package hanya berisi package yang aktif
- [ ] di `/paymentdummy`, pastikan ringkasan package dan nominal tampil sebelum user klik `Bayar`
- [ ] dari flow extend, pilih package lalu masuk ke `/paymentdummy`, klik `Bayar`, dan pastikan user kembali ke `/console` dengan transaction baru
- [ ] lakukan extend dengan package yang sama dan `is_extended = true`, lalu pastikan tidak muncul dua subscription berjalan sekaligus dan masa aktif memanjang
- [ ] lakukan pergantian ke package berbeda saat masih ada subscription berjalan, lalu pastikan akses lama dicabut sebelum akses package baru diterapkan
- [ ] lakukan aktivasi package dengan `is_extended = false`, lalu pastikan sisa hari subscription lama tidak ikut terbawa
- [ ] disable package yang sedang dipakai user aktif lalu pastikan subscription yang sudah berjalan tetap normal, tetapi package tersebut tidak lagi muncul di flow pembelian baru
- [ ] redeem CD-Key valid dan pastikan subscription atau transaction user langsung ter-update di `/console`
- [ ] redeem CD-Key yang diterbitkan sebelum package-nya di-disable dan pastikan kode tetap valid sesuai snapshot-nya
- [ ] setelah redeem berhasil, buka `/admin/cdkey` dan pastikan status key menjadi `used` serta `used_by` dan `used_at` terisi
- [ ] coba redeem CD-Key invalid atau sudah terpakai dan pastikan muncul error yang benar tanpa mengubah data user
- [ ] buka detail asset dari tabel lalu pastikan raw asset tampil dan tombol `Copy JSON` berfungsi
- [ ] reload `/console` setelah transaksi sukses lalu pastikan history transaction tetap konsisten

Backend invariant verification via InsForge CLI:
- [ ] verifikasi flow payment dummy membuat `transactions` berstatus `success` dan `source = 'payment_dummy'`
- [ ] verifikasi flow redeem membuat `transactions` berstatus benar dan menghubungkan `cd_key_id` saat source `cdkey`
- [ ] verifikasi subscription hasil payment dummy atau redeem mengikuti rule `is_extended` dan invariant satu subscription berjalan per user
- [ ] verifikasi `cd_keys.used_by` dan `cd_keys.used_at` terisi setelah redeem sukses dan tidak berubah pada redeem gagal
- [ ] verifikasi read path `/console` konsisten dengan helper RPC `get_user_console_snapshot` atau view aktif yang dipakai, sehingga asset invalid tidak muncul lagi

## Phase 7. User Management
Tujuan phase ini adalah menyelesaikan operasional akun user dari sisi admin tanpa keluar ke tooling lain.

Scope wajib:
- route `/admin/users`
- tabel admin dengan search, filter, pagination, dan view column persistence
- kolom minimum tabel: `ID`, `user`, `public ID`, `role`, `subscription status`, `expires at`, `created at`, `updated at`, `actions`
- filter by role, subscription status, dan ringkasan package aktif `private/share/mixed/none`
- create user baru
- create user admin wajib membuat akun autentikasi yang benar-benar loginable di `auth.users` melalui trusted auth/admin path, lalu sinkron ke `profiles`
- generate username otomatis dari email dengan suffix unik bila perlu
- generate `public_id` otomatis
- edit profil dasar
- edit avatar pada detail user
- `Ban/Unban`
- `Change Password`
- `Change Password` admin wajib mengubah credential login asli user di auth layer, bukan hanya state aplikasi lokal
- `View Details`
- tampilkan subscription aktif, asset aktif, histori transaksi, login, dan extension pada detail user

Hasil minimal yang harus ada:
- admin bisa membuat dan mengelola user dari browser
- interaksi ban dan password benar-benar memengaruhi flow auth

Checklist verifikasi browser manual untuk lulus:
- [ ] login sebagai admin dan buka `/admin/users`
- [ ] buat user baru dengan role `member` lalu pastikan row baru muncul di tabel
- [ ] setelah admin membuat user baru, login dengan akun itu dari `/login` dan pastikan akun benar-benar bisa autentikasi
- [ ] buat user dengan email yang prefix username-nya bentrok dan pastikan sistem memberi suffix unik otomatis
- [ ] pada tabel yang menampilkan user tanpa avatar, pastikan fallback avatar menampilkan inisial username dengan warna konsisten setelah reload
- [ ] buka detail user baru lalu pastikan `public_id`, role, dan profil tampil benar
- [ ] pada detail user, pastikan info subscription aktif, daftar asset aktif, histori transaksi, histori login, dan histori extension dapat dibaca
- [ ] ubah avatar user dari detail popup lalu pastikan perubahan tampil setelah reload
- [ ] ban user tersebut lalu logout dan pastikan user tidak bisa login
- [ ] unban user tersebut lalu pastikan login kembali berhasil
- [ ] ganti password user dari admin lalu pastikan password lama gagal dan password baru berhasil
- [ ] filter user berdasarkan role, status subscription, atau ringkasan package aktif lalu pastikan tabel berubah sesuai filter

Backend invariant verification via InsForge CLI:
- [ ] verifikasi create user admin membuat row yang konsisten di `auth.users` dan `public.profiles`
- [ ] verifikasi `username` dan `public_id` yang dihasilkan unik dan tersimpan benar di `profiles`
- [ ] verifikasi ban atau unban mengubah state banned user di `profiles` tanpa merusak history user
- [ ] verifikasi password change mempertahankan identitas auth user yang sama dan tidak membuat akun auth duplikat

## Phase 8. User Logs
Tujuan phase ini adalah menyelesaikan halaman observability admin yang bersifat read-only untuk login, extension, dan transaksi.

Scope wajib:
- route `/admin/userlogs`
- tab `Login History`
- kolom minimum `Login History`: `user`, `IP`, `browser`, `OS`, `login time`
- tab `Extension Track`
- kolom minimum `Extension Track`: `user`, `IP`, `city`, `country`, `browser`, `OS`, `extension version`, `device ID`, `extension ID`, `first seen at`, `last seen at`
- tab `Transactions`
- kolom minimum `Transactions`: `user`, `package`, `source`, `amount (Rp)`, `status`, `created at`, `updated at`
- filter per tab sesuai PRD
- ringkasan revenue pada tab transaction
- histori asset lama yang sudah dihapus tetap harus bisa dibaca dari snapshot assignment, bukan dari row asset aktif

Hasil minimal yang harus ada:
- admin dapat membaca histori login, histori extension, dan histori transaction dari browser
- data dari phase-phase sebelumnya sudah muncul di halaman ini

Checklist verifikasi browser manual untuk lulus:
- [ ] login sebagai admin dan buka `/admin/userlogs`
- [ ] pastikan tab `Login History` memuat row seed dan dapat difilter berdasarkan user atau date range
- [ ] pastikan tab `Login History` menampilkan kolom minimum `user`, `IP`, `browser`, `OS`, dan `login time`
- [ ] filter `Login History` berdasarkan OS dan pastikan hasil berubah
- [ ] lakukan satu login member baru lalu refresh tab `Login History` dan pastikan event baru muncul
- [ ] pastikan tab `Extension Track` memuat data seed yang sudah ada
- [ ] pastikan tab `Extension Track` menampilkan kolom minimum sesuai PRD termasuk `city`, `country`, `device ID`, dan `extension ID`
- [ ] filter tab `Extension Track` berdasarkan user lalu pastikan hasil berubah
- [ ] pastikan tab `Transactions` memuat transaksi dari payment dummy, admin manual, atau seed transaction
- [ ] pastikan tab `Transactions` menampilkan kolom minimum `user`, `package`, `source`, `amount`, `status`, `created at`, dan `updated at`
- [ ] ubah filter date range transaction lalu pastikan ringkasan revenue ikut berubah

Backend invariant verification via InsForge CLI:
- [ ] verifikasi tab `Login History` membaca data dari `login_logs` yang benar, bukan data turunan yang hilang detail pentingnya
- [ ] verifikasi tab `Extension Track` membaca `extension_tracks` dengan identity unik `user_id + device_id + ip_address + extension_id`
- [ ] verifikasi tab `Transactions` konsisten dengan `transactions` atau `v_transaction_list` untuk rentang data yang sama
- [ ] verifikasi histori asset yang sudah dihapus tetap tersedia dari snapshot assignment bila detail itu ditampilkan di admin

## Phase 9. Admin Home
Tujuan phase ini adalah menyelesaikan final dashboard `/admin` yang menampilkan statistik lintas domain, chart, dan live user.

Scope wajib:
- final route `/admin`
- statistik cards sesuai PRD:
  - total member terdaftar
  - total member dengan subscription `active` atau `processed`
  - total subscription `private`
  - total subscription `share`
  - total subscription `mixed`
  - total asset
  - total transaksi sukses dalam Rupiah
- chart member, transaksi, dan sales
- date range untuk statistik transaksi dan chart
- `Live User`
- integrasi read model dashboard, idealnya memakai RPC atau query server-side yang stabil
- read model dashboard sebaiknya memakai helper RPC baseline `get_admin_dashboard_stats(from, to)` untuk aggregate awal bila tetap sesuai kebutuhan UI
- definisi metrik wajib mengikuti PRD:
  - `total member terdaftar` = semua user role `member`
  - `total member berlangganan` = user dengan subscription berjalan `active` atau `processed`
  - `total subscription private/share/mixed` = subscription berjalan berdasarkan ringkasan package aktifnya
  - `total asset` = seluruh asset yang masih ada di inventory termasuk yang disabled atau expired, tetapi tidak termasuk yang sudah hard delete
  - `total transaksi sukses (Rp)` = jumlah `transactions.status = success` pada range yang sedang dipilih

Hasil minimal yang harus ada:
- admin login kini mendarat di dashboard statistik final, bukan placeholder lagi
- dashboard membaca data nyata dari package, subscription, transaction, asset, session, dan extension track

Checklist verifikasi browser manual untuk lulus:
- [ ] login sebagai admin dan pastikan redirect menuju `/admin`
- [ ] pastikan seluruh kartu statistik utama tampil tanpa error
- [ ] saat dashboard pertama dibuka, pastikan default range statistik transaksi adalah 30 hari terakhir
- [ ] ganti range statistik lalu pastikan angka atau chart berubah sesuai data range
- [ ] refresh halaman dan pastikan dashboard tetap stabil
- [ ] pastikan daftar `Live User` memakai timestamp terbaru dari `app_sessions` atau `extension_tracks`, maksimal menampilkan 50 member terbaru yang masih online dalam 10 menit terakhir
- [ ] coba akses `/admin` sebagai non-admin dan pastikan akses ditolak

Backend invariant verification via InsForge CLI:
- [ ] verifikasi aggregate dashboard konsisten dengan `get_admin_dashboard_stats(from, to)` atau read model server-side yang dipakai
- [ ] verifikasi definisi setiap metrik mengikuti PRD, terutama `total member`, `total subscription private/share/mixed`, `total asset`, dan `total transaksi sukses`
- [ ] verifikasi `v_live_users` atau query live-user ekuivalen mengambil `last_seen_at` terbaru dari `app_sessions` atau `extension_tracks`
- [ ] verifikasi touch `app_sessions.last_seen_at` benar-benar berjalan pada request terautentikasi agar dashboard live user tidak stale

## Phase 10. Cron and Recovery
Tujuan phase ini adalah menyelesaikan seluruh mekanisme rekonsiliasi, recovery, dan invariant background yang tidak cukup dijaga oleh UI mutation biasa saja.

Scope wajib:
- trusted cron trigger untuk `expire_subscriptions_job()`
- trusted cron trigger untuk `reconcile_invalid_assets_job()`
- cron reconciliation berjalan minimal tiap 1 menit dan natural expiry harus ter-handle maksimal pada siklus cron berikutnya
- wiring immediate recheck setelah admin disable asset
- saat admin disable asset, flow server-side harus memanggil `recheck_subscription_after_asset_change(asset_id)` atau equivalent wiring yang memakai helper baseline yang sama
- wiring delete asset aman dengan revoke dan re-fulfillment
- state subscription berubah ke `processed` jika replacement tidak tersedia
- read path langsung memblokir asset invalid walaupun cron belum berjalan
- subscription yang `expired` atau `canceled` wajib segera mencabut seluruh assignment aktif

Hasil minimal yang harus ada:
- disable asset, expire asset, dan perubahan subscription tidak lagi meninggalkan data aktif yang salah di browser
- recovery dan reconciliation bisa dibuktikan dari UI tanpa SQL manual di tengah flow

Checklist verifikasi browser manual untuk lulus:
- [ ] login sebagai admin, disable asset yang sedang dipakai user aktif, lalu refresh `/console` user terkait dan pastikan asset lama langsung hilang dari read path aktif
- [ ] jika replacement tersedia, pastikan user melihat asset pengganti setelah proses recovery selesai
- [ ] jika replacement tidak tersedia, pastikan subscription user berubah menjadi `processed`
- [ ] hard delete asset yang sedang punya assignment aktif lalu pastikan assignment lama tercabut, histori tetap aman, dan replacement atau status `processed` berjalan sesuai rule
- [ ] edit atau siapkan asset hingga natural expired, tunggu siklus cron berikutnya, lalu pastikan hasil rekonsiliasi terlihat di `/console` atau `/admin/subscriber`
- [ ] pastikan subscription yang sudah `expired` tidak lagi memberi akses asset aktif pada member
- [ ] pastikan endpoint extension untuk user dengan asset yang baru disabled atau expired langsung menolak atau tidak lagi mengembalikan asset tersebut walaupun cron belum sempat berjalan
- [ ] pastikan browser user biasa tidak bisa mengeksekusi trusted cron route secara bebas

Backend invariant verification via InsForge CLI:
- [ ] verifikasi `expire_subscriptions_job()` mengubah subscription yang lewat waktu menjadi `expired` dan me-revoke assignment aktif terkait
- [ ] verifikasi `reconcile_invalid_assets_job()` atau wiring equivalent menangani asset expired atau disabled sesuai rule replacement vs `processed`
- [ ] verifikasi disable asset dari admin memicu `recheck_subscription_after_asset_change(asset_id)` atau flow baseline yang setara tanpa menunggu cron
- [ ] bila schedule runtime dipakai, verifikasi konfigurasi dan log eksekusi melalui `npx @insforge/cli schedules list`, `schedules get`, dan `schedules logs`

## Phase 11. Extension API
Tujuan phase ini adalah menyelesaikan integrasi akhir dengan Chrome Extension menggunakan session web yang sama dan kontrak API sesuai PRD.

Scope wajib:
- `GET /api/extension/session`
- `GET /api/extension/asset?id=xxx`
- `POST /api/extension/track`
- kontrak sukses `POST /api/extension/track` wajib minimal memuat `success` dan `timestamp`
- request dan response extension wajib memakai `camelCase`
- kontrak sukses `GET /api/extension/session` wajib minimal memuat:
  - `user.id`
  - `user.username`
  - `subscription.status`
  - `subscription.packageName`
  - `subscription.endAt`
  - `subscription.daysLeft`
  - `subscription.assets[].id`
  - `subscription.assets[].accessKey`
  - `subscription.assets[].assetType`
  - `subscription.assets[].platform`
  - `subscription.assets[].expiresAt`
  - `requestNonce.value`
  - `requestNonce.expiresAt`
- `requestNonce` wajib terikat pada session aktif user dan hanya valid 60 detik
- kontrak sukses `GET /api/extension/asset` wajib minimal memuat:
  - `id`
  - `accessKey`
  - `assetType`
  - `platform`
  - `expiresAt`
  - `account`
  - `proxy`
  - `note`
  - `asset`
- validasi `x-extension-id`
- validasi `Origin`
- source allowlist untuk `x-extension-id` dan `Origin` harus datang dari config runtime yang eksplisit, bukan hardcoded tersebar di beberapa file
- validasi cookie `app_session`
- validasi banned user
- validasi status subscription `active` atau `processed`
- `requestNonce` 60 detik untuk asset detail
- standard error response extension
- mekanisme `requestNonce` harus didesain eksplisit karena baseline migration tidak menyediakan tabel atau helper nonce bawaan

Hasil minimal yang harus ada:
- extension dapat memakai session login web untuk membaca metadata asset yang diizinkan
- track heartbeat extension muncul di admin logs
- semua error utama mengembalikan kode baku yang benar

Checklist verifikasi browser manual untuk lulus:
- [ ] login ke web app sebagai user dengan subscription valid lalu panggil `GET /api/extension/session` dari extension dev harness dan pastikan response sukses
- [ ] pastikan response session memakai key `camelCase`, hanya memuat asset aktif yang masih valid di inventory aktif, dan tidak membocorkan raw `asset_json`
- [ ] pastikan response session minimal memuat `user.id`, `user.username`, `subscription.status`, `subscription.packageName`, `subscription.endAt`, `subscription.daysLeft`, `subscription.assets`, dan `requestNonce`
- [ ] login sebagai user `processed` lalu panggil endpoint extension dan pastikan hanya asset parsial yang memang sudah di-assign yang dikembalikan
- [ ] ambil `requestNonce`, panggil `GET /api/extension/asset?id=...`, dan pastikan hanya asset yang diizinkan yang bisa dibaca
- [ ] pastikan response `GET /api/extension/asset` minimal memuat `id`, `accessKey`, `assetType`, `platform`, `expiresAt`, `account`, `proxy`, `note`, dan `asset`
- [ ] biarkan nonce lewat masa berlaku atau gunakan nonce palsu lalu pastikan endpoint asset mengembalikan `NONCE_INVALID`
- [ ] panggil `POST /api/extension/track` lalu pastikan event baru muncul di `/admin/userlogs`
- [ ] pastikan response sukses `POST /api/extension/track` minimal memuat `success: true` dan `timestamp`
- [ ] setelah `POST /api/extension/track`, pastikan row track yang baru atau ter-update menyimpan `ip`, `city`, `country`, `browser`, `os`, dan `extensionVersion`
- [ ] kirim dua heartbeat dengan kombinasi `user_id + device_id + ip_address + extension_id` yang sama lalu pastikan row track yang sama di-update, bukan membuat row duplikat
- [ ] kirim heartbeat dengan kombinasi identity berbeda lalu pastikan row baru dibuat
- [ ] uji request tanpa `x-extension-id` dan pastikan error `EXT_HEADER_REQUIRED`
- [ ] uji request dengan `Origin` yang tidak diizinkan dan pastikan error `EXT_ORIGIN_DENIED`
- [ ] uji request tanpa cookie session dan pastikan error `SESSION_MISSING`
- [ ] revoke session dengan login ulang di browser lain lalu uji endpoint extension dari session lama dan pastikan error `SESSION_REVOKED`
- [ ] uji request tanpa nonce atau nonce invalid ke endpoint asset dan pastikan error `NONCE_REQUIRED` atau `NONCE_INVALID`
- [ ] uji request asset dengan ID yang tidak ada dan pastikan error `NOT_FOUND`
- [ ] uji request asset yang valid tetapi bukan milik assignment aktif user dan pastikan error `ASSET_NOT_ALLOWED`
- [ ] login sebagai akun seed `expired`, `canceled`, atau `none` lalu panggil endpoint extension dan pastikan error `SUBSCRIPTION_EXPIRED`
- [ ] ban user lalu panggil endpoint extension dan pastikan error `USER_BANNED`

Backend invariant verification via InsForge CLI:
- [ ] verifikasi `POST /api/extension/track` meng-upsert `extension_tracks` sesuai unique identity `user_id + device_id + ip_address + extension_id`
- [ ] verifikasi `session_id`, `extension_version`, `ip_address`, `city`, `country`, `browser`, dan `os` tersimpan benar pada row track yang relevan
- [ ] verifikasi asset yang boleh dipakai extension juga muncul pada `v_current_asset_access` atau read model aktif ekuivalen, sehingga API tidak mengembalikan asset yang sebenarnya sudah invalid
- [ ] verifikasi session lama yang sudah direvoke memang masih tercatat pada `app_sessions`, tetapi tidak lagi dianggap valid oleh path verifikasi session extension

## Regression Gate Setelah Setiap Phase
Setelah sebuah phase selesai, ulang minimal verifikasi dasar manual berikut memakai `agent-browser` CLI melalui skill `agent-browser` sebelum pindah ke phase berikutnya:
- login admin masih berhasil
- login member masih berhasil
- logout masih berhasil
- route feature yang sudah selesai sebelumnya tetap bisa dibuka
- reload halaman utama feature sebelumnya tidak error
- data yang dibuat pada phase sebelumnya masih terbaca benar

Backend invariant regression gate via InsForge CLI:
- verifikasi project yang sedang dicek masih project runtime yang benar lewat `whoami` dan `current`
- verifikasi tidak ada invariant kritis yang rusak pada `app_sessions`, `subscriptions`, `asset_assignments`, `transactions`, `cd_keys`, dan `extension_tracks` untuk phase-phase yang sudah selesai
- verifikasi read model utama yang sudah dipakai UI sebelumnya masih memberi hasil yang konsisten untuk sample data yang baru dibuat

## Prioritas Implementasi Saat Ragu
1. pilih perubahan terkecil yang menutup flow browser end-to-end
2. selesaikan dulu route yang sedang menjadi target phase
3. pastikan write path dan readback phase itu benar sebelum menambah fitur sampingan
4. tundukkan semua keputusan ke PRD, DB plan, dan folder structure
5. jangan membuka phase baru sebelum checklist verifikasi browser manual dan backend invariant verification phase saat ini sama-sama lulus
