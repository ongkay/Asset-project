# Extension V2 API Design

## Summary
Dokumen ini mendesain API baru untuk extension kedua di namespace `api/ext/*`.

Desain ini adalah replacement penuh untuk kontrak extension lama, tetapi tidak memakai `src/modules/extension/*` yang sudah ada. Domain baru harus hidup di `src/modules/ext/*` dan tetap reuse source of truth bisnis yang sudah ada di repo dan database saat ini.

Scope implementasi dokumen ini hanya mencakup endpoint API baru dan logic server-side pendukungnya. Extension client dan seluruh operasi browser-side hanya menjadi referensi consumer flow, bukan bagian implementasi di dokumen ini.

Keputusan utama yang sudah disetujui:
- auth extension tetap memakai cookie web `app_session`
- extension kedua adalah replacement penuh untuk extension lama
- endpoint baru hidup di `src/app/api/ext/*`
- jangan memakai `src/modules/extension/*` lama
- jangan memakai `POST /api/ext/inject`
- jangan memakai `platform_matrix_json`
- `GET /api/ext/asset` menjadi kontrak utama untuk asset access flow

## Goals
- menyediakan kontrak API yang cocok untuk consumer extension sesuai `docs/EXTENSION.md`
- menjaga `app_session` sebagai source of truth auth tanpa token extension terpisah
- menjaga boundary repo: route handler tipis, logic domain di `src/modules/ext/*`
- reuse domain dan tabel yang sudah benar tanpa menduplikasi business logic inti
- meminimalkan exposure secret: bootstrap API tidak boleh membawa cookie asset, proxy, `asset_json`, `account`, atau `assetId` kecuali memang dibutuhkan oleh endpoint asset final

## Non-Goals
- migrasi atau refactor `src/modules/extension/*` lama
- memperkenalkan auth token extension terpisah
- membuat platform policy dinamis di database
- mengekspos `assetId`, raw `asset_json`, atau kredensial asset ke bootstrap API
- membangun extension client, popup UI, background script, atau content script

## Constraints
- semua endpoint wajib memvalidasi request extension sebelum membaca data user
- semua input eksternal wajib divalidasi dengan Zod
- semua mutasi sensitif tetap server-side
- kontrak publik extension harus berbasis use case, bukan bentuk tabel internal
- platform policy teknis harus hidup di code, bukan JSON config database

## Existing Sources Of Truth
- auth session: `app_sessions`
- profil user: `profiles`
- status subscription: `subscriptions`
- entitlement asset aktif: `asset_assignments`
- secret cookie dan proxy asset aktif: `assets`
- daftar package aktif: `packages`
- redeem flow: `cd_keys`
- activity tracking: `extension_tracks`

## Options Considered

### Opsi 1. Domain `ext` baru di atas tabel existing plus config version kecil
Pendekatan ini membuat domain baru `src/modules/ext/*`, route baru `api/ext/*`, reuse domain inti yang sudah ada, dan hanya menambah schema kecil untuk version/update gate.

Kelebihan:
- paling sesuai dengan struktur repo
- tidak tergantung pada module extension lama
- tidak memindahkan source of truth bisnis
- cukup fleksibel untuk bootstrap, asset fetch, heartbeat, dan version gate

Kekurangan:
- tetap butuh read model baru di app layer untuk bootstrap dan asset flow
- butuh adjustment schema kecil untuk config dan fingerprint tracking

### Opsi 2. Tambah RPC atau view agregat khusus extension v2
Pendekatan ini memindahkan lebih banyak shaping data ke layer DB.

Kelebihan:
- query bisa lebih ringkas dari app layer
- berpotensi efisien untuk read path yang sering

Kekurangan:
- terlalu cepat menambah complexity DB untuk kebutuhan saat ini
- membuat iterasi kontrak extension v2 lebih berat

### Opsi 3. Semua policy di app layer tanpa schema baru sama sekali
Pendekatan ini menyimpan version gate dan update link di env atau file config.

Kelebihan:
- perubahan DB minimal

Kekurangan:
- kurang operasional untuk update version gate
- cepat menjadi rigid

