# Desain Milestone 11: Extension API

## Ringkasan
Milestone 11 menutup integrasi akhir antara aplikasi web dan Chrome Extension dengan tiga endpoint resmi di bawah `/api/extension/*`:

- `GET /api/extension/session`
- `GET /api/extension/asset?id=...`
- `POST /api/extension/track`

Milestone ini harus mengikuti `docs/PRD.md`, `docs/DB.md`, dan `docs/IMPLEMENTATION_PLAN.md` tanpa membuat jalur autentikasi kedua, tanpa membuka endpoint publik lain di luar kebutuhan extension, dan tanpa memperlemah guard yang sudah dikunci pada milestone sebelumnya.

Desain ini juga mengunci bahwa pembuktian browser untuk Milestone 11 tidak boleh memakai tab web biasa sebagai simulator request extension. Verifikasi harus memakai kombinasi:

- route browser nyata di aplikasi: `/console/extension-harness`
- companion Chrome dev extension di repo ini untuk mengirim request nyata dari konteks `chrome-extension://...`
- verifikasi backend read-only via `npx @insforge/cli`

Tujuannya adalah memastikan validasi `Origin`, `x-extension-id`, `app_session`, `requestNonce`, status banned, status subscription, dan standard error response benar-benar terbukti dari jalur request yang sama dengan jalur produksi extension.

## Tujuan
Milestone 11 dianggap selesai jika semua tujuan ini tercapai:

- Chrome Extension dapat memakai session login web yang sama melalui cookie `app_session`
- endpoint session hanya mengembalikan metadata asset aktif yang masih valid di inventory aktif
- endpoint asset hanya mengembalikan raw asset untuk assignment aktif yang benar-benar diizinkan user dan masih valid
- endpoint track menulis atau meng-update `extension_tracks` sesuai identity unik `user_id + device_id + ip_address + extension_id`
- semua endpoint extension menolak request tidak valid dengan kode error baku yang sesuai PRD
- semua proof milestone dapat dijalankan ulang melalui browser nyata dan extension dev harness, lalu dibuktikan ulang melalui InsForge CLI pada invariant backend yang tidak langsung terlihat dari UI

## Ruang Lingkup
Yang termasuk dalam milestone ini:

- implementasi route handler `/api/extension/session`
- implementasi route handler `/api/extension/asset`
- implementasi route handler `/api/extension/track`
- penguatan boundary `src/modules/extension/*` untuk guard pipeline, mapping response, dan flow nonce
- route dev-only `/console/extension-harness` untuk menjalankan dan membaca hasil verifikasi browser
- companion Chrome dev extension di repo sebagai executor request nyata dari origin extension
- standard error response extension dengan kode baku PRD
- proof matrix browser dan backend untuk semua skenario sukses dan negative path di Milestone 11

Yang tidak termasuk dalam milestone ini:

- fitur production browser extension di luar kebutuhan verifikasi milestone
- jalur autentikasi baru khusus extension
- endpoint publik lain di luar `/api/extension/*`
- refactor besar pada auth, console, subscriptions, atau admin logs yang tidak langsung dibutuhkan oleh kontrak extension API

## Source Of Truth
Semua keputusan pada desain ini tunduk pada dokumen berikut:

- `docs/PRD.md`
- `docs/DB.md`
- `docs/IMPLEMENTATION_PLAN.md`
- `docs/agent-rules/folder-structure.md`

Jika ada ambiguity implementasi, keputusan yang benar adalah yang paling ketat terhadap dokumen di atas, bukan yang paling nyaman untuk implementasi.

## Keputusan Desain Utama

### 1. Model verifikasi adalah hybrid, bukan web-only
`/console/extension-harness` adalah route browser nyata untuk mengontrol skenario dan membaca hasil, tetapi request aktual ke `/api/extension/*` harus dikirim oleh companion Chrome dev extension dari konteks extension asli.

Alasan keputusan ini:

