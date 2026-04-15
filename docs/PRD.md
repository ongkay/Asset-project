# PRODUCT REQUIREMENTS DOCUMENT (PRD)

## Sistem Manajemen Langganan dan Akses Ekstensi Chrome

## 1. Tujuan Produk
Produk ini adalah aplikasi web fullstack untuk menjual dan mengelola langganan akses data aset berdasarkan package yang dipilih user. Aplikasi web terhubung dengan Chrome Extension yang dibangun terpisah. Extension tidak mengakses database secara langsung; extension hanya membaca status session dan data asset melalui API Next.js menggunakan cookie session dari aplikasi web.

### 1.1. Ruang Lingkup v1
Fitur yang wajib tersedia pada v1:
- autentikasi Email + Password
- single-device login enforcement
- manajemen package, asset, subscription, dan CD-Key
- aktivasi subscription via payment dummy, CD-Key, atau admin manual
- dashboard user dan admin
- API khusus untuk Chrome Extension
- histori login, extension activity, dan transaksi

### 1.2. Di Luar Scope v1
Fitur berikut tidak wajib pada v1:
- payment gateway production
- role selain `member` dan `admin`
- mobile app
- multi-extension support di browser selain Chrome
- audit log admin terpisah

---

## 2. Istilah Inti

### 2.1. Entitas Utama
- **User**: akun autentikasi utama di InsForge Auth.
- **Profile**: data profil tambahan user, seperti `username`, `avatar_url`, `role`, `public_id`, dan status banned.
- **Session**: sesi login aktif user yang direpresentasikan oleh cookie `app_session`.
- **Package**: produk langganan yang dijual ke user.
- **Entitlement**: satu hak akses exact ke asset, dinyatakan oleh kombinasi `platform + asset_type`.
- **Access Key**: representasi string baku dari satu entitlement exact dengan format `platform:asset_type`, misalnya `tradingview:share`.
- **Asset**: data akun provider yang akan diberikan ke user.
- **Subscription**: kontrak langganan user untuk satu package pada satu periode.
- **Assignment**: relasi antara subscription dan asset yang benar-benar diberikan ke user.
- **Transaction**: catatan aktivasi subscription dari payment dummy, CD-Key, atau admin manual.
- **CD-Key**: kode redeem sekali pakai untuk mengaktifkan package.
- **Login Log**: histori login user ke aplikasi web.
- **Extension Track**: histori heartbeat dari Chrome Extension.

### 2.2. Role Sistem
- `member`: user biasa.
- `admin`: dapat mengakses seluruh `/admin/*`.

### 2.3. Konvensi Naming
- Database menggunakan `snake_case`.
- JSON request/response API extension menggunakan `camelCase`.
- Label UI boleh lebih ramah dibaca, misalnya `expires at`, `asset type`, atau `public ID`.

### 2.4. Enum Baku

#### Platform
Nilai platform yang valid:
- `tradingview`
- `fxreplay`
- `fxtester`

Label UI boleh ditampilkan sebagai `TradingView`, `FxReplay`, dan `FxTester`, tetapi nilai data tetap mengikuti enum di atas.

#### Asset Type
- `private`: satu asset hanya boleh dimiliki satu user aktif pada saat yang sama.
- `share`: satu asset boleh dipakai banyak user aktif, tetapi satu user maksimal memiliki satu asset `share` per platform.

#### Ringkasan Package
Ringkasan package adalah label turunan dari seluruh entitlement package. Nilai ini hanya dipakai untuk reporting, badge UI, dan filter admin ringan. Nilai ini tidak boleh dipakai sebagai dasar otorisasi asset.
- `private`: semua entitlement bertipe `private`
- `share`: semua entitlement bertipe `share`
- `mixed`: package memiliki kombinasi entitlement `private` dan `share`

Ringkasan package dihitung sistem, bukan diinput manual.

#### Subscription Status
- `active`: subscription valid dan seluruh entitlement package sudah terpenuhi.
- `processed`: subscription valid, tetapi ada minimal satu entitlement yang belum terpenuhi. User tetap boleh mengakses asset yang sudah berhasil di-assign.
- `expired`: masa subscription sudah habis. Semua assignment harus dicabut.
- `canceled`: subscription dibatalkan admin. Semua assignment harus dicabut.

#### Asset Status
Status asset pada UI adalah status turunan, bukan input manual.
- `available`: asset aktif, belum expired, tidak disabled, dan masih bisa menerima assignment baru.
- `assigned`: khusus asset `private` yang sedang dipakai user aktif.
- `expired`: `expires_at < now()`.
- `disabled`: dimatikan admin dan tidak boleh dipakai untuk assignment baru.

