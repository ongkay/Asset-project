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
- phase tidak lulus jika masih butuh SQL manual untuk membuktikan hasilnya
- browser test wajib dilakukan pada route nyata, bukan hanya unit test atau inspeksi database
- role guard, session guard, dan error state yang relevan wajib ikut selesai di phase tempat feature itu dikirim
- setiap phase harus tetap menjaga acceptance rules utama di `docs/PRD.md`

## Definition of Done per Phase
Sebuah phase baru dianggap lulus jika semua poin ini terpenuhi:
- route utama phase dapat dibuka langsung dari browser tanpa runtime error
- flow utama phase bisa dijalankan sampai selesai dari UI
- hasil perubahan data bertahan setelah reload halaman
- negative path utama menampilkan error state yang benar dan tidak merusak data
- direct URL access ke route phase tetap aman dan tunduk pada role guard
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
- tersedia strategi browser test yang repeatable
  - minimal: checklist manual browser
  - direkomendasikan: Playwright untuk smoke test tiap phase
- tersedia extension test harness khusus dev untuk phase Extension API karena validasi `Origin` extension tidak bisa diuji akurat dari tab browser biasa
- verifikasi baseline minimum setelah apply migration:
  - semua enum, tabel, trigger, view, dan helper function terbentuk
  - RLS aktif
  - grants untuk `authenticated` dan `project_admin` tersedia
  - helper RPC bisa dipanggil

## Akun Seed Browser
Gunakan akun dari `migrations/041_dev_seed_loginable_users.sql` untuk verifikasi manual dan smoke test.

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

## Urutan Phase
| Phase | Nama                             | Fokus Utama                                      |
| ----- | -------------------------------- | ------------------------------------------------ |
| 0     | Foundation                       | fondasi app, env, shell route, dan testability   |
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
- siapkan baseline browser smoke test

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

Browser test wajib untuk lulus:
- [ ] buka `/login` dan pastikan halaman render tanpa runtime error
- [ ] buka `/reset-password` dan pastikan halaman render tanpa runtime error
- [ ] akses `/console` tanpa login harus diarahkan ke flow auth
- [ ] akses `/admin` tanpa login harus diarahkan ke flow auth
- [ ] login sebagai admin atau member belum wajib sukses pada phase ini, tetapi shell route dan guard dasar harus siap untuk phase 1

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
- banned state minimal sudah menghormati guard login bila mekanismenya sudah tersedia

Browser test wajib untuk lulus:
- [ ] login sebagai `seed.active.browser@assetnext.dev` dengan password benar dan pastikan redirect ke `/console`
- [ ] login sebagai `seed.admin.browser@assetnext.dev` dengan password benar dan pastikan redirect ke `/admin`
- [ ] masukkan email baru di `/login`, lanjut register, lalu pastikan user auto login dan mendapat `app_session`
- [ ] coba register dengan password kurang dari 6 karakter dan pastikan form ditolak dengan error yang jelas
- [ ] pastikan semua field password di login, register, dan reset password mendukung show/hide
- [ ] lakukan 5 kali login gagal pada email yang sama dan pastikan CTA atau dialog reset password muncul
- [ ] sebelum 5 kali gagal, pastikan CTA reset password belum tampil
- [ ] setelah login berhasil pada email yang sama, pastikan failed counter reset dan CTA reset password hilang kembali
- [ ] verifikasi reset counter berbasis 15 menit dengan test clock, seeded state, atau helper dev yang setara agar tidak perlu menunggu manual 15 menit di browser
- [ ] jalankan flow `/reset-password` sampai set password baru berhasil lalu pastikan user diarahkan kembali ke shell yang benar
- [ ] pada flow set password baru, coba simpan password kurang dari 6 karakter dan pastikan form ditolak
- [ ] kirim request reset password untuk email yang tidak terdaftar dan pastikan UI tetap menampilkan pesan sukses generik yang sama
- [ ] buka link reset token yang invalid atau expired dan pastikan UI menampilkan state error yang benar
- [ ] klik logout dan pastikan route member atau admin tidak lagi bisa diakses tanpa login ulang
- [ ] login pada browser normal lalu login lagi dengan user yang sama di incognito atau browser lain dan pastikan session lama langsung tidak valid
- [ ] reload halaman setelah login dan pastikan session tetap terbaca dengan benar

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