- `Origin` extension tidak dapat diverifikasi akurat dari tab browser biasa
- proof `x-extension-id` dan cookie web bersama lebih valid jika request datang dari extension nyata
- milestone mewajibkan proof browser route nyata, tetapi juga mewajibkan extension dev harness khusus

Konsekuensinya:

- harness web tidak boleh menjadi server-side proxy yang menyamar sebagai extension
- harness web tidak boleh menjadi simulator origin buatan
- companion extension adalah bagian dari tooling verifikasi milestone, bukan pengganti aplikasi web

### 2. Session extension wajib memakai `app_session` yang sama dengan web app
Milestone ini tidak boleh membuat token baru, cookie baru, atau auth path terpisah untuk extension. Extension harus memakai cookie `app_session` yang sama dengan web login flow.

Konsekuensinya:

- session lama yang direvoke saat single-device login enforcement harus langsung tidak valid juga untuk extension
- request extension tanpa `app_session` yang valid harus gagal
- pembuktian sesi harus dilakukan dari browser profile yang sama antara web app dan companion extension

### 3. `requestNonce` tetap stateless, session-bound, dan berlaku 60 detik
Baseline project sudah memiliki implementasi nonce berbasis signature HMAC yang mengikat `sessionId`, `userId`, dan `expiresAt`. Milestone 11 tidak memperkenalkan tabel nonce baru.

Konsekuensinya:

- `GET /api/extension/session` mengeluarkan nonce baru
- `GET /api/extension/asset` wajib memvalidasi nonce itu terhadap session aktif yang sama
- nonce yang hilang, rusak, expired, atau dipakai pada session lain harus ditolak

### 4. Read path extension harus tunduk pada invariant M10
Endpoint extension tidak boleh mengembalikan asset yang disabled, expired, deleted, atau sudah tidak valid hanya karena row assignment belum sempat direkonsiliasi cron.

Konsekuensinya:

- endpoint session hanya mengembalikan asset aktif yang masih valid di inventory aktif
- endpoint asset harus recheck asset valid secara real-time
- desain ini harus reuse helper read yang sejalan dengan aturan M6 dan M10, bukan membuat query baru yang mengabaikan guard tersebut

### 5. Harness route hanya hidup di development
Route `/console/extension-harness` adalah tooling dev-only dan harus ditolak pada production.

Konsekuensinya:

- route tidak muncul pada navigasi produk utama
- route tidak menjadi bagian surface area production
- companion extension di repo diposisikan sebagai tooling verifikasi, bukan artifact runtime product utama

## Arsitektur

### Boundary utama
Implementasi M11 dibagi menjadi empat boundary:

1. route handler `/api/extension/*`
2. module domain `src/modules/extension/*`
3. module session yang sudah ada di `src/modules/sessions/*`
4. companion dev tooling: route harness dan dev extension

### Tanggung jawab tiap boundary

#### Route handler `/api/extension/*`
Route handler harus tetap tipis. Tanggung jawabnya:

- membaca request
- memanggil service extension yang sesuai
- mengembalikan `Response.json(...)`
- tidak menaruh business logic inti di `route.ts`

#### `src/modules/extension/*`
Ini adalah boundary domain utama milestone. Tanggung jawabnya:

- validasi allowlist `x-extension-id` dan `Origin`
- validasi session extension
- validasi banned user
- validasi status subscription `active` atau `processed`
- issuance dan verifikasi `requestNonce`
- mapping response `camelCase`
- penulisan heartbeat extension ke `extension_tracks`
- pemetaan error domain ke error contract extension

#### `src/modules/sessions/*`
Module session tetap menjadi source of truth untuk:

- validasi `app_session`
- touch `app_sessions.last_seen_at`
- create dan verify session-bound nonce

Milestone 11 tidak menduplikasi logic ini ke module extension.

#### Companion dev tooling
Companion dev tooling terdiri dari:

- route browser nyata `/console/extension-harness`
- Chrome dev extension di repo untuk menjalankan request nyata dari extension origin