Catatan:
- asset `share` tetap berstatus `available` walaupun sudah dipakai banyak user, selama tidak expired dan tidak disabled.
- `total used` untuk asset `share` dihitung dari jumlah assignment aktif.

#### Transaction Status
- `pending`
- `success`
- `failed`
- `canceled`

#### Transaction Source
- `payment_dummy`
- `cdkey`
- `admin_manual`

### 2.5. Contoh Matriks Entitlement Package
Hak akses package selalu ditentukan oleh daftar entitlement exact, bukan hanya oleh tipe `private/share` saja.

Contoh:
- `Paket_1` memiliki entitlement:
  - `tradingview/private`
  - `fxreplay/share`
  - `fxtester/share`
  - `fxtester/private`

- `Paket_2` memiliki entitlement:
  - `tradingview/share`
  - `fxreplay/private`

- `Paket_3` memiliki entitlement:
  - `tradingview/share`

Di level data, entitlement exact ini direpresentasikan sebagai `access_key` di database dan `accessKey` di JSON API, misalnya:
- `tradingview:private`
- `fxreplay:share`

Implikasi rule:
- user yang berlangganan `Paket_3` hanya boleh mendapat assignment asset `tradingview/share`
- user `Paket_3` tidak boleh mendapat asset `fxreplay/share`, `fxtester/share`, `tradingview/private`, atau tuple lain apa pun di luar daftar entitlement package tersebut
- dua package yang sama-sama punya entitlement `share` belum tentu memberi akses ke platform yang sama

---

## 3. Aturan Bisnis Inti

### 3.1. Autentikasi
- Metode autentikasi hanya Email + Password melalui InsForge Auth.
- Password saat register minimal 6 karakter.
- Form register wajib memiliki field konfirmasi password.
- Semua input password wajib mendukung show/hide.
- User yang berstatus banned harus ditolak pada flow login sebelum session app baru dibuat.

### 3.2. Single-Device Login Enforcement
- Satu user hanya boleh memiliki satu session aktif pada saat yang sama.
- Saat login atau register berhasil, sistem wajib me-revoke seluruh session lama user sebelum membuat session baru.
- Cookie session yang dipakai aplikasi web dan extension harus menggunakan nama tetap: `app_session`.
- Extension hanya dapat bekerja pada browser profile yang memiliki `app_session` aktif.
- Jika user login dari browser atau perangkat lain, session lama langsung tidak valid.

### 3.3. Failed Login Counter
- Counter gagal login dihitung per email.
- Counter ini hanya bertambah untuk kegagalan login karena password salah pada email yang memang terdaftar.
- Tombol `Reset Password` baru ditampilkan setelah 5 kegagalan login berturut-turut karena password salah.
- Counter gagal login reset jika:
  - login berhasil, atau
  - sudah melewati 15 menit sejak kegagalan terakhir.

### 3.4. Aktivasi Subscription
Subscription dapat dibuat dari tiga source:
- payment dummy
- redeem CD-Key
- admin manual

Semua source di atas harus menghasilkan record `transaction` dan `subscription` yang konsisten.

### 3.5. Aturan `is_extended`
Setiap package memiliki flag `is_extended`.

Aturan ini berlaku untuk payment dummy, CD-Key, dan admin manual. Sistem tidak boleh menghasilkan dua subscription berjalan (`active` atau `processed`) pada saat yang sama.
1. Jika tidak ada subscription berjalan:
   - `start_at = now()`
   - `end_at = now() + duration_days`

2. Jika ada subscription berjalan dan `is_extended = true`:
   - `base = max(current_subscription.end_at, now())`
   - jika package yang diaktifkan sama, sistem memperpanjang record subscription yang sedang berjalan dan `start_at` record yang sama tetap dipertahankan
   - jika package yang diaktifkan berbeda, sistem menutup subscription lama, mencabut assignment lama, lalu membuat subscription baru dengan `start_at = now()`
   - `end_at = base + duration_days`

3. Jika ada subscription berjalan dan `is_extended = false`:
   - subscription lama dianggap diganti
   - semua assignment lama dicabut lebih dulu
   - `start_at = now()`
   - `end_at = now() + duration_days`

### 3.6. Upgrade dan Downgrade Package
Upgrade atau downgrade diperlakukan sebagai event pergantian package.
- hak akses dari package lama harus dicabut terlebih dahulu
- sistem lalu menjalankan fulfillment untuk package baru
- sisa hari hanya dipertahankan jika package baru memiliki `is_extended = true`
- jika package baru memiliki `is_extended = false`, periode lama tidak dibawa ke subscription baru

### 3.7. Fulfillment dan Partial Fulfillment
Setiap package memiliki daftar entitlement unik berdasarkan kombinasi `platform + asset_type`.