## Chosen Design
Pilih Opsi 1.

Extension v2 memakai domain baru `src/modules/ext/*` dan route baru `src/app/api/ext/*`. Domain ini reuse session, profile, package, redeem CD-Key, dan logout resmi dari domain existing, tetapi tidak memakai `src/modules/extension/*` lama. Version gate memakai tabel config kecil baru. Platform policy teknis disimpan di code statis.

## Architecture

### Route Layer
File route baru:
- `src/app/api/ext/bootstrap/route.ts`
- `src/app/api/ext/asset/route.ts`
- `src/app/api/ext/redeem/route.ts`
- `src/app/api/ext/heartbeat/route.ts`
- `src/app/api/ext/logout/route.ts`

Semua route hanya bertugas:
- membaca query atau body request
- memanggil service domain `ext`
- mengembalikan JSON success atau error response

### Domain Layer
File domain baru:
- `src/modules/ext/services.ts`
- `src/modules/ext/repositories.ts`
- `src/modules/ext/schemas.ts`
- `src/modules/ext/types.ts`
- `src/modules/ext/platforms.ts`
- opsional `src/modules/ext/queries.ts` bila read path mulai padat

Tanggung jawab:
- `services.ts`: orchestration request guard, bootstrap, asset, redeem, heartbeat, logout
- `repositories.ts`: baca config, baca entitlement aktif, baca asset secret final, tulis heartbeat
- `schemas.ts`: schema query, body, header, dan parsing request external
- `types.ts`: kontrak response domain
- `platforms.ts`: registry platform statis dan rule host/domain teknis

### Shared Helper
- `src/lib/ext-api/errors.ts`

Helper ini memegang error type, error code, dan mapping status response untuk endpoint v2.

## Request Guard Rules
Semua endpoint `api/ext/*` wajib melewati urutan berikut:
1. validasi `origin` extension
2. validasi `extension_id`
3. validasi request extension
4. validasi `app_session`

Arti aturan:
- validasi `origin`: header `Origin` harus cocok dengan origin extension yang diizinkan, misalnya `chrome-extension://<id>`
- validasi `extension_id`: header seperti `x-extension-id` wajib ada dan cocok dengan allowlist server
- validasi request extension: pasangan `origin + extension_id` harus lolos, method sesuai, query/body lolos schema Zod, dan platform/mode yang diminta valid
- validasi `app_session`: cookie `app_session` harus ada dan row aktif di `app_sessions` harus valid

Semua request ext harus gagal lebih awal bila salah satu guard di atas gagal.

## Dev/Test Header Override Mode
Tujuan mode ini adalah membuat endpoint `api/ext/*` bisa diuji langsung lewat `curl` atau Postman tanpa membuat kontrak dev terpisah yang perilakunya menyimpang dari production.

Mode ini hanya aktif jika:
- `NODE_ENV !== "production"`
- env dev override ext aktif, misalnya `EXT_API_DEV_HEADER_OVERRIDE=true`

Prinsip utama:
- pipeline validasi tetap sama seperti production
- yang berubah hanya source value untuk `origin`, `extension_id`, dan `app_session`
- downstream service, repository, dan response contract harus tetap identik dengan production

Effective request context untuk domain `ext` harus dibangun dengan prioritas berikut saat mode ini aktif:
- `origin`: `x-ext-dev-origin` lalu fallback ke header `Origin`
- `extension_id`: `x-ext-dev-extension-id` lalu fallback ke header `x-extension-id`
- `app_session`: `x-ext-dev-app-session` lalu fallback ke cookie `app_session`

Artinya dev mode tidak boleh bypass validation. Dev mode hanya mengizinkan nilai production-like disuntikkan lewat header agar request manual tetap melewati:
- validasi origin extension
- validasi extension id
- validasi request extension
- validasi `app_session`

Header override yang direkomendasikan:
- `x-ext-dev-origin`
- `x-ext-dev-extension-id`
- `x-ext-dev-app-session`

