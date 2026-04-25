# Extension V2 API

Dokumen ini adalah kontrak client untuk endpoint `api/ext/*` yang sudah diverifikasi terhadap implementasi runtime saat ini.

## Base URL

- Local dev: `http://localhost:3000`

## Request Model

Semua endpoint memakai route handler Node.js di `src/app/api/ext/*`.

## Headers

Header umum:

| Header | Wajib | Keterangan |
| --- | --- | --- |
| `x-extension-version` | Direkomendasikan | Versi extension, format numeric-dot seperti `2.0.0`. |
| `x-extension-id` | Ya di production | Raw extension id. |
| `origin` | Ya di production | Origin extension yang diizinkan. |

Header dev override untuk local/manual verification saat `EXT_API_DEV_HEADER_OVERRIDE=true` dan non-production:

| Header | Wajib | Keterangan |
| --- | --- | --- |
| `x-ext-dev-extension-id` | Ya | Menggantikan `x-extension-id` untuk request manual. |
| `x-ext-dev-origin` | Ya | Menggantikan `origin` untuk request manual. |
| `x-ext-dev-app-session` | Opsional untuk bootstrap, efektif wajib untuk asset/redeem/heartbeat | Raw token `app_session` untuk verifikasi manual berbasis dev override. |

Catatan penting:

- `POST /api/ext/logout` tidak memakai `x-ext-dev-app-session` untuk revoke session. Endpoint ini mengikuti cookie session web yang aktif, jadi untuk logout manual pakai header `Cookie: app_session=<token>`.
- Semua request akan ditolak jika `x-extension-id` atau `origin` tidak masuk allowlist server.

## Error Contract

Semua error domain yang dikenal dikembalikan sebagai:

```json
{
  "error": {
    "code": "EXT_REQUEST_INVALID",
    "message": "Extension request headers are invalid."
  }
}
```

Status mapping:

| Code | HTTP |
| --- | --- |
| `EXT_HEADER_REQUIRED` | 400 |
| `EXT_REQUEST_INVALID` | 400 |
| `EXT_REDEEM_INVALID` | 400 |
| `EXT_UNAUTHENTICATED` | 401 |
| `EXT_ORIGIN_DENIED` | 403 |
| `EXT_USER_BANNED` | 403 |
| `EXT_UPDATE_REQUIRED` | 403 |
| `EXT_MODE_NOT_ALLOWED` | 403 |
| `EXT_REDEEM_USED` | 409 |
| `EXT_ASSET_UNAVAILABLE` | 503 |

Catatan implementasi saat ini:

- `EXT_SESSION_REVOKED`, `EXT_SUBSCRIPTION_REQUIRED`, `EXT_PLATFORM_UNSUPPORTED`, dan `EXT_MODE_REQUIRED` terdefinisi di helper error, tetapi belum dipakai oleh route `api/ext/*` saat ini.
- Invalid JSON body pada `redeem` dan `heartbeat` dipetakan ke `EXT_REQUEST_INVALID`.
- Invalid payload/query yang dilempar langsung oleh Zod di service bukan bagian dari error contract publik dan tidak diproduksi oleh flow manual yang sudah diverifikasi di `.docs/postman/*`.

## Endpoint Summary

| Method | Path | Tujuan |
| --- | --- | --- |
| `GET` | `/api/ext/bootstrap` | Handshake awal, auth state, version gate, subscription snapshot. |
| `GET` | `/api/ext/asset` | Ambil payload asset aktif untuk platform tertentu. |
| `POST` | `/api/ext/heartbeat` | Update session activity dan fingerprint extension. |
| `POST` | `/api/ext/redeem` | Redeem CD-Key dan refresh bootstrap snapshot. |
| `POST` | `/api/ext/logout` | Logout web session aktif dan revoke `app_session`. |

## `GET /api/ext/bootstrap`

Query:

| Param | Wajib | Keterangan |
| --- | --- | --- |
| `version` | Opsional | Versi extension. Jika tidak diisi, server tetap bisa membaca dari `x-extension-version`. |

Unauthenticated response:

```json
{
  "auth": {
    "loginUrl": "/login",
    "status": "unauthenticated"
  },
  "version": {
    "status": "supported"
  }
}
```

Authenticated active/processed response:

```json
{
  "assets": [
    {
      "hasPrivateAccess": false,
      "hasShareAccess": true,
      "platform": "tradingview"
    }
  ],
  "auth": {
    "status": "authenticated"
  },
  "subscription": {
    "countdownSeconds": 534680,
    "endAt": "2026-05-01T09:45:22.805+00:00",
    "packageName": "Paket 3",
    "status": "active"
  },
  "user": {
    "avatarUrl": null,
    "email": "seed.active.browser@assetnext.dev",
    "id": "91000000-0000-4000-8000-000000000002",
    "publicId": "MEM-BRW-01",
    "username": "seed-active-browser"
  },
  "version": {
    "status": "supported"
  }
}
```

Authenticated non-active response:

```json
{
  "auth": {
    "status": "authenticated"
  },
  "packages": [
    {
      "amountRp": 150000,
      "checkoutUrl": "/paymentdummy?packageId=<id>",
      "id": "<id>",
      "name": "Paket 2",
      "summary": "mixed"
    }
  ],
  "redeem": {
    "enabled": true
  },
  "subscription": {
    "countdownSeconds": 0,
    "endAt": null,
    "packageName": null,
    "status": "none"
  },
  "user": {
    "avatarUrl": null,
    "email": "seed.active.browser@assetnext.dev",
    "id": "91000000-0000-4000-8000-000000000002",
    "publicId": "MEM-BRW-01",
    "username": "seed-active-browser"
  },
  "version": {
    "status": "supported"
  }
}
```

Version status union:

- `{"status":"supported"}`
- `{"status":"update_available","downloadUrl":"...","latestVersion":"...","minimumVersion":"..."}`
- `{"status":"update_required","downloadUrl":"...","latestVersion":"...","minimumVersion":"..."}`

`asset`, `redeem`, dan `heartbeat` membutuhkan sesi aktif. Pada verifikasi manual/Postman, sertakan `x-ext-dev-app-session` atau gunakan cookie web aktif yang setara.

## `GET /api/ext/asset`

Query:

| Param | Wajib | Keterangan |
| --- | --- | --- |
| `platform` | Ya | `tradingview`, `fxreplay`, `fxtester` |
| `mode` | Opsional | `private` atau `share` |

Selection response saat user punya `private` dan `share` sekaligus:

```json
{
  "availableModes": ["private", "share"],
  "defaultMode": "private",
  "platform": "tradingview",
  "selectionTimeoutSeconds": 10,
  "status": "selection_required"
}
```

Ready response:

```json
{
  "cookies": [
    {
      "domain": ".tradingview.com",
      "expirationDate": 1760964249.274157,
      "hostOnly": false,
      "httpOnly": false,
      "name": "session",
      "path": "/",
      "sameSite": "no_restriction",
      "secure": true,
      "session": false,
      "storeId": "0",
      "value": "seed-browser-tv-processed"
    }
  ],
  "mode": "share",
  "platform": "tradingview",
  "proxy": "http://proxy.seed.browser.tv.processedss",
  "status": "ready"
}
```

Notes:

- `cookies` dikirim pass-through dari setiap object cookie di `asset_json`.
- Server hanya membuang field `id` jika field itu ada pada cookie source.
- Selain `id`, field lain tidak dipangkas dan tidak ditambahi fallback/default baru oleh server.
- Jika `asset_json` berisi `[]`, response `cookies` juga akan tetap `[]`.

Forbidden/no subscription response:

```json
{
  "reason": "subscription_required",
  "status": "forbidden"
}
```

## `POST /api/ext/heartbeat`

Body:

```json
{
  "deviceId": "manual-ext-device-2",
  "extensionVersion": "2.0.0"
}
```

Response:

```json
{
  "ok": true,
  "timestamp": "2026-04-25T05:14:03.191Z"
}
```

Notes:

- `browser` dan `os` tidak dikirim dari body; server baca dari metadata request.
- Jika metadata tidak ada, server normalisasi menjadi `Unknown`.

## `POST /api/ext/redeem`

Body:

```json
{
  "code": "ABCD123456"
}
```

Success response:

```json
{
  "bootstrap": {
    "auth": {
      "status": "authenticated"
    }
  },
  "message": "CD-Key berhasil diredeem.",
  "ok": true
}
```

Invalid code response:

```json
{
  "error": {
    "code": "EXT_REDEEM_INVALID",
    "message": "CD-Key tidak valid atau sudah terpakai."
  }
}
```

Used code response:

```json
{
  "error": {
    "code": "EXT_REDEEM_USED",
    "message": "CD-Key tidak valid atau sudah terpakai."
  }
}
```

## `POST /api/ext/logout`

Response:

```json
{
  "ok": true,
  "redirectTo": "/login"
}
```

Notes:

- Endpoint ini memvalidasi extension request header.
- Untuk revoke session aktif, request harus membawa cookie web `app_session` yang valid.

## Recommended Client Flow

1. Call `GET /api/ext/bootstrap` on startup.
2. If `auth.status = "unauthenticated"`, redirect/open `loginUrl`.
3. If `version.status = "update_required"`, block all feature flow and show update CTA.
4. If authenticated and access exists, call `GET /api/ext/asset?platform=...`.
5. If `selection_required`, show chooser and default to `private` after 10 seconds.
6. Start heartbeat loop with `POST /api/ext/heartbeat`.
7. On user logout, call `POST /api/ext/logout`.

## Manual Verification Headers

Untuk local/Postman verification yang sama dengan hasil runtime final:

```text
x-extension-version: 2.0.0
x-ext-dev-origin: chrome-extension://allowed-id
x-ext-dev-extension-id: allowed-id
```

Tambahkan salah satu:

- unauth bootstrap: tanpa `x-ext-dev-app-session`
- authenticated bootstrap/asset/redeem/heartbeat: `x-ext-dev-app-session: <raw-app-session-token>`
- logout: `Cookie: app_session=<raw-app-session-token>`

Untuk Postman, isi `dev_app_session` dan `cookie_app_session` dengan token sesi yang sama jika ingin memverifikasi sequence logout lalu bootstrap ulang dengan token yang sama.