Rule inti otorisasi:
- sistem harus mencocokkan asset berdasarkan tuple exact `platform + asset_type`
- kesamaan `asset_type` saja tidak cukup untuk memberi akses
- kesamaan `platform` saja juga tidak cukup untuk memberi akses
- satu baris entitlement hanya boleh dipenuhi oleh asset dengan tuple yang identik

Aturan fulfillment:
- untuk entitlement `private`, sistem memilih satu asset `private` dengan platform yang sesuai, status `available`, dan belum di-assign ke user lain
- untuk entitlement `share`, sistem memilih satu asset `share` dengan platform yang sesuai, status `available`, dan user tersebut belum memiliki asset `share` lain pada platform yang sama
- satu entitlement hanya membutuhkan satu assignment aktif

Hasil fulfillment:
- jika semua entitlement terpenuhi, status subscription menjadi `active`
- jika hanya sebagian entitlement terpenuhi atau belum ada asset yang tersedia, status subscription menjadi `processed`
- user tetap boleh mengakses assignment yang sudah tersedia walaupun subscription masih `processed`

### 3.8. Perubahan Status Asset Saat Subscription Masih Berjalan
Jika asset yang sedang di-assign mengalami kondisi berikut sebelum subscription user berakhir:
- asset expired, atau
- asset disabled oleh admin

Maka sistem harus:
1. mencabut assignment yang terdampak
2. mencoba fulfillment ulang otomatis untuk entitlement yang sama
3. jika pengganti tersedia, assignment baru dibuat
4. jika pengganti tidak tersedia, subscription berubah menjadi `processed`

Aturan enforcement tambahan:
- read path tidak boleh menunggu hasil rekonsiliasi untuk memblokir akses
- asset yang sudah `disabled` atau sudah melewati `expires_at` harus langsung tidak muncul lagi di dashboard user, `GET /api/extension/session`, dan `GET /api/extension/asset`
- saat admin melakukan `Disable` asset dari dashboard, action yang sama harus langsung memicu revoke assignment terdampak dan recheck fulfillment, tidak menunggu cron
- saat admin mengedit `expires_at` asset dari dashboard sehingga asset tersebut langsung menjadi invalid (`expires_at < now()`), action yang sama harus langsung memicu revoke assignment terdampak dan recheck fulfillment, tidak menunggu cron
- untuk asset yang natural expired, Next.js cron wajib merekonsiliasi assignment dan subscription maksimal pada siklus cron berikutnya

### 3.9. Expired dan Canceled Subscription
- Saat `end_at < now()`, subscription menjadi `expired`.
- Saat admin membatalkan subscription, status menjadi `canceled`.
- Pada kedua kondisi di atas, semua assignment aktif wajib dicabut segera.
- User tidak boleh mengakses API extension setelah subscription `expired` atau `canceled`, kecuali metadata historis pada dashboard web yang memang hanya bersifat baca.

Untuk seluruh endpoint extension pada v1, subscription dianggap valid hanya jika statusnya `active` atau `processed`. Jika subscription `expired`, `canceled`, atau tidak ada subscription berjalan, request extension wajib ditolak dengan error baku `SUBSCRIPTION_EXPIRED`.

### 3.10. Aksi Admin dan Integritas History
Pada MVP, aksi admin harus menjaga integritas history walaupun sebagian aksi bersifat soft delete atau hard delete aman.
- Admin hanya boleh `Disable/Enable` package dari dashboard.
- Hard delete package bukan flow v1.
- `Disable/Enable` package tidak boleh mempengaruhi history transaction atau subscription.
- Admin boleh `Disable/Enable` asset untuk kebutuhan operasional.
- `Delete asset` pada UI berarti hard delete aman.
- Sebelum hard delete asset, sistem wajib revoke assignment aktif dan mencoba fulfillment ulang.
- Histori asset yang sudah dihapus tetap harus tersedia dari snapshot assignment.
- `Delete user` bukan flow utama MVP; gunakan `Ban/Unban` atau disable auth.
- `Transaction` dan `subscription` tidak boleh dihapus.

---

## 4. Entitas Data Minimum
Detail schema final mengacu ke `DB.md`. PRD ini hanya mendefinisikan entitas data minimum yang wajib ada.
- `auth.users`
- `profiles`
- `app_sessions`
- `login_logs`
- `packages`
- `assets`
- `subscriptions`
- `asset_assignments`
- `transactions`
- `cd_keys`
- `extension_tracks`

Aturan relasi minimum:
- satu user bisa memiliki banyak transaction
- satu user bisa memiliki banyak subscription historis
- pada satu waktu hanya boleh ada satu subscription berjalan yang statusnya `active` atau `processed`
- satu subscription bisa memiliki banyak assignment asset

---

## 5. Arsitektur dan Tech Stack