Behavior yang wajib dijaga:
- bila env override tidak aktif, semua header override diabaikan
- di production, header override selalu diabaikan
- bila env override aktif dan header override dipakai, semua nilai override tetap harus lolos validator yang sama dengan mode production
- jangan membuat endpoint `/api/ext/dev/*` terpisah

Contoh pemakaian untuk testing manual:
```bash
curl "http://localhost:3000/api/ext/bootstrap?version=2.0.0" \
  -H "x-ext-dev-origin: chrome-extension://your-dev-extension-id" \
  -H "x-ext-dev-extension-id: your-dev-extension-id" \
  -H "x-ext-dev-app-session: your-opaque-app-session-token"
```

## Platform Policy
Platform policy teknis tidak disimpan di database. Policy ini harus hidup di `src/modules/ext/platforms.ts`.

Isi minimum per platform:
- `platform`
- `allowedHosts`
- `cookieDomains`

Platform awal:
- `tradingview`
- `fxreplay`
- `fxtester`

Policy ini dipakai untuk:
- validasi query `platform`
- menyimpan allowlist host/domain teknis yang menjadi referensi kontrak platform server-side
- menjaga mapping domain cookie yang akan dikirim oleh endpoint asset

## API Contract

Aturan umum untuk semua endpoint di section ini:
- selalu mulai dari `Request Guard Rules`
- saat `Dev/Test Header Override Mode` aktif, effective `origin`, `extension_id`, dan `app_session` boleh disuplai dari header override sesuai prioritas yang sudah didefinisikan

Common request headers untuk semua endpoint:
- `x-extension-id`
- `Origin`
- cookie browser termasuk `app_session`

### 1. `GET /api/ext/bootstrap`
Tujuan:
- satu endpoint bootstrap untuk consumer extension
- memetakan State 1-4 di `docs/EXTENSION.md`
- tidak mengembalikan secret asset

Query:
- `version=<extension-version>`

#### Response: unauthenticated
```json
{
  "auth": {
    "status": "unauthenticated",
    "loginUrl": "/login"
  },
  "version": {
    "status": "supported"
  }
}
```

#### Response: authenticated with active or processed subscription
```json
{
  "auth": {
    "status": "authenticated"
  },
  "user": {
    "id": "user-id",
    "username": "seed.active",
    "email": "seed.active.browser@assetnext.dev",
    "publicId": "USR-0001",
    "avatarUrl": null
  },
  "subscription": {
    "status": "active",
    "packageName": "Starter",
    "endAt": "2026-05-01T00:00:00.000Z",
    "countdownSeconds": 864000
  },
  "assets": [
    {
      "platform": "tradingview",
      "hasPrivateAccess": true,
      "hasShareAccess": false
    },
    {
      "platform": "fxreplay",
      "hasPrivateAccess": true,
      "hasShareAccess": true
    }
  ],
  "version": {
    "status": "update_available",
    "latestVersion": "2.0.1",
    "minimumVersion": "2.0.0",
    "downloadUrl": "https://github.com/..."
  }
}
```

#### Response: authenticated with expired, canceled, or no subscription
```json
{
  "auth": {
    "status": "authenticated"
  },
  "user": {
    "id": "user-id",
    "username": "seed.expired",
    "email": "seed.expired@assetnext.dev",
    "publicId": "USR-0002",
    "avatarUrl": null
  },
  "subscription": {
    "status": "expired",
    "packageName": "Starter",
    "endAt": "2026-04-01T00:00:00.000Z",
    "countdownSeconds": 0
  },
  "packages": [
    {
      "id": "pkg-1",
      "name": "Starter",
      "amountRp": 150000,
      "checkoutUrl": "/paymentdummy?packageId=pkg-1",
      "summary": "mixed"
    }
  ],
  "redeem": {
    "enabled": true
  },
  "version": {
    "status": "supported"
  }
}
```

#### Response: authenticated but update required
```json
{
  "auth": {
    "status": "authenticated"
  },
  "version": {
    "status": "update_required",
    "latestVersion": "2.1.0",
    "minimumVersion": "2.1.0",
    "downloadUrl": "https://github.com/..."
  }
}
```

