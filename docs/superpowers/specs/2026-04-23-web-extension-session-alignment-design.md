# Desain Penyelarasan Session Web Member dan Extension

## Ringkasan
Dokumen ini mendesain perbaikan auth/session agar web member dan extension sama-sama mengikuti `app_session` sebagai source of truth session aplikasi. Tujuan utamanya adalah menghilangkan logout palsu sekitar 1 jam yang saat ini terjadi ketika `insforge_access_token` expired, walaupun cookie `app_session` masih aktif 30 hari.

Perbaikan ini tidak mengubah policy single-device. Login pada browser atau device baru tetap harus merevoke session aktif lama melalui `app_sessions`.

## Masalah Saat Ini
Saat login berhasil, aplikasi membuat dua kontrak session sekaligus:

- `app_session` berbasis opaque token yang disimpan di cookie dan diverifikasi terhadap tabel `app_sessions`
- `insforge_access_token` yang disimpan di cookie terpisah

Untuk member web, guard aplikasi saat ini tidak cukup memeriksa `app_session`. Guard juga mewajibkan `insforge_access_token` masih valid. Ketika token provider expired, kode server menganggap user tidak lagi authenticated dan merevoke session aktif di database. Akibatnya:

- web member ter-redirect ke `/login` walaupun cookie `app_session` masih aktif
- cookie browser dan session server menjadi tidak sinkron
- extension berisiko mengalami partial failure karena sebagian query masih bergantung pada token provider yang sama

## Tujuan
Desain ini dianggap berhasil jika memenuhi tujuan berikut:

- web member tetap authenticated selama `app_session` aktif dan belum direvoke
- extension API tetap berfungsi selama `app_session` aktif dan belum direvoke
- session lama tetap invalid ketika user login dari browser atau device baru
- query extension dan read-path member tidak lagi gagal hanya karena `insforge_access_token` expired
- perubahan tetap kecil, mengikuti boundary repo yang ada, dan tidak memperkenalkan auth stack baru

## Di Luar Scope
Hal-hal berikut tidak termasuk dalam desain ini:

- menambahkan refresh token flow baru untuk web app
- mengganti policy single-device menjadi multi-device
- mengubah kontrak login/register dasar
- mengubah endpoint extension menjadi sistem auth terpisah dari web app
- menghapus seluruh penggunaan `insforge_access_token` untuk semua use case di repo tanpa melihat kebutuhan riil tiap path

## Source Of Truth
Semua keputusan di dokumen ini tunduk pada:

- `docs/PRD.md`
- `docs/IMPLEMENTATION_PLAN.md`
- `docs/works/m1-auth-spec.md`
- `docs/agent-rules/folder-structure.md`
- implementasi session saat ini di `src/modules/sessions/**`
- implementasi extension API saat ini di `src/modules/extension/**`

Jika ada benturan, kontrak security session aplikasi dan policy single-device tetap menjadi prioritas utama.

## Opsi Pendekatan

### Opsi 1. `app_session` menjadi source of truth untuk web member dan extension
Pendekatan ini menjadikan `app_session` sebagai kontrak autentikasi aplikasi. Semua guarded read-path web member dan extension harus mengambil user dari `activeSession.userId`, lalu membaca data lewat trusted server-side repository.

Kelebihan:

- selaras dengan kontrak session 30 hari yang sudah dijanjikan ke user
- tidak butuh refresh token flow baru
- paling cocok dengan policy single-device yang sudah hidup di `app_sessions`

Kekurangan:

- perlu memindahkan beberapa read path dari database client berbasis access token ke repository trusted server-side

### Opsi 2. Tetap provider-centric dan menambah refresh flow
Pendekatan ini mempertahankan `insforge_access_token` sebagai syarat auth member, lalu menambah mekanisme refresh session provider ketika token expired.

Kelebihan:

- lebih dekat ke lifecycle auth provider

Kekurangan:

- perubahan lebih besar
- repo saat ini belum memiliki refresh flow yang siap dipakai server-side
- menambah kompleksitas state dan debugging

### Opsi 3. Hybrid sebagian `app_session`, sebagian token provider
Pendekatan ini mempertahankan pola campuran saat ini dengan sedikit patch agar logout palsu berkurang.

Kelebihan:

- patch awal tampak kecil

Kekurangan:

- mismatch kontrak sangat mudah muncul lagi
- extension dan web bisa tetap tidak sinkron

## Keputusan Desain
Dipilih Opsi 1.

`app_session` menjadi source of truth session aplikasi untuk:

- shell member web
- console read model member
- package read path member
- extension session bootstrap
- extension asset access
- extension heartbeat