### 5.1. Target Stack Utama
- Framework: Next.js `v16.x` latest (`App Router` + `Server Actions`)
- Server Actions Helper: `next-safe-action `
- Styling dan UI: `TailwindCSS v4.x`, `Shadcn` yang sudah terinstall di repo ini (src/component/ui)
- Form dan Validasi: `react-hook-form v7.x`, `zod v4.x`, resolver Zod
- State Management: `Zustand v5.x` dengan persist
- Data Fetching dan Table: `TanStack React Query v5.x`, `TanStack React Table v8.x`
- Backend: `InsForge` untuk Auth, Database, dan Storage
- Package Manager: `pnpm` only

### 5.2. Aturan Teknis Wajib
- Semua antarmuka UI wajib memakai stack yang sudah ada di repo: `tailwindcss + shadcn primitive `.
- API Routes Next.js di bawah `/api/*` hanya dipakai untuk kebutuhan Chrome Extension dan endpoint cron server-side tepercaya. UI web tidak boleh membuka endpoint publik baru di luar dua kebutuhan ini.
- Interaksi data dari UI web sebaiknya menggunakan Server Actions atau server-side layer internal, bukan membuka endpoint publik baru.
- Seluruh query dan mutation untuk halaman admin harus dijalankan server-side menggunakan session user admin biasa. Browser admin tidak boleh memakai credential `project_admin` atau service credential langsung.
- Rekonsiliasi background untuk subscription expired dan asset invalid dijalankan oleh Next.js cron minimal tiap 1 menit.
- Next.js cron adalah eksekusi server-side tepercaya yang terpisah dari session browser user.

### 5.3. Arsitektur Tingkat Tinggi
```text
Chrome Extension
  -> memanggil API Next.js
  -> mengirim header extension + membawa cookie session

Next.js 16 App
  -> auth dan session
  -> subscription engine
  -> admin dashboard
  -> extension API
  -> cron scheduler untuk reconciliation

InsForge
  -> auth
  -> database
  -> storage
```

---

## 6. User Flow Auth
semua form password wajib bisa show/hide password dengan icon mata di sebelah kanan.

### 6.1. Halaman Login (`/login`)
- Login dan register berada dalam satu flow.
- apa bila 5x gagal login karena salah password, maka tampilkan dialog yang menyatakan untuk reset password.

Flow wajib:
1. user memasukkan email lalu klik `Next`
2. server memeriksa lewat trusted server-side path apakah email sudah terdaftar di auth provider
3. jika email sudah terdaftar:
    - tampilkan form password di bawah form email tersebut
    - Login

4. jika email belum terdaftar:
   - tampilkan dialog konfirmasi register
   - jika user setuju, tampilkan field password + konfirmasi password + email yang sudah terisi email otomatis
   - buat user baru
   - login otomatis

5. setelah login berhasil:
   - revoke seluruh session lama user
   - buat session baru
   - simpan cookie `app_session`
   - redirect ke `/console, atau /admin` tergantung role

### 6.2. Halaman Reset Password (`/reset-password`)
Flow minimum:
1. user input email
2. sistem mengirim instruksi reset password ke email
3. jika email tidak ditemukan, UI tetap menampilkan pesan generik yang tidak membocorkan keberadaan akun
4. setelah token reset valid, user dapat mengatur password baru dengan field `password` dan `confirm password`
5. setelah berhasil reset password, user diarahkan ke `/console` atau `/admin` jika auth provider mengembalikan konteks user yang valid; jika provider tidak mengembalikan konteks itu, user diarahkan ke `/login` dengan instruksi jelas untuk login memakai password baru

### 6.3. User Dashboard (`/console`)
Dashboard user memiliki tiga section utama.

#### Section 1: Subscription Overview
Menampilkan:
- `status`
- `packageName`
- `endAt`
- `daysLeft`

Tombol aksi:
- `Perpanjang Langganan`
  - membuka popup extend
  - popup menampilkan list package aktif yang boleh dipilih
  - setelah pilih package, user diarahkan ke `/paymentdummy`
  - setelah simulasi bayar sukses, user kembali ke `/console`

- `Redeem Code`
  - membuka popup input CD-Key
  - klik `Redeem Now` untuk aktivasi

Jika status subscription `processed`, harus ada informasi yang jelas bahwa akses user masih parsial sampai fulfillment selesai.

#### Section 2: Asset List
Tabel menampilkan asset yang benar-benar sudah di-assign ke user dan masih boleh diakses.

Aturan read path:
- asset tidak boleh ditampilkan jika row inventory sudah tidak valid, yaitu `disabled_at is not null` atau `expires_at < now()`
- asset lama yang sudah direvoke atau sudah hilang dari inventory aktif tidak boleh tampil di section ini, walaupun histori assignment masih ada