#### Bootstrap State Mapping
- State 1 `Unauthenticated`: `auth.status = unauthenticated`
- State 2 `Authenticated & Active`: `subscription.status = active | processed`
- State 3 `Expired / No Subscription`: `subscription.status = expired | canceled | none`
- State 4 `Outdated Version`: `version.status = update_required`

Version gate tetap dievaluasi terpisah dari auth state. Jadi response unauthenticated juga tetap boleh membawa `version.status = update_required` bila versi extension sudah di bawah minimum.

Bootstrap tidak boleh mengembalikan:
- `proxy`
- raw cookie asset
- `asset_json`
- `account`
- `assetId`

### 2. `GET /api/ext/asset`
Tujuan:
- endpoint utama untuk asset access flow
- membaca entitlement user untuk satu platform
- menentukan apakah mode perlu dipilih
- mengembalikan payload final yang dibutuhkan consumer untuk sinkronisasi akses asset

Query:
- `platform=tradingview`
- opsional `mode=private|share`

#### Response: selection required
Dipakai saat user punya entitlement `private` dan `share` untuk platform yang sama dan request belum mengirim `mode`.

```json
{
  "status": "selection_required",
  "platform": "tradingview",
  "availableModes": ["private", "share"],
  "defaultMode": "private",
  "selectionTimeoutSeconds": 10
}
```

#### Response: ready
Dipakai saat:
- hanya ada satu mode valid, atau
- mode sudah dipilih user

```json
{
  "status": "ready",
  "platform": "tradingview",
  "mode": "private",
  "proxy": null,
  "cookies": [
    {
      "name": "sessionid",
      "value": "secret",
      "domain": ".tradingview.com",
      "path": "/",
      "secure": true,
      "httpOnly": false,
      "sameSite": "no_restriction",
      "expirationDate": 1777600000
    }
  ]
}
```

#### Response: forbidden
```json
{
  "status": "forbidden",
  "reason": "subscription_required"
}
```

#### Response: blocked
```json
{
  "status": "blocked",
  "reason": "update_required",
  "downloadUrl": "https://github.com/..."
}
```

#### Asset Rules
- selalu mulai dari `Request Guard Rules`
- cek version gate
- cek status subscription aktif atau processed
- resolve entitlement aktif user untuk `platform`
- jika `mode` belum dikirim dan user punya `private + share`, return `selection_required`
- jika `mode` dikirim tetapi tidak termasuk entitlement user, return `forbidden`
- jika mode final valid, baca secret dari row asset aktif yang ter-assign
- map `asset_json` menjadi `cookies`
- sertakan `proxy` dari asset aktif final
- jangan kirim `assetId`, `account`, atau raw `asset_json`

### 3. `POST /api/ext/redeem`
Tujuan:
- redeem CD-Key dari consumer extension untuk state `expired | canceled | none`
- setelah sukses, endpoint mengembalikan snapshot bootstrap baru agar consumer tidak perlu refetch berantai

Body:
```json
{
  "code": "ABCD123456"
}
```

Rules:
- mulai dari `Request Guard Rules`
- cek version gate
- panggil domain `cdkeys`
- bila sukses, kembalikan hasil redeem dan snapshot bootstrap baru

#### Response: success
```json
{
  "ok": true,
  "message": "CD-Key berhasil diredeem.",
  "bootstrap": {
    "auth": {
      "status": "authenticated"
    },
    "user": {
      "id": "user-id",
      "username": "seed.active",
      "email": "seed.active@example.com",
      "publicId": "USR-0001",
      "avatarUrl": null
    },
    "subscription": {
      "status": "active",
      "packageName": "Starter",
      "endAt": "2026-05-01T00:00:00.000Z",
      "countdownSeconds": 864000
    },
    "assets": [
      {
        "platform": "tradingview",
        "hasPrivateAccess": true,
        "hasShareAccess": false
      }
    ],
    "version": {
      "status": "supported"
    }
  }
}
```

#### Response: failure
```json
{
  "ok": false,
  "error": {
    "code": "EXT_REDEEM_INVALID",
    "message": "CD-Key tidak valid atau sudah terpakai."
  }
}
```