`insforge_access_token` tidak lagi menjadi prasyarat autentikasi rutin untuk web member dan extension. Token provider hanya boleh dipakai pada path yang benar-benar masih membutuhkannya secara eksplisit, bukan sebagai guard umum session aplikasi.

## Prinsip Inti

### 1. Session aplikasi diverifikasi hanya dari `app_sessions`
Validasi user terautentikasi harus dimulai dari cookie `app_session`, hash token, dan row aktif `app_sessions` yang `revoked_at is null`.

Konsekuensi:

- expiry praktis untuk web member dan extension mengikuti lifecycle `app_session`
- logout karena token provider expired tidak boleh lagi merevoke `app_sessions`

### 2. Identity aplikasi diturunkan dari `activeSession.userId`
Setelah session aktif ditemukan, user identity final harus dibaca dari `profiles` atau query trusted server-side lain dengan `activeSession.userId` sebagai authority.

Konsekuensi:

- member shell tidak lagi perlu meminta `getCurrentUser()` ke provider pada setiap request
- extension juga tidak lagi perlu bergantung pada cookie access token untuk membaca snapshot user

### 3. Query member dan extension pindah ke trusted server-side repository
Query yang saat ini memakai `createAuthenticatedInsForgeServerDatabase()` atau `readValidatedInsForgeAccessTokenForActiveAppSession()` untuk read-path aplikasi harus dipindah ke repository server-side yang memakai adapter trusted.

Konsekuensi:

- enforcement akses tetap terjadi di server
- akses data tetap dibatasi oleh `activeSession.userId` atau guard admin yang eksplisit
- browser tidak pernah mendapat credential database istimewa

### 4. Single-device policy tetap tidak berubah
Login sukses tetap merevoke semua session aktif lama user sebelum membuat row aktif baru.

Konsekuensi:

- behavior "login di device/browser baru meng-invalidasi session lama" tetap hidup
- extension lama yang masih memakai session lama akan gagal validasi `app_session` seperti sekarang

## Arsitektur Yang Dituju

### Boundary utama
Perubahan dibagi menjadi empat boundary:

1. `src/modules/sessions/**` sebagai source of truth lifecycle `app_session`
2. `src/modules/users/services.ts` sebagai shell guard web
3. `src/modules/console/**` dan `src/modules/packages/**` sebagai read-path member
4. `src/modules/extension/**` sebagai runtime API extension

### Tanggung jawab per boundary

#### Session boundary
- membuat session baru
- memvalidasi session aktif
- revoke session saat logout atau login baru
- touch `last_seen_at`

#### User shell boundary
- mengambil current app user dari `app_session`
- memeriksa banned/member/admin
- tidak lagi menggugurkan member hanya karena token provider expired

#### Member read-model boundary
- membaca snapshot console dan package dengan trusted repository
- membatasi hasil berdasarkan `activeSession.userId` untuk member
- tetap mengizinkan admin membaca user lain melalui path admin yang eksplisit

#### Extension boundary
- memvalidasi request extension lewat origin/header + `app_session`
- membaca snapshot subscription dan asset via trusted repository
- mengirim heartbeat tanpa syarat token provider yang terpisah

## Perubahan Desain per Area

### A. `getAuthenticatedAppUser()` tidak lagi memakai token provider sebagai guard member umum
Fungsi ini cukup:

1. memvalidasi `app_session`
2. membaca profile dari `activeSession.userId`
3. mereject user yang profile-nya hilang atau dibanned sesuai kontrak existing

Fungsi ini tidak lagi memanggil validasi token provider untuk sekadar memastikan member masih login.

### B. `readValidatedInsForgeAccessTokenForActiveAppSession()` tidak lagi menjadi dependency wajib read-path member
Function ini tetap boleh dipertahankan untuk path khusus yang memang masih butuh token provider, tetapi:

- tidak boleh menjadi syarat default shell member
- tidak boleh menjadi syarat default extension session
- tidak boleh merevoke `app_sessions` hanya karena provider token expired pada use case yang seharusnya cukup memakai app session

### C. `console` read-path memakai trusted server-side data access
`getConsoleSnapshot()` dan `getConsoleStateSnapshot()` harus bisa berjalan dari `activeSession.userId` tanpa access token provider browser.

Aturan aksesnya:

- member hanya boleh membaca datanya sendiri berdasarkan session aktif
- admin tetap boleh membaca user lain lewat guard admin eksplisit

Implementasi detail boleh berupa repository baru atau reuse repository existing selama tetap mengikuti boundary repo dan tidak membuat abstraction yang tidak perlu.