Kolom minimum:
- `id`
- `platform`
- `asset type`
- `note`
- `proxy`
- `expires at`
- `action`

Action `View` membuka detail raw asset dan menyediakan tombol `Copy JSON`.

#### Section 3: History Subscription
Tabel menampilkan histori seluruh transaksi user, termasuk:
- payment dummy
- CD-Key
- admin manual

Kolom minimum:
- `source`
- `package`
- `amount (Rp)`
- `status`
- `created_at`

---

## 7. Admin Dashboard (`/admin/*`)
Semua route admin hanya bisa diakses oleh role `admin`.

Aturan akses data admin:
- admin memakai session user admin biasa
- semua query admin dijalankan server-side oleh Next.js, di client gunakan react-query, dan tetap tunduk pada policy aplikasi
- browser admin tidak boleh memakai credential database istimewa di client side

### 7.1. Aturan Global Tabel Admin
Semua tabel admin wajib memiliki:
- search (bisa clear x)
- filter dengan dropdown
- view column (show/hide kolom) dan disimpan di localstorage
- pagination

Jika tabel menampilkan kolom user, format tampilannya wajib:
- avatar
- username
- email

Jika `profiles.avatar_url = null`, UI wajib menampilkan fallback avatar berupa inisial username dengan warna background acak namun konsisten per user.

### 7.2. Home (`/admin`)
Menampilkan statistik:
- total member terdaftar
- total member dengan subscription `active` atau `processed`
- total subscription dengan ringkasan package `private`
- total subscription dengan ringkasan package `share`
- total subscription dengan ringkasan package `mixed`
- total asset
- total transaksi sukses dalam Rupiah

Definisi metrik:
- `total member terdaftar` = semua user dengan role `member`
- `total member berlangganan` = user dengan subscription berjalan `active` atau `processed`
- `total subscription private/share/mixed` = subscription berjalan yang ringkasan package-nya termasuk kategori tersebut
- `total asset` = jumlah asset yang saat ini masih ada di inventory, termasuk yang disabled atau expired, tetapi tidak termasuk yang sudah hard delete
- `total transaksi sukses (Rp)` = jumlah `transactions.status = success` pada range yang sedang dipilih

Menampilkan chart untuk:
- jumlah member
- jumlah transaksi
- total sales (Rp)

Default range statistik transaksi dan chart: 30 hari terakhir.

`Live User` menampilkan 50 member terbaru yang dianggap online. Definisi online pada v1: `lastSeenAt` dari app session atau extension track masih dalam 10 menit terakhir. Jika keduanya ada, gunakan timestamp yang paling baru.

### 7.3. Subscriber (`/admin/subscriber`)
Tujuan: mengelola subscription user secara manual.

Fitur:
- auto-search by username, user ID, email
- filter by asset type, subscription status, date range

Tabel minimum:
- user
- subscription status
- start date
- expires at
- total spent (Rp)
- package name
- action `Edit`

Definisi `total spent (Rp)`:
- jumlah seluruh `transactions.status = success` milik user tersebut sepanjang waktu

Popup `Add New / Edit Subscriber`:
- select user
- select package
- duration
  - default mengikuti package
  - admin boleh override jumlah hari

- asset selection
  - hanya menampilkan asset dengan status `available`
  - untuk asset `private`, hanya tampilkan yang belum dipakai user lain
  - untuk asset `share`, tampilkan yang aktif dan belum expired
  - setelah package dipilih, candidate asset di UI hanya boleh menampilkan asset yang tuple exact `platform + asset_type`-nya termasuk dalam entitlement package tersebut
  - admin boleh memilih asset spesifik untuk satu atau lebih entitlement sebagai override manual
  - entitlement yang tidak dipilih manual tetap harus dipenuhi oleh fulfillment engine otomatis saat subscription disimpan
  - validasi final tetap dilakukan server-side; admin tidak boleh menyimpan asset yang tuple exact-nya tidak cocok dengan entitlement package

Catatan:
- `status` subscription adalah hasil sistem, bukan input bebas admin
- setelah admin menyimpan perubahan, sistem menghitung ulang apakah subscription menjadi `active` atau `processed`

`Quick Add Asset` pada popup ini:
- admin dapat membuat asset baru langsung dari popup
- field minimum: `platform`, `account`, `duration_days`, `note`, `proxy`, `asset_json`
- asset yang dibuat dari flow ini otomatis bertipe `private`
- asset tersebut langsung di-assign ke subscription yang sedang dibuat atau diedit

### 7.4. Users Management (`/admin/users`)
Fitur:
- auto-search by ID, email, username, public ID
- filter by role, status subscription, ringkasan package aktif (`private`, `share`, `mixed`, `none`)