### 4. `POST /api/ext/heartbeat`
Tujuan:
- mencatat aktivitas extension
- memvalidasi bahwa session masih hidup
- menulis histori ke `extension_tracks`

Body:
```json
{
  "deviceId": "device-stable-id",
  "extensionVersion": "2.0.0"
}
```

Field `browser` dan `os` tidak dikirim dari body. Server membacanya dari header request lalu menormalisasi hasil parse.

Rules:
- mulai dari `Request Guard Rules`
- cek version gate
- baca `browser` dan `os` dari header request
- touch `app_sessions.last_seen_at`
- tulis atau update `extension_tracks`

#### Response: success
```json
{
  "ok": true,
  "timestamp": "2026-04-24T10:00:00.000Z"
}
```

#### Fingerprint Rules For `extension_tracks`
Jika `extension_id`, `origin`, `ip_address`, `browser`, dan `os` masih sama untuk fingerprint user/device yang sama, cukup update `last_seen_at` pada row lama.

Jika salah satu nilai di atas berubah, buat row baru dan simpan histori row lama.

Fingerprint final yang direkomendasikan:
- `user_id`
- `device_id`
- `extension_id`
- `origin`
- `ip_address`
- `browser`
- `os`

Perilaku write:
- fingerprint sama -> update `last_seen_at`, `session_id`, `extension_version`
- fingerprint beda -> insert row baru

Normalisasi `browser` dan `os` harus memakai string eksplisit, misalnya `Chrome`, `Edge`, `Firefox`, `Safari`, `Unknown` dan `Windows`, `macOS`, `Linux`, `Android`, `iOS`, `Unknown`, agar fingerprint tidak longgar karena `NULL`.

### 5. `POST /api/ext/logout`
Tujuan:
- logout resmi web app
- consumer extension tetap dapat memakai response logout ini untuk merapikan state client di luar scope API

Body:
- tidak perlu body

Rules:
1. validasi `origin`, `extension_id`, dan request extension tetap berjalan seperti biasa
2. jalur logout tetap aman dipanggil walau session sudah stale, selama service logout resmi masih bisa membersihkan state app

#### Response
```json
{
  "ok": true,
  "redirectTo": "/login"
}
```

## Error Contract V2
Error code minimum:
- `EXT_HEADER_REQUIRED`
- `EXT_ORIGIN_DENIED`
- `EXT_REQUEST_INVALID`
- `EXT_UNAUTHENTICATED`
- `EXT_SESSION_REVOKED`
- `EXT_USER_BANNED`
- `EXT_UPDATE_REQUIRED`
- `EXT_SUBSCRIPTION_REQUIRED`
- `EXT_PLATFORM_UNSUPPORTED`
- `EXT_MODE_REQUIRED`
- `EXT_MODE_NOT_ALLOWED`
- `EXT_ASSET_UNAVAILABLE`
- `EXT_REDEEM_INVALID`
- `EXT_REDEEM_USED`

Error v2 harus terpisah dari extension lama agar kontrak baru tidak terikat naming atau asumsi API lama.

## Database Changes

### 1. New table: `extension_app_configs`
Tabel ini hanya untuk version gate dan update link.

Kolom minimum:
- `id`
- `extension_key`
- `latest_version`
- `minimum_version`
- `download_url`
- `is_active`
- `updated_at`

Tabel ini tidak menyimpan platform policy.

### 2. Change existing table: `extension_tracks`
Perubahan minimum:
- tambah kolom `origin`
- ubah identity write agar mengikuti fingerprint baru

Constraint yang direkomendasikan untuk write-path v2 harus mendukung satu row unik per fingerprint final:
- `user_id`
- `device_id`
- `extension_id`
- `origin`
- `ip_address`
- `browser`
- `os`

## Repository Mapping

### New repository helpers in `src/modules/ext/repositories.ts`
- `readExtAppConfig(extensionKey)`
- `readExtBootstrapSnapshotByUserId(userId)`
- `readExtPlatformAccessByUserId({ userId, platform })`
- `readExtAssetSecretByUserId({ userId, platform, mode })`
- `insertOrTouchExtHeartbeat(...)`