### D. `packages` read-path member juga tidak boleh bergantung pada token provider browser
`listActivePackageRowsForMember()` dan `getActivePackageRowByIdForMember()` harus membaca data melalui trusted server-side repository dan cukup memakai session aktif sebagai authority bahwa request berasal dari member terautentikasi.

### E. `extension` query path mengikuti `app_session`
`getExtensionSessionResponse()`, `getExtensionAssetResponse()`, dan heartbeat extension harus tetap dimulai dari `requireExtensionRequestContext()` yang memvalidasi `app_session`.

Seluruh query data di belakangnya tidak boleh lagi gagal hanya karena `insforge_access_token` browser expired.

Ini berarti repository extension yang saat ini memakai `createAuthenticatedInsForgeServerDatabase()` perlu dipindah ke trusted server-side repository tanpa ketergantungan ke cookie access token.

## Data Flow Setelah Perbaikan

### 1. Web member membuka `/console`
1. layout member memanggil `requireMemberShellAccess()`
2. guard memvalidasi `app_session`
3. guard membaca profile dari `activeSession.userId`
4. guard mengizinkan member masuk selama session aktif dan profile valid
5. query console membaca snapshot via trusted server-side repository untuk user yang sama

### 2. Extension memanggil `GET /api/extension/session`
1. server memvalidasi origin dan header extension
2. server membaca cookie `app_session`
3. server memvalidasi session aktif di `app_sessions`
4. server membaca profile dan subscription snapshot berdasarkan `activeSession.userId`
5. server mengembalikan user info, status subscription, assets yang diizinkan, dan nonce bila relevan

### 3. User login dari browser/device lain
1. login baru merevoke session aktif lama user
2. session baru dibuat dan cookie baru ditulis
3. request dari browser/device lama gagal validasi `app_session`
4. web shell lama ter-redirect ke login dan extension lama menerima error session revoked

## Aturan Error Handling

- token provider expired tidak boleh lagi diperlakukan sebagai alasan untuk merevoke `app_sessions` pada flow web member normal atau extension normal
- jika profile hilang untuk session aktif, session boleh direvoke seperti kontrak existing karena data aplikasi memang tidak konsisten
- jika session cookie hilang atau row session sudah revoked, web dan extension harus gagal seperti biasa
- jika extension request tidak lolos origin/id validation, endpoint tetap gagal seperti kontrak existing

## Dampak ke Security

- tidak ada penurunan security untuk single-device karena enforcement tetap hidup di `app_sessions`
- tidak ada credential istimewa yang dipindah ke browser
- trusted server-side repository justru mengurangi ketergantungan ke token provider browser untuk read-path internal aplikasi
- admin access tetap harus dicek eksplisit dan tidak boleh diwariskan otomatis dari session member

## Dampak ke Testing
Regression test wajib membuktikan hal berikut:

- member tetap authenticated walaupun `insforge_access_token` hilang atau stale, selama `app_session` aktif
- extension session bootstrap tetap berhasil walaupun provider token tidak tersedia, selama `app_session` aktif
- login pada browser/device baru tetap menyebabkan session lama invalid
- path yang memang masih memakai token provider khusus tidak diregresikan tanpa sengaja

Verification minimal setelah implementasi:

- unit test untuk `src/modules/users/services.ts`
- unit test untuk `src/modules/console/**`, `src/modules/packages/**`, dan `src/modules/extension/**` yang terdampak
- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- browser verification pada flow login member, reload `/console`, dan session extension

## Risiko dan Mitigasi

### Risiko 1. Scope melebar karena banyak query member saat ini memakai access token provider
Mitigasi: fokus hanya pada read-path yang benar-benar dipakai member shell dan extension saat ini; jangan refactor path lain yang tidak relevan.

### Risiko 2. Admin dan member share query yang sama tetapi authority berbeda
Mitigasi: authority harus diselesaikan di service/query boundary yang jelas, bukan lewat asumsi implicit dari token provider.

### Risiko 3. Ada path extension yang diam-diam masih memakai access token provider
Mitigasi: audit semua repository di `src/modules/extension/**` dan semua helper yang dipakai extension sebelum implementasi final dinyatakan selesai.

## Hasil Akhir Yang Diharapkan
Setelah desain ini diimplementasikan:

- user member web tidak lagi auto logout sekitar 1 jam hanya karena token provider expired
- extension tetap bisa membaca session, asset, dan heartbeat selama `app_session` masih valid
- login pada browser/device baru tetap mengakhiri session lama secara konsisten di web dan extension
- kontrak session aplikasi menjadi tunggal, lebih mudah dipahami, dan selaras dengan janji masa aktif cookie 30 hari