Tabel minimum:
- ID
- user
- public ID
- role
- subscription status
- expires at
- created at
- updated at
- actions: `Edit`, `Ban/Unban`, `Change Password`, `View Details`

Aturan add new user:
- input: email, password, role
- username otomatis diambil dari bagian sebelum `@`
- jika username sudah dipakai, sistem menambahkan suffix unik
- `public_id` dibuat otomatis

`View Details` popup menampilkan:
- profil lengkap
- avatar editable
- info subscription aktif
- card daftar akses asset aktif
- tabel histori transaksi
- tabel histori login dan extension

### 7.5. CD-Key Management (`/admin/cdkey`)
Aturan:
- satu kode hanya bisa dipakai satu kali
- setelah sukses dipakai, `used_by` dan `used_at` wajib tersimpan

Fitur:
- search by code, package, used by
- filter by status, package, ringkasan package (`private`, `share`, `mixed`)

Tabel minimum:
- code
- package
- status (`used` atau `unused`)
- used by
- created by
- created at
- updated at

Popup `Add New`:
- pilih package
- input code
  - jika kosong, sistem generate otomatis kode unik 8-12 karakter alfanumerik uppercase

- input harga override opsional
  - jika kosong, gunakan harga package saat ini

### 7.6. Package Management (`/admin/package`)
Fitur:
- search by name
- filter by ringkasan package (`private`, `share`, `mixed`)

Tabel minimum:
- name
- amount (Rp)
- duration (days)
- checkout URL
- total used
- created at
- updated at
- action: `Edit`, `Disable/Enable`

Definisi `total used`:
- jumlah subscription berjalan dengan status `active` atau `processed` yang memakai package tersebut

Popup `Add New / Edit`:
- name
- price (Rp)
- duration (hari)
- checkout URL
- `is_extended`
- access assets (multiselect entitlement matrix per tuple `platform + asset_type` atau `accessKey`)

Aturan entitlement package:
- item entitlement harus unik per kombinasi `platform + asset_type`
- package boleh memiliki kombinasi campuran, misalnya `tradingview/private` dan `fxreplay/share`
- duplicate entitlement pada package yang sama tidak diperbolehkan
- ringkasan package `private/share/mixed` hanya turunan dari daftar entitlement dan tidak menentukan otorisasi secara langsung
- `Disable/Enable` package mengubah ketersediaan package di katalog aktif, tetapi history tetap aman
- package dihapus dari dashboard v1 melalui mekanisme `Disable/Enable`, bukan hard delete row package
- package yang di-disable tidak boleh dipakai untuk pembelian baru atau assign manual baru
- package yang di-disable tidak boleh dipakai untuk menerbitkan CD-Key baru
- subscription aktif yang sudah berjalan tetap berjalan normal
- CD-Key yang sudah diterbitkan sebelum package di-disable tetap valid karena memakai snapshot sendiri

### 7.7. Assets Management (`/admin/assets`)
Fitur:
- search by platform, note, username/email pemakai
- filter by asset type, status, date range

Tabel minimum:
- platform
- expires at
- note
- asset type
- status
- total used
- created at
- updated at
- actions: `View Details`, `Disable/Enable`, `Delete`

Definisi `total used`:
- jumlah assignment aktif saat ini pada asset tersebut

Popup `Add New / View Details`:
- platform
- asset type
- expires at
  - default `now + 30 hari`

- account
- note
- proxy
- asset JSON mentah

View details harus menampilkan:
- form edit asset
- daftar user yang sedang memakai asset tersebut

Catatan:
- `Disable/Enable` dipakai jika admin ingin menghentikan pemakaian asset tanpa menghapus histori master asset
- admin tidak boleh mengubah tuple exact `platform + asset_type` pada asset yang masih memiliki assignment aktif; perubahan tuple hanya boleh dilakukan saat asset tersebut tidak sedang dipakai

Aturan assignment:
- asset `private` maksimal punya 1 assignment aktif
- asset `share` boleh punya banyak assignment aktif

Aturan delete asset:
- `Delete` asset adalah hard delete aman
- jika asset masih punya assignment aktif, sistem wajib:
  - revoke assignment aktif
  - mencoba fulfillment ulang
  - mengubah subscription menjadi `processed` jika tidak ada pengganti

- asset yang sudah dihapus tidak lagi muncul di inventory aktif
- histori asset yang sudah dihapus tetap tersedia dari snapshot assignment minimum non-sensitif

### 7.8. Users Activity (`/admin/userlogs`) - Read Only
Halaman ini memiliki tiga tab:

#### Tab 1: Login History
Kolom minimum:
- user
- IP
- browser
- OS
- login time

Filter minimum:
- date range
- user
- OS