### Existing domains to reuse
- `src/modules/sessions/services.ts`
  - validasi `app_session`
  - touch `app_sessions.last_seen_at`
- `src/modules/auth/repositories.ts`
  - baca `profiles`
- `src/modules/auth/services.ts`
  - logout resmi app
- `src/modules/packages/services.ts`
  - daftar package aktif untuk state tanpa subscription valid
- `src/modules/cdkeys/services.ts`
  - logic redeem CD-Key

Domain `ext` tidak boleh mengimpor atau membungkus `src/modules/extension/*` lama.

## Consumer Flow Reference
Section ini hanya menjelaskan cara endpoint dikonsumsi oleh extension. Ini bukan scope implementasi client.

Section ini sengaja singkat dan hanya dipertahankan untuk membantu implementer memahami alasan bentuk response. Jika detail client berubah nanti, kontrak API di atas tetap menjadi source of truth untuk scope pekerjaan ini.

### Popup flow
1. consumer memanggil `GET /api/ext/bootstrap`
2. consumer memetakan hasil ke State 1-4

### Injected asset flow
1. consumer memanggil `GET /api/ext/asset?platform=xxx`
2. jika response `selection_required`, consumer meminta user memilih `share` atau `private`
3. jika user tidak memilih dalam 10 detik, consumer default ke `private`
4. consumer memanggil `GET /api/ext/asset?platform=xxx&mode=private|share`
5. consumer memakai payload response untuk operasi browser-side di luar scope API

### Heartbeat flow
1. consumer mengirim `POST /api/ext/heartbeat` periodik
2. server validasi request dan session
3. server touch `app_sessions.last_seen_at`
4. server update atau insert row `extension_tracks` sesuai fingerprint

### Redeem flow
1. consumer memanggil `POST /api/ext/redeem`
2. server redeem CD-Key lewat domain existing
3. response sukses mengembalikan snapshot bootstrap baru
4. consumer memperbarui state dari snapshot baru itu

### Logout flow
1. consumer memanggil `POST /api/ext/logout`
2. server logout app resmi
3. consumer merapikan state client di luar scope API

## Security Notes
- `bootstrap` tidak boleh memuat `proxy`, `account`, `asset_json`, cookie asset, atau `assetId`
- `asset` hanya boleh mengembalikan `proxy` dan `cookies` pada response `ready`
- payload `share` dan `private` tidak boleh dikirim sekaligus
- semua endpoint harus selalu memvalidasi `origin`, `extension_id`, request schema, dan `app_session`
- `Cache-Control: no-store` direkomendasikan untuk response yang membawa secret asset
- mode dev/testing tidak boleh membuat jalur bypass auth atau bypass validator; hanya boleh mengganti source nilai request context saat env override aktif

## Testing And Verification
Minimum verification yang dibutuhkan nanti saat implementasi:
- unit test service dan repository untuk semua branch endpoint `bootstrap`, `asset`, `redeem`, `heartbeat`, `logout`
- unit test untuk selection flow `private + share`
- unit test untuk heartbeat fingerprint: same fingerprint update row lama, changed fingerprint insert row baru
- route-level verification untuk request header override mode dan response contract tiap endpoint
- manual verification via `curl` atau Postman untuk `bootstrap`, `asset`, `redeem`, `heartbeat`, dan `logout`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm check:fix` sebelum commit

## Final Decision Summary
- pakai domain baru `src/modules/ext/*`
- pakai route baru `src/app/api/ext/*`
- auth tetap memakai `app_session`
- replacement penuh untuk extension lama, tetapi tidak memakai module extension lama
- scope implementasi hanya endpoint API dan logic server-side
- `GET /api/ext/bootstrap` untuk bootstrap endpoint
- `GET /api/ext/asset` untuk asset access endpoint
- `POST /api/ext/redeem`, `POST /api/ext/heartbeat`, `POST /api/ext/logout`
- platform policy hidup di `src/modules/ext/platforms.ts`
- version gate hidup di tabel `extension_app_configs`
- `extension_tracks` harus mencatat row baru bila fingerprint environment berubah