Harness web bertugas mengatur skenario dan membaca hasil. Companion extension bertugas mengirim request aktual.

## File Map

```txt
src/
|- app/
|  |- (extension-dev)/
|  |  `- console/
|  |     `- extension-harness/
|  |        |- page.tsx
|  |        `- _components/
|  |           |- extension-harness-shell.tsx
|  |           |- extension-request-panel.tsx
|  |           |- extension-response-viewer.tsx
|  |           `- extension-scenario-list.tsx
|  `- api/
|     `- extension/
|        |- session/route.ts
|        |- asset/route.ts
|        `- track/route.ts
|- modules/
|  `- extension/
|     |- types.ts
|     |- schemas.ts
|     |- repositories.ts
|     |- services.ts
|     `- queries.ts
`- lib/
   `- extension-api/
      `- errors.ts

dev/
`- extension-harness/
   |- allowed/
   |  |- manifest.json
   |  |- background.js
   |  `- content-script.js
   |- denied/
   |  |- manifest.json
   |  |- background.js
   |  `- content-script.js
   `- README.md
```

### Penjelasan file map

- `src/app/api/extension/*/route.ts`: entry point HTTP resmi extension API
- `src/modules/extension/services.ts`: orchestration utama untuk semua flow extension
- `src/modules/extension/repositories.ts`: wrapper ke helper RPC atau data access yang dibutuhkan route extension
- `src/modules/extension/queries.ts`: read model khusus untuk route harness, bukan untuk route handler extension
- `src/lib/extension-api/errors.ts`: helper transport-only untuk membentuk error response seragam tanpa memindahkan business logic domain ke `src/lib`
- `dev/extension-harness/*`: tooling dev companion yang hidup di root repo dan tidak diperlakukan sebagai runtime app utama

## Kontrak Request Dan Response

### Aturan umum naming
Semua request body dan response JSON extension harus memakai `camelCase`.

Database tetap `snake_case`. Mapping dilakukan di layer module extension atau helper query yang dipanggilnya.

### `GET /api/extension/session`
Tujuan endpoint ini adalah mengembalikan:

- identitas user minimal
- status subscription aktif yang dipakai extension
- daftar metadata asset aktif yang valid
- `requestNonce` 60 detik untuk request asset detail

Response sukses minimal:

```json
{
  "user": {
    "id": "...",
    "username": "..."
  },
  "subscription": {
    "status": "active",
    "packageName": "Starter",
    "endAt": "2026-02-01T00:00:00Z",
    "daysLeft": 12,
    "assets": [
      {
        "id": "...",
        "accessKey": "tradingview:private",
        "assetType": "private",
        "platform": "tradingview",
        "expiresAt": "2026-02-01T00:00:00Z"
      }
    ]
  },
  "requestNonce": {
    "value": "...",
    "expiresAt": "2026-02-01T00:00:00Z"
  }
}
```

Ketentuan penting:

- tidak boleh mengembalikan raw `asset_json`
- hanya boleh mengembalikan asset yang aktif dan masih valid di inventory aktif
- `processed` tetap boleh sukses dan hanya menampilkan asset yang memang sudah tersedia

### `GET /api/extension/asset?id=...`
Tujuan endpoint ini adalah mengembalikan detail mentah asset yang memang diizinkan untuk user.

Response sukses minimal:

```json
{
  "id": "...",
  "accessKey": "fxreplay:share",
  "assetType": "share",
  "platform": "fxreplay",
  "expiresAt": "2026-02-01T00:00:00Z",
  "account": "...",
  "proxy": "...",
  "note": "...",
  "asset": []
}
```

Ketentuan penting:

- wajib memakai `x-request-nonce`
- asset harus tetap aktif, valid, dan termasuk assignment aktif user
- asset invalid karena `disabled_at` atau `expires_at < now()` harus ditolak walaupun assignment belum direkonsiliasi

