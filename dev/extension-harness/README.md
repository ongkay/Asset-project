# Extension Harness Dev Variants

## Allowed variant
- Load `dev/extension-harness/allowed/` via `chrome://extensions`
- Salin `chrome.runtime.id` yang muncul di harness browser ke env `EXTENSION_ALLOWED_IDS`
- Pastikan `EXTENSION_ALLOWED_ORIGINS` memuat `chrome-extension://<allowed-id>`

## Denied variant
- Load `dev/extension-harness/denied/`
- Jangan tambahkan ID atau origin variant ini ke allowlist runtime
- Gunakan variant ini untuk membuktikan `EXT_ORIGIN_DENIED` secara nyata, bukan hasil simulasi tab biasa

## Fixed scenario device IDs
- `m11-allowed-primary`
- `m11-allowed-secondary`
- `m11-denied-origin`

## Catatan MV3
- `background.js` berjalan sebagai service worker Manifest V3
- `content-script.js` di-load pada host dev lokal, tetapi bridge hanya aktif saat pathname berada di `/console/extension-harness`
- request dari background memakai `credentials: "include"` supaya browser mengirim `app_session` milik profile yang sama