#### Tab 2: Extension Track
Kolom minimum:
- user
- IP
- city
- country
- browser
- OS
- extension version
- device ID
- extension ID
- first seen at
- last seen at

Aturan pencatatan:
- identity unik log extension adalah `user_id + device_id + ip_address + extension_id`
- jika kombinasi itu sama, update `lastSeenAt`
- jika kombinasi itu berbeda, buat row baru dengan `firstSeenAt` dan `lastSeenAt`

Catatan histori:
- histori asset lama yang sudah dihapus tetap dibaca dari snapshot assignment, bukan dari row asset aktif

#### Tab 3: Transactions
Kolom minimum:
- user
- package
- source
- amount (Rp)
- status
- created at
- updated at

Tab ini juga harus memiliki ringkasan revenue.

---

## 8. Payment Dummy
Halaman `/paymentdummy` hanya untuk simulasi pembayaran pada v1.

Flow minimum:
1. user datang dari flow pilih package
2. halaman menampilkan ringkasan package dan nominal
3. tombol `Bayar` akan membuat transaction `success`
4. setelah transaction sukses, sistem menjalankan aktivasi subscription sesuai aturan package
5. user diarahkan kembali ke `/console`

Tidak ada integrasi payment gateway real pada v1.

---

## 9. API untuk Chrome Extension

### 9.1. Aturan Keamanan Global
Semua endpoint extension wajib menerapkan aturan berikut:
- request harus membawa header `x-extension-id`
- nilai `Origin` harus cocok dengan allowlist extension, misalnya `chrome-extension://<extension_id>`
- cookie `app_session` wajib ada dan valid
- user tidak boleh berstatus banned
- response error wajib menggunakan format standar

Jika satu validasi gagal, request langsung ditolak tanpa membaca data asset.

### 9.2. Cookie dan Session
- cookie yang dipakai extension adalah `app_session`
- validasi session dilakukan terhadap `app_sessions`
- jika session sudah direvoke karena login di perangkat lain, API harus mengembalikan error `SESSION_REVOKED`

### 9.3. Aturan Naming API
- request body extension memakai `camelCase`
- response JSON extension memakai `camelCase`
- database memakai `snake_case`

### 9.4. `GET /api/extension/session`
Tujuan: mengembalikan status user, status subscription, daftar metadata asset yang saat ini boleh diakses, dan nonce singkat untuk request asset detail.

Aturan:
- endpoint hanya boleh sukses untuk subscription yang berstatus `active` atau `processed`
- jika subscription `expired`, `canceled`, atau tidak ada subscription berjalan, endpoint wajib menolak request dengan error `SUBSCRIPTION_EXPIRED`
- hanya mengembalikan asset yang sedang aktif di assignment user
- hanya mengembalikan asset yang masih valid di inventory aktif, yaitu tidak disabled dan belum expired
- tidak mengembalikan raw `asset_json`
- menghasilkan `requestNonce` yang valid selama 60 detik
- `requestNonce` terikat pada session aktif user
- setiap asset yang dikembalikan di response harus berasal dari assignment aktif yang dibuat dari `accessKey` yang valid milik subscription user
- endpoint ini hanya boleh mengembalikan asset yang masih ada di inventory aktif

Response format:

```json
{
  "user": {
    "id": "...",
    "username": "..."
  },
  "subscription": {
    "status": "active|processed",
    "packageName": "Starter",
    "endAt": "2026-02-01T00:00:00Z",
    "daysLeft": 12,
    "assets": [
      {
        "id": "asset_1",
        "accessKey": "tradingview:private",
        "assetType": "private",
        "platform": "tradingview",
        "expiresAt": "2026-02-01T00:00:00Z"
      },
      {
        "id": "asset_2",
        "accessKey": "fxreplay:share",
        "assetType": "share",
        "platform": "fxreplay",
        "expiresAt": "2026-02-01T00:00:00Z"
      }
    ]
  },
  "requestNonce": {
    "value": "nonce_xxx",
    "expiresAt": "2026-02-01T00:00:00Z"
  }
}
```

### 9.5. `GET /api/extension/asset?id=xxx`
Tujuan: mengambil detail mentah asset yang memang diizinkan untuk user.

Validasi tambahan:
- wajib membawa header `x-request-nonce`
- `x-request-nonce` harus cocok dengan nonce aktif milik session user dan belum expired
- asset yang diminta harus termasuk assignment aktif user
- subscription user harus berstatus `active` atau `processed`
- asset yang diminta harus masih ada di inventory aktif
- asset yang diminta harus ditolak jika `disabled_at is not null` atau `expires_at < now()` walaupun row assignment belum sempat direkonsiliasi

Response format:

```json
{
  "id": "asset_2",
  "accessKey": "fxreplay:share",
  "assetType": "share",
  "platform": "fxreplay",
  "expiresAt": "2026-02-01T00:00:00Z",
  "account": "...",
  "proxy": "...",
  "note": "...",
  "asset": [{ "name": "cookie1", "value": "val1" }]
}
```

### 9.6. `POST /api/extension/track`
Tujuan: mencatat heartbeat extension setiap 5 menit dan mendeteksi perubahan device atau jaringan.

Validasi keamanan:
- require `x-extension-id`
- validasi `app_session`
- user tidak boleh banned
- subscription user harus berstatus `active` atau `processed`
- jika subscription `expired`, `canceled`, atau tidak ada subscription berjalan, endpoint wajib menolak request dengan error `SUBSCRIPTION_EXPIRED`

Request body:

```json
{
  "deviceId": "uuid-unik-dari-extension",
  "extensionVersion": "1.0.0",
  "browser": "Chrome",
  "os": "Windows"
}
```

Data yang wajib diekstrak server-side dari request header:
- `ip_address`
- `city`
- `country`

Aturan pencatatan database `extension_tracks`:
1. cari record berdasarkan kombinasi `user_id + device_id + ip_address + extension_id`
2. jika ditemukan:
   - update `last_seen_at = now()`
   - update `extension_version` dengan versi terbaru
   - update metadata browser dan OS jika berubah

3. jika tidak ditemukan:
   - create record baru
   - set `first_seen_at = now()`
   - set `last_seen_at = now()`

Response sukses:

```json
{
  "success": true,
  "timestamp": "2026-03-27T00:00:00.000Z"
}
```

### 9.7. Standar Error Response
Semua error API extension wajib memakai format berikut:

```json
{
  "error": {
    "code": "...",
    "message": "..."
  }
}
```

Daftar kode error baku:
- `EXT_ORIGIN_DENIED`
- `EXT_HEADER_REQUIRED`
- `NONCE_REQUIRED`
- `NONCE_INVALID`
- `SESSION_MISSING`
- `SESSION_REVOKED`
- `USER_BANNED`
- `SUBSCRIPTION_EXPIRED`
- `ASSET_NOT_ALLOWED`
- `NOT_FOUND`

Catatan kode error:
- `SUBSCRIPTION_EXPIRED` dipakai sebagai kode generik untuk subscription yang tidak aktif dipakai oleh extension, yaitu `expired`, `canceled`, atau tidak ada subscription berjalan

---

## 9.8. Baseline Migration SQL
Baseline migration SQL untuk project ini sudah siap dan disimpan di folder `migrations/`.

Catatan implementasi:
- file migration sudah dipecah per domain agar mudah dibaca dan mudah di-apply dari clean database
- baseline schema, policy, trigger, view, dan RPC runtime ada di `migrations/001_extensions.sql` sampai `migrations/030_rpc.sql`
- seed development lengkap ada di `migrations/040_dev_seed_full.sql`
- saat database di-reset dari nol, apply migration mengikuti urutan file di folder `migrations/README.md`

## 10. Acceptance Rules yang Wajib Dijaga
Dokumen ini dianggap siap diimplementasikan jika aturan berikut tidak dilanggar:
- satu user hanya punya satu session aktif
- satu user hanya punya satu subscription berjalan pada satu waktu
- package menentukan entitlement secara eksplisit
- ringkasan package bukan dasar otorisasi
- otorisasi asset selalu berdasarkan kecocokan exact `platform + asset_type`
- user tidak boleh mengakses asset dari platform lain hanya karena `asset_type`-nya sama
- subscription `processed` tetap dapat mengakses assignment yang sudah tersedia
- admin tidak mengatur status subscription secara manual; status adalah hasil sistem
- asset `private` tidak pernah dipakai dua user aktif sekaligus
- asset `share` maksimal satu assignment aktif per user per platform
- upgrade atau downgrade selalu mencabut hak akses lama sebelum fulfillment baru
- admin bisa menghapus package dari katalog aktif dashboard melalui `Disable/Enable` tanpa merusak history
- admin bisa hard delete asset dari dashboard tanpa merusak history
- admin dashboard berjalan dengan session user admin biasa melalui server-side Next.js, bukan credential database istimewa di browser
- asset yang disabled atau expired harus langsung hilang dari semua read path aktif walaupun rekonsiliasi background belum selesai
- setelah asset dihapus, histori tetap tersedia dari snapshot assignment
- asset yang sudah dihapus tidak boleh muncul lagi di inventory aktif atau API extension
- semua route `/admin/*` hanya untuk admin
- semua `/api/extension/*` wajib memvalidasi header extension, origin, session, dan banned status
- semua response error extension mengikuti format baku
- wajib ikuti struktur folder `docs/agent-rules/folder-structure.md`
