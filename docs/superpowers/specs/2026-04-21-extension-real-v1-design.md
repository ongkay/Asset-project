# Desain Extension Real v1 untuk Milestone 11

## Ringkasan
Dokumen ini mendesain extension runtime nyata yang hidup di `asset-ext/` dan memakai endpoint Milestone 11 sebagai jalur resmi runtime extension, bukan hanya tooling verifikasi. Extension ini diposisikan sebagai produk minimal yang cukup untuk menguji seluruh endpoint M11 secara nyata dari konteks Chrome Extension.

Surface utama extension v1 adalah:

- popup untuk use case harian
- options page untuk detail dan observability
- background service worker untuk orchestration, heartbeat, dan shared runtime state

Dokumen ini sengaja mengikuti boilerplate `asset-ext/` yang sudah ada. Perubahan tidak boleh memaksakan struktur baru yang bertentangan dengan entry file existing seperti `src/App.tsx`, `src/options.tsx`, dan `src/background.ts`.

## Tujuan
Extension real v1 dianggap tepat jika memenuhi tujuan berikut:

- user yang belum login web melihat tombol `Login`
- klik `Login` mengarah ke `http://localhost:3000/login`
- user yang sudah login web dapat melihat identitas user dan ringkasan langganan dari extension
- user tanpa subscription valid tetap dapat melihat info user dan status langganannya, tetapi tidak mendapat akses asset
- user dengan subscription `active` atau `processed` dapat melihat daftar asset ringkas
- klik asset dari popup membuka options page dan menampilkan raw JSON lengkap dari endpoint asset
- logout dari extension juga me-logout session web
- logout dari web saat popup terbuka membuat popup kembali ke state login
- extension mengirim heartbeat nyata melalui `POST /api/extension/track`

## Ruang Lingkup
Yang termasuk dalam desain ini:

- mengubah `asset-ext/` dari template demo menjadi extension runtime produk minimal
- reuse endpoint `GET /api/extension/session`, `GET /api/extension/asset`, dan `POST /api/extension/track`
- penambahan flow logout dari extension ke web app
- popup-first UX dengan options page sebagai layar detail/debug
- heartbeat background yang berjalan walau popup tertutup

Yang tidak termasuk:

- local login form di extension
- mutation bisnis lain selain logout
- filter, search, atau manajemen asset yang kompleks di popup
- offline mode
- multi-browser support di luar Chrome

## Source Of Truth
Semua keputusan di dokumen ini tunduk pada:

- `docs/PRD.md`
- `docs/IMPLEMENTATION_PLAN.md`
- `docs/agent-rules/folder-structure.md`
- `docs/superpowers/specs/2026-04-21-m11-extension-api-design.md`
- struktur boilerplate aktual di `asset-ext/`

Jika ada benturan, kontrak business dan security dari dokumen milestone tetap menang. Boilerplate `asset-ext/` hanya menentukan cara menyusun runtime extension, bukan mengubah aturan domain.

## Keputusan Desain Utama

### 1. `asset-ext/` adalah runtime product extension
Extension real v1 hidup penuh di `asset-ext/`, terpisah dari aplikasi Next.js. App Next.js tetap menjadi source of truth untuk auth, subscription, nonce, dan data asset.

Konsekuensi:

- extension tidak membuat auth path sendiri
- extension tidak membaca database langsung
- semua akses data resmi melewati endpoint M11

### 2. Popup adalah UI utama, options page adalah detail/debug
Popup harus tetap ringkas karena menjadi surface utama user. Raw JSON asset tidak ditampilkan inline di popup. Detail lengkap dipindahkan ke options page.

Konsekuensi:

- popup fokus pada identitas user, ringkasan langganan, daftar asset, dan action utama
- options page fokus pada selected asset detail, raw JSON, dan diagnostics

### 3. Background service worker adalah orchestration layer tunggal
`src/background.ts` menjadi satu-satunya boundary yang mengatur fetch ke endpoint extension, lifecycle nonce, heartbeat, dan shared runtime state.

Konsekuensi:

- popup dan options page tidak menduplikasi logic fetch kompleks
- popup dan options page lebih ringan dan cenderung presentational
- retry untuk nonce invalid dan pembaruan cache dilakukan di background

### 4. `GET /api/extension/session` menjadi bootstrap endpoint untuk semua session web valid
Kontrak milestone awal perlu direfine agar popup tetap berguna bagi user yang sudah login tetapi belum punya subscription valid. Endpoint session harus sukses untuk semua user dengan `app_session` valid, bukan hanya `active/processed`.

Konsekuensi:

- gate untuk menggunakan extension = session web valid
- gate untuk membaca asset detail = subscription `active` atau `processed`
- user tanpa subscription valid tetap bisa melihat info identitas dan status langganan

### 5. Akses asset tetap dijaga oleh endpoint asset
Walau endpoint session diperluas, endpoint asset tetap ketat. User hanya boleh mengakses detail asset jika subscription valid dan asset memang diizinkan.

Konsekuensi:

- `GET /api/extension/asset` tetap menjadi enforcement point utama untuk data sensitif asset
- `requestNonce` hanya diberikan jika subscription `active` atau `processed`
- user `none`, `expired`, atau `canceled` tidak boleh menerima nonce aktif untuk asset detail

## Arsitektur

### Boundary utama
Desain ini dibagi menjadi empat boundary:

1. app Next.js sebagai penyedia auth dan endpoint M11
2. popup React di `asset-ext/src/App.tsx`
3. options page React di `asset-ext/src/options.tsx`
4. background service worker di `asset-ext/src/background.ts`

### Tanggung jawab per boundary

#### Next.js app
- memvalidasi `app_session`
- mengembalikan snapshot session extension
- memvalidasi dan mengeluarkan `requestNonce`
- mengembalikan asset detail yang sah
- menulis heartbeat extension
- menjalankan logout web

#### Popup
- meminta snapshot runtime dari background
- menampilkan state login, loading, error, dan logged-in
- men-trigger login, refresh, open options, open asset detail, dan logout

#### Options page
- membaca selected asset detail dari background atau storage
- menampilkan raw JSON lengkap asset
- menampilkan session snapshot terakhir dan diagnostics dasar

#### Background service worker
- memanggil endpoint `session`, `asset`, `track`, dan `logout`
- menyimpan cache session singkat dan detail asset terakhir
- mengatur refresh nonce dan retry satu kali bila nonce invalid
- mengirim heartbeat periodik selama extension aktif

## File Map Yang Diusulkan
Struktur akhir harus mengikuti boilerplate yang ada. Perluasan file cukup dilakukan di sekitar entry point existing.