### `POST /api/extension/track`
Tujuan endpoint ini adalah mencatat heartbeat extension.

Request body minimal:

```json
{
  "deviceId": "uuid-unik-dari-extension",
  "extensionVersion": "1.0.0",
  "browser": "Chrome",
  "os": "Windows"
}
```

Response sukses minimal:

```json
{
  "success": true,
  "timestamp": "2026-03-27T00:00:00.000Z"
}
```

Ketentuan penting:

- request body harus tetap `camelCase`
- metadata `ip`, `city`, dan `country` diambil server-side dari trusted header source yang sudah dikunci sejak milestone foundation
- write path harus mengikuti aturan unique identity `user_id + device_id + ip_address + extension_id`

## Guard Pipeline Bersama Untuk Semua Endpoint
Semua `/api/extension/*` harus memakai urutan validasi yang sama dan berhenti pada kegagalan pertama.

Urutan validasi:

1. validasi `x-extension-id`
2. validasi `Origin`
3. validasi cookie `app_session`
4. validasi session aktif terhadap `app_sessions`
5. validasi user tidak banned
6. validasi subscription `active` atau `processed`

Catatan:

- jika satu validasi gagal, request langsung ditolak tanpa membaca asset sensitif
- endpoint asset menambah validasi nonce setelah guard dasar lolos
- endpoint track memakai guard dasar yang sama sebelum write heartbeat dijalankan

## Detail Perilaku Route

### `GET /api/extension/session`
Perilaku route:

- route memanggil guard pipeline bersama
- service membaca snapshot subscription dan daftar asset aktif valid melalui trusted server-side read path yang sejalan dengan console read model
- service mengeluarkan nonce session-bound 60 detik
- response dimapping ke `camelCase`

Keputusan integrasi read path:

- prioritas pertama adalah reuse helper atau RPC yang sudah sejalan dengan invariant M6 dan M10
- jika helper saat ini belum cukup untuk seluruh kontrak response extension, penambahan komposisi read harus tetap menjaga rule asset valid yang sama dengan `/console`
- route session tidak boleh membuat query baru yang membuka kemungkinan asset disabled atau expired kembali terlihat

### `GET /api/extension/asset`
Perilaku route:

- route memanggil guard pipeline bersama
- route membaca `id` dari search params dan memvalidasinya
- route memvalidasi `x-request-nonce`
- service memverifikasi nonce terhadap session aktif yang sama
- service membaca detail raw asset melalui trusted server-side read path yang recheck assignment aktif, subscription valid, dan inventory valid secara real-time

Pemetaan error asset:

- nonce tidak ada -> `NONCE_REQUIRED`
- nonce rusak / expired / mismatch -> `NONCE_INVALID`
- asset ID tidak ditemukan -> `NOT_FOUND`
- asset ada tetapi bukan assignment aktif valid user -> `ASSET_NOT_ALLOWED`

### `POST /api/extension/track`
Perilaku route:

- route memanggil guard pipeline bersama
- route memvalidasi request body `camelCase`
- service mengambil metadata jaringan dari trusted proxy header source
- service menjalankan upsert heartbeat ke `extension_tracks`
- response sukses mengembalikan `success` dan `timestamp`

Write path track harus tetap kecil dan terkontrol:

- reuse RPC `upsert_extension_track`
- tidak menulis langsung ke tabel dari client extension
- tidak membutuhkan endpoint publik tambahan di luar route ini

## Error Contract
Semua error extension wajib berbentuk:

```json
{
  "error": {
    "code": "...",
    "message": "..."
  }
}
```

Kode error yang dipakai persis sesuai PRD:

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

Aturan pemetaan minimum:

- header extension hilang -> `EXT_HEADER_REQUIRED`
- header extension ada tetapi `x-extension-id` tidak masuk allowlist runtime -> `EXT_ORIGIN_DENIED`
- origin tidak diizinkan -> `EXT_ORIGIN_DENIED`
- cookie tidak ada -> `SESSION_MISSING`
- cookie ada tetapi session tidak lagi valid -> `SESSION_REVOKED`
- profile banned -> `USER_BANNED`
- subscription selain `active` atau `processed` -> `SUBSCRIPTION_EXPIRED`
- nonce hilang -> `NONCE_REQUIRED`
- nonce tidak valid -> `NONCE_INVALID`
- asset target tidak ditemukan -> `NOT_FOUND`
- asset target tidak boleh diakses user -> `ASSET_NOT_ALLOWED`

Error message boleh ramah, tetapi kode error tidak boleh menyimpang dari daftar ini.

Mapping HTTP status dikunci sebagai berikut agar contract route stabil dan mudah diuji:

- `EXT_HEADER_REQUIRED` -> `400`
- `NONCE_REQUIRED` -> `400`
- `NONCE_INVALID` -> `400`
- `SESSION_MISSING` -> `401`
- `SESSION_REVOKED` -> `401`
- `EXT_ORIGIN_DENIED` -> `403`
- `USER_BANNED` -> `403`
- `SUBSCRIPTION_EXPIRED` -> `403`
- `ASSET_NOT_ALLOWED` -> `403`
- `NOT_FOUND` -> `404`

## Desain Harness Dev-Only

### Route browser: `/console/extension-harness`
Route ini adalah verification console untuk development. Path final tetap `/console/extension-harness`, tetapi file route tidak boleh ditempatkan di route group `(member)` karena shell member saat ini memang mengarahkan admin kembali ke `/admin`. Karena itu, route ini harus hidup di route group dev terpisah yang tetap menghasilkan pathname `/console/extension-harness`.

Route ini:

- hanya hidup di development
- hanya bisa dibuka oleh user yang sudah login
- bisa dibuka oleh member maupun admin tanpa mengubah guard `/console` utama untuk member shell biasa
- tidak muncul di navigasi produk utama

Tanggung jawab route ini:

- menampilkan status koneksi ke companion extension
- menampilkan skenario verifikasi M11
- men-trigger request melalui companion extension
- menyediakan raw request editor untuk override request skenario secara sadar saat dibutuhkan
- menampilkan request efektif, response JSON, status HTTP, dan hasil assertion
- menyimpan response history dan state terakhir agar tetap bisa dibaca setelah reload

Route ini bukan source of truth request extension. Ia hanya control panel dan viewer hasil.

### Companion Chrome dev extension
Companion extension berada di root repo pada `dev/extension-harness/`.

Tanggung jawabnya:

- menerima command dari harness web
- mengirim request nyata ke `/api/extension/*` dari konteks extension origin
- mengembalikan hasil request ke harness web untuk divisualisasikan

Companion tooling harus menyediakan minimal dua varian installable untuk proof negative path:

- varian `allowed` yang origin dan `x-extension-id`-nya memang ada di allowlist runtime
- varian `denied` yang sengaja tidak ada di allowlist runtime

Tujuannya agar `EXT_ORIGIN_DENIED` dapat dibuktikan dari request nyata, bukan dari header palsu di tab web.

## Detail Interaksi Harness

### Panel status
Panel ini menampilkan:

- user login aktif
- status session browser saat ini
- status koneksi ke companion extension
- extension ID yang sedang dipakai

### Daftar skenario
Daftar skenario dibagi menjadi:

- session success
- session processed
- session missing
- session revoked
- session banned
- session subscription expired
- asset success
- asset missing nonce
- asset invalid nonce
- asset expired nonce
- asset not found
- asset not allowed
- track success
- track same identity update
- track different identity insert
- missing extension header
- denied origin

Setiap skenario memiliki:

- deskripsi singkat
- endpoint target
- expected status
- expected error code atau expected required fields

### Request panel
Panel ini menampilkan data request efektif yang dikirim companion extension:

- method
- URL
- header efektif
- body efektif
- nonce yang dipakai jika ada

Panel ini juga harus menyediakan raw request editor dengan guardrail berikut:

- default selalu memakai preset skenario agar checklist utama tetap repeatable
- editor hanya dipakai untuk replay atau negative-path tambahan yang sadar
- editor tidak boleh mengubah fakta bahwa request tetap dieksekusi oleh companion extension nyata

### Response viewer
Panel ini menampilkan:

- HTTP status
- raw JSON response
- hasil assertion contract
- hasil leak check untuk field yang tidak boleh muncul

Harness juga harus memiliki response history ringan yang persist antar reload, minimal berisi:

- waktu eksekusi
- nama skenario
- endpoint
- status
- ringkasan hasil assertion

Contoh assertion:

- response memakai `camelCase`
- required field ada semua
- error code sesuai ekspektasi
- `GET /api/extension/session` tidak membocorkan `asset_json`

## Pembuktian Checklist Ke Proof Matrix

### Proof untuk `GET /api/extension/session`
Checklist yang harus dibuktikan:

- session sukses untuk user valid
- response `camelCase`
- asset valid saja yang muncul
- raw `asset_json` tidak bocor
- akun `processed` hanya menampilkan asset parsial yang memang ter-assign

Proof browser:

- login ke web app di browser profile yang sama dengan companion extension
- jalankan skenario session yang relevan dari `/console/extension-harness`
- baca response di harness

Proof backend:

- verifikasi asset yang returned tetap konsisten dengan read model aktif dan inventory valid

### Proof untuk `GET /api/extension/asset`
Checklist yang harus dibuktikan:

- asset sukses dengan nonce valid
- nonce hilang -> `NONCE_REQUIRED`
- nonce invalid atau expired -> `NONCE_INVALID`
- asset tidak ada -> `NOT_FOUND`
- asset bukan milik assignment aktif -> `ASSET_NOT_ALLOWED`

Proof browser:

- ambil nonce dari response session
- jalankan skenario asset dari harness
- baca response dan assertion di harness

Proof backend:

- verifikasi asset yang lolos tetap konsisten dengan inventory aktif dan bukan asset invalid yang tertahan oleh row assignment lama

### Proof untuk `POST /api/extension/track`
Checklist yang harus dibuktikan:

- heartbeat sukses
- response memuat `success` dan `timestamp`
- row track muncul atau ter-update di `/admin/userlogs`
- same identity meng-update row yang sama
- different identity membuat row baru

Proof browser:

- jalankan skenario track dari harness
- buka `/admin/userlogs` dan pastikan readback terlihat di tab Extension Track

Proof backend:

- verifikasi `extension_tracks` menyimpan `session_id`, `extension_version`, `ip_address`, `city`, `country`, `browser`, dan `os`

### Proof untuk negative path global
Checklist yang harus dibuktikan:

- tanpa `x-extension-id` -> `EXT_HEADER_REQUIRED`
- origin tidak diizinkan -> `EXT_ORIGIN_DENIED`
- tanpa session -> `SESSION_MISSING`
- session lama setelah login ulang -> `SESSION_REVOKED`
- banned user -> `USER_BANNED`
- subscription tidak valid -> `SUBSCRIPTION_EXPIRED`

Proof browser:

- jalankan skenario negative path melalui harness yang memerintahkan companion extension memakai mode request yang sesuai

Proof backend:

- untuk revoked session, verifikasi row session lama masih ada tetapi sudah tidak aktif

## Backend Verification Via InsForge CLI
Verifikasi backend Milestone 11 harus tetap mengikuti rule global implementation plan.

Urutan minimum:

1. `npx @insforge/cli whoami`
2. `npx @insforge/cli current`
3. command read-only yang spesifik pada row yang baru dipengaruhi skenario browser

Target verifikasi minimum:

- `extension_tracks` upsert mengikuti identity unik `user_id + device_id + ip_address + extension_id`
- `session_id`, `extension_version`, `ip_address`, `city`, `country`, `browser`, dan `os` tersimpan benar
- asset yang lolos di extension session juga konsisten dengan read model aktif yang memblokir asset invalid
- session lama yang direvoke masih tercatat di `app_sessions` tetapi tidak dianggap valid oleh path validasi extension