Browser test wajib untuk lulus:
- [ ] login sebagai admin dan buka `/admin/package`
- [ ] buat package baru dengan kombinasi entitlement valid lalu pastikan row baru muncul di tabel setelah submit
- [ ] coba simpan package dengan duplicate entitlement dan pastikan form ditolak dengan error yang jelas
- [ ] edit package yang sudah ada lalu pastikan perubahan tampil setelah reload
- [ ] search package berdasarkan nama dan filter berdasarkan ringkasan package lalu pastikan hasil tabel berubah sesuai input
- [ ] disable package dari tabel lalu pastikan status visual berubah dan data tetap ada
- [ ] enable kembali package yang sama lalu pastikan bisa aktif lagi tanpa kehilangan history row
- [ ] ubah pilihan kolom tabel, reload halaman, lalu pastikan preferensi kolom tetap tersimpan

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

Browser test wajib untuk lulus:
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

Browser test wajib untuk lulus:
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

Browser test wajib untuk lulus:
- [ ] login sebagai admin dan buka `/admin/cdkey`
- [ ] buat CD-Key baru dengan code manual lalu pastikan row baru muncul di tabel
- [ ] buat CD-Key baru tanpa isi code lalu pastikan sistem meng-generate code unik otomatis
- [ ] pastikan code hasil generate otomatis berupa uppercase alfanumerik dengan panjang 8 sampai 12 karakter
- [ ] isi harga override lalu pastikan nilai override tampil benar di detail atau tabel yang relevan
- [ ] filter data `used` dan `unused` lalu pastikan hasil tabel berubah sesuai filter
- [ ] search berdasarkan code, package, atau `used by` lalu pastikan row yang dicari muncul
- [ ] coba issue CD-Key untuk package disabled dan pastikan flow ditolak

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

Browser test wajib untuk lulus:
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

Browser test wajib untuk lulus:
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

Browser test wajib untuk lulus:
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

Browser test wajib untuk lulus:
- [ ] login sebagai admin dan pastikan redirect menuju `/admin`
- [ ] pastikan seluruh kartu statistik utama tampil tanpa error
- [ ] saat dashboard pertama dibuka, pastikan default range statistik transaksi adalah 30 hari terakhir
- [ ] ganti range statistik lalu pastikan angka atau chart berubah sesuai data range
- [ ] refresh halaman dan pastikan dashboard tetap stabil
- [ ] pastikan daftar `Live User` memakai timestamp terbaru dari `app_sessions` atau `extension_tracks`, maksimal menampilkan 50 member terbaru yang masih online dalam 10 menit terakhir
- [ ] coba akses `/admin` sebagai non-admin dan pastikan akses ditolak

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

Browser test wajib untuk lulus:
- [ ] login sebagai admin, disable asset yang sedang dipakai user aktif, lalu refresh `/console` user terkait dan pastikan asset lama langsung hilang dari read path aktif
- [ ] jika replacement tersedia, pastikan user melihat asset pengganti setelah proses recovery selesai
- [ ] jika replacement tidak tersedia, pastikan subscription user berubah menjadi `processed`
- [ ] hard delete asset yang sedang punya assignment aktif lalu pastikan assignment lama tercabut, histori tetap aman, dan replacement atau status `processed` berjalan sesuai rule
- [ ] edit atau siapkan asset hingga natural expired, tunggu siklus cron berikutnya, lalu pastikan hasil rekonsiliasi terlihat di `/console` atau `/admin/subscriber`
- [ ] pastikan subscription yang sudah `expired` tidak lagi memberi akses asset aktif pada member
- [ ] pastikan endpoint extension untuk user dengan asset yang baru disabled atau expired langsung menolak atau tidak lagi mengembalikan asset tersebut walaupun cron belum sempat berjalan
- [ ] pastikan browser user biasa tidak bisa mengeksekusi trusted cron route secara bebas

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

Browser test wajib untuk lulus:
- [ ] login ke web app sebagai user dengan subscription valid lalu panggil `GET /api/extension/session` dari extension test harness dan pastikan response sukses
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

## Regression Gate Setelah Setiap Phase
Setelah sebuah phase selesai, ulang minimal smoke test berikut sebelum pindah ke phase berikutnya:
- login admin masih berhasil
- login member masih berhasil
- logout masih berhasil
- route feature yang sudah selesai sebelumnya tetap bisa dibuka
- reload halaman utama feature sebelumnya tidak error
- data yang dibuat pada phase sebelumnya masih terbaca benar

## Prioritas Implementasi Saat Ragu
1. pilih perubahan terkecil yang menutup flow browser end-to-end
2. selesaikan dulu route yang sedang menjadi target phase
3. pastikan write path dan readback phase itu benar sebelum menambah fitur sampingan
4. tundukkan semua keputusan ke PRD, DB plan, dan folder structure
5. jangan membuka phase baru sebelum checklist browser test phase saat ini lulus