```txt
asset-ext/
|- src/
|  |- App.tsx
|  |- main.tsx
|  |- options.tsx
|  |- background.ts
|  `- vite-env.d.ts
|- lib/
|  |- components/
|  |- styles/
|  |- extension-api/
|  |- runtime/
|  `- storage/
|- manifest.json
|- index.html
`- options.html
```

Catatan:

- `lib/extension-api/*` dipakai untuk HTTP client ke endpoint M11
- `lib/runtime/*` dipakai untuk message contract, runtime types, dan mapper kecil
- `lib/storage/*` dipakai untuk wrapper `chrome.storage.local`
- jika implementasi awal masih kecil, helper boleh dimulai dari file flat sebelum dipecah

## Kontrak Session Yang Direvisi

### Tujuan endpoint session
`GET /api/extension/session` menjadi bootstrap endpoint untuk extension runtime. Endpoint ini harus selalu mengembalikan identitas user dan ringkasan subscription selama `app_session` valid.

### Response sukses minimal
```json
{
  "user": {
    "id": "user-id",
    "username": "seed.active",
    "email": "seed.active.browser@assetnext.dev",
    "publicId": "USR-0001"
  },
  "subscription": {
    "status": "active",
    "packageName": "Starter",
    "endAt": "2026-04-30T00:00:00Z",
    "daysLeft": 9,
    "assets": [
      {
        "id": "asset-id",
        "accessKey": "tradingview:private",
        "assetType": "private",
        "platform": "tradingview",
        "expiresAt": "2026-04-30T00:00:00Z"
      }
    ]
  },
  "requestNonce": {
    "value": "nonce",
    "expiresAt": "2026-04-21T10:00:00Z"
  }
}
```

### Aturan perilaku
- bila session web tidak valid, endpoint gagal seperti biasa
- bila session web valid tetapi tidak ada subscription berjalan, endpoint tetap sukses
- untuk subscription `none`, `expired`, atau `canceled`:
  - `subscription.assets` harus kosong
  - `requestNonce` tidak dikirim
- untuk subscription `active` atau `processed`:
  - `subscription.assets` berisi asset aktif valid
  - `requestNonce` dikirim

Refinement ini sengaja mengubah peran endpoint session dari guard asset menjadi bootstrap identity endpoint.

## Data Flow

### 1. Popup bootstrap
Saat popup dibuka:

1. popup meminta runtime snapshot ke background
2. background memakai cache bila masih segar
3. jika cache kosong atau stale, background memanggil `GET /api/extension/session`
4. hasilnya dipetakan ke state popup

State popup yang didukung:

- `loading`
- `loggedOut`
- `loggedInWithoutAssetAccess`
- `loggedInWithAssetAccess`
- `error`

### 2. Login flow
- state `loggedOut` menampilkan tombol `Login`
- klik `Login` membuka `http://localhost:3000/login`
- popup melakukan revalidate periodik saat tetap terbuka
- setelah web login sukses dan cookie valid, popup berpindah ke state logged-in

### 3. Logged-in without asset access
Untuk user dengan session web valid tetapi subscription `none`, `expired`, atau `canceled`:

- tampilkan `id`, `username`, `email`, `publicId`
- tampilkan ringkasan subscription
- jangan tampilkan asset cards
- jangan buka asset detail flow

### 4. Logged-in with asset access
Untuk user dengan subscription `active` atau `processed`:

- tampilkan identitas user
- tampilkan ringkasan subscription
- tampilkan asset cards ringkas dari endpoint session
- simpan `requestNonce` beserta expiry di background cache

### 5. Asset detail flow
Saat user klik asset card:

1. popup mengirim intent ke background
2. background memastikan nonce masih valid
3. bila nonce expired, background refresh session dulu
4. background memanggil `GET /api/extension/asset?id=...`
5. detail asset lengkap disimpan sebagai selected asset detail
6. options page dibuka
7. options page membaca detail itu dan merender raw JSON lengkap

### 6. Track heartbeat flow
- background mengirim `POST /api/extension/track` secara periodik
- heartbeat tidak bergantung pada popup tetap terbuka
- payload minimal memuat `deviceId`, `extensionVersion`, `browser`, dan `os`
- kegagalan heartbeat tidak memaksa logout, tetapi dicatat sebagai diagnostics

### 7. Logout flow
- popup menampilkan tombol `Logout`
- klik `Logout` memanggil logout web melalui jalur resmi app
- setelah sukses, extension membersihkan cache session, nonce, dan selected asset detail
- popup kembali ke state login
- bila web logout dilakukan dari luar extension, popup akan turun ke state login pada siklus revalidate berikutnya

## Komposisi UI

### Popup
Popup tetap ringkas dan terdiri dari blok utama berikut:

- `PopupHeader`
- `AuthGateCard`
- `UserSummaryCard`
- `SubscriptionSummaryCard`
- `AssetCardList`
- `PopupActions`

Konten popup per state:

- belum login: hanya header + `Login`
- sudah login tanpa asset access: user summary + subscription summary + empty state asset
- sudah login dengan asset access: user summary + subscription summary + asset list + logout

### Options page
Options page menjadi layar detail/debug dengan blok utama:

- `SessionSnapshotPanel`
- `SelectedAssetPanel`
- `RawJsonPanel`
- `RuntimeDiagnosticsPanel`

Options page tidak menjadi duplikasi penuh popup. Fungsinya adalah memberi ruang lega untuk detail yang terlalu panjang bagi popup.

## State Dan Storage

### Background volatile state
Background menyimpan state runtime utama:

- session snapshot terakhir
- nonce aktif dan expiry
- selected asset detail terakhir
- status heartbeat terakhir
- error request terakhir

### `chrome.storage.local`
Storage hanya dipakai sebagai persistence ringan untuk:

- session snapshot singkat
- selected asset detail terakhir
- diagnostics terakhir yang aman disimpan

### UI local state
Popup dan options page hanya menyimpan state render sementara seperti loading, refreshing, dan selected tabs. Logic fetch utama tetap milik background.

## Error Handling

### Mapping error ke state UI
- `SESSION_MISSING`, `SESSION_REVOKED` -> tampilkan `Login`
- `USER_BANNED` -> tampilkan blocked state
- `NONCE_REQUIRED`, `NONCE_INVALID` -> background refresh session dan retry satu kali
- `EXT_ORIGIN_DENIED` -> tampilkan fatal setup error
- network failure -> tampilkan retryable error

### Aturan retry
- retry otomatis hanya untuk nonce invalid sekali
- logout palsu tidak boleh terjadi hanya karena network failure
- diagnostics teknis yang lebih mentah boleh muncul di options page, bukan di popup utama

## Acceptance Criteria
Extension real v1 dianggap lulus bila semua poin ini bisa dibuktikan:

- popup tanpa login hanya menampilkan tombol `Login`
- klik `Login` membuka web login di `http://localhost:3000/login`
- setelah login web berhasil, popup menampilkan identitas user
- user tanpa subscription aktif tetap melihat info user dan langganan tanpa asset
- user dengan subscription `active` atau `processed` melihat asset cards
- klik asset card membuka options page dan raw JSON asset lengkap tampil
- logout dari popup memutus session web dan extension
- logout dari web membuat popup turun kembali ke state login
- background heartbeat benar-benar menulis track di backend

## Verifikasi

### Browser verification
Verifikasi browser untuk extension real v1 minimal mencakup:

- login web lalu buka popup
- logout web lalu lihat popup kembali ke login state
- buka options detail dari asset card
- cek heartbeat muncul di admin logs

### Backend verification
Gunakan jalur read-only seperti milestone lain untuk membuktikan:

- `extension_tracks` menerima heartbeat dari extension real
- user tanpa subscription valid tidak menerima asset detail
- session valid tetapi tanpa subscription tetap mendapat snapshot identity

## Risiko Dan Guardrail
- jangan memindahkan business logic domain ke extension
- jangan menjadikan popup atau options page sebagai tempat keputusan auth/subscription final
- jangan menampilkan raw asset di popup kecil
- jangan membuat endpoint publik baru bila refinement kontrak session cukup

## Open Follow-up Untuk Plan Implementasi
Hal-hal berikut harus dijawab detail pada implementation plan, bukan di desain ini:

- path logout web paling tepat yang akan dipakai extension
- interval heartbeat dan interval revalidate popup yang seimbang
- apakah cache session memakai TTL berbasis waktu atau event-driven refresh tambahan
- bentuk message contract paling kecil antara popup, options page, dan background