## Risiko Dan Guardrail

### Risiko 1: proof palsu dari web-only simulator
Jika request dibuat dari tab web biasa atau server-side proxy simulator, proof `Origin` dan konteks extension menjadi palsu.

Guardrail:

- request yang dianggap valid untuk checklist M11 harus datang dari companion extension nyata
- harness web hanya mengontrol dan membaca hasil

### Risiko 2: drift antara extension read path dan console read path
Jika route extension membuat query manual baru yang tidak tunduk pada invariant M10, asset invalid bisa muncul lagi di endpoint extension.

Guardrail:

- reuse helper atau read model yang sejalan dengan `/console`
- hindari query ad hoc yang mengabaikan filter inventory valid

### Risiko 3: error code drift
Jika tiap route melempar error generik sendiri, standard error response akan mudah menyimpang dari PRD.

Guardrail:

- satu helper transport error kecil dengan mapping eksplisit ke kode baku PRD

### Risiko 4: cookie transport compatibility
Cookie `app_session` saat ini perlu dibuktikan kompatibel dengan jalur request extension nyata agar kontrak “session web yang sama” benar-benar berjalan.

Guardrail:

- desain M11 mewajibkan explicit verification terhadap transport cookie pada request extension nyata
- jika perilaku browser nyata menunjukkan contract cookie sekarang belum cukup, perubahannya harus minimal dan tetap mempertahankan satu session web bersama, bukan memperkenalkan token alternatif baru untuk extension

### Risiko 5: tooling dev bocor ke production
Route harness atau companion tooling yang aktif di production akan menambah surface area yang tidak dibutuhkan.

Guardrail:

- `/console/extension-harness` ditolak di production
- tooling dev ditempatkan jelas di root `dev/extension-harness`
- tidak ada link dari navigasi produk utama

## Acceptance Design Checklist
Desain ini dianggap lengkap jika implementasi nanti mengikuti semua poin berikut:

- tiga endpoint `/api/extension/*` tersedia sesuai kontrak M11
- semua request dan response extension memakai `camelCase`
- semua error extension memakai format baku PRD
- semua route extension memvalidasi `x-extension-id`, `Origin`, session, banned state, dan status subscription
- endpoint session hanya mengembalikan metadata asset aktif valid dan nonce 60 detik
- endpoint asset hanya mengembalikan raw asset yang benar-benar diizinkan user dengan nonce valid
- endpoint track menulis heartbeat sesuai identity unik `extension_tracks`
- proof browser memakai route nyata `/console/extension-harness`
- proof origin extension memakai companion Chrome dev extension, bukan web-only simulator
- verifikasi backend read-only via InsForge CLI menutup invariant yang tidak langsung browser-visible

## Dampak Ke Milestone Sebelumnya
Milestone 11 tidak boleh merusak hasil milestone sebelumnya. Secara khusus, implementasi nanti harus menjaga:

- single-device login enforcement dari Milestone 1
- filtering asset valid di `/console` dari Milestone 6
- admin extension logs readback dari Milestone 8
- live-user signal yang memanfaatkan `extension_tracks` dari Milestone 9
- compatibility rule M10 bahwa asset invalid harus langsung hilang dari read path aktif walaupun cron belum sempat berjalan

## Ringkasan Keputusan Final
Keputusan final desain M11 adalah:

- verification model: hybrid
- route proof: `/console/extension-harness`
- request executor: companion Chrome dev extension di root repo
- auth model: memakai `app_session` web yang sama
- nonce model: stateless HMAC, session-bound, TTL 60 detik
- read path safety: tunduk pada invariant M10 dan helper trusted read yang sudah ada
- error model: kode baku PRD tanpa penambahan kode baru di luar daftar resmi
- production exposure: harness dev-only, ditolak di production
