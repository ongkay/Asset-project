# DATABASE PLAN V2 (MVP LEAN)

## Sistem Manajemen Langganan dan Akses Ekstensi Chrome

## 1. Tujuan
Dokumen ini adalah source of truth untuk schema database MVP. Fokus utamanya:
- schema inti tetap kecil
- nama tabel dan kolom mudah dibaca
- invariant inti dijaga oleh database
- flow bisnis yang lebih kompleks tetap bisa dikerjakan cepat di app layer

Dokumen ini sengaja lean. Artinya:
- jumlah tabel dijaga seminimal mungkin
- tabel turunan yang belum wajib tidak dibuat
- snapshot dipakai hanya di area yang memang mengurangi kompleksitas secara nyata

---

## 2. Batas Dokumen
Pembagian tanggung jawab dokumen:
- `PRD.md` adalah source of truth untuk business rules, user flow, admin flow, dan API contract
- `DB.md` adalah source of truth untuk schema database, relasi, constraint, trigger, dan policy data

Konsekuensi:
- dokumen ini tidak mengatur detail UX
- dokumen ini tidak mengganti definisi flow bisnis di PRD
- jika ada konflik, flow bisnis mengacu ke PRD dan struktur data mengacu ke dokumen ini

---

## 3. Naming dan Konvensi

### 3.1. Konvensi Umum
| Item             | Standar                      |
| ---------------- | ---------------------------- |
| Primary key      | `uuid`                       |
| Foreign key user | `user_id`                    |
| Timestamp        | `timestamptz`                |
| Money            | `bigint` dengan suffix `_rp` |
| JSON             | `jsonb`                      |
| Boolean          | prefix `is_`                 |
| Timestamp field  | suffix `_at`                 |
| Display snapshot | tetap `text`                 |

Aturan implementasi SQL:
- semua kolom `created_at` sebaiknya `default now()`
- semua kolom `updated_at` sebaiknya diisi otomatis oleh trigger `set_updated_at()`
- FK penting harus eksplisit
- `access_keys_json` selalu berupa array JSON string

### 3.2. Native Enum yang Dipakai
| Nama Enum                  | Nilai                                        |
| -------------------------- | -------------------------------------------- |
| `role_enum`                | `member`, `admin`                            |
| `platform_enum`            | `tradingview`, `fxreplay`, `fxtester`        |
| `asset_type_enum`          | `private`, `share`                           |
| `subscription_status_enum` | `active`, `processed`, `expired`, `canceled` |
| `transaction_status_enum`  | `pending`, `success`, `failed`, `canceled`   |
| `source_enum`              | `payment_dummy`, `cdkey`, `admin_manual`     |

### 3.3. Yang Tetap `text`
| Kolom / Nilai                                                                                      | Alasan                               |
| -------------------------------------------------------------------------------------------------- | ------------------------------------ |
| `access_key`                                                                                       | nilai komposit `platform:asset_type` |
| `email`, `username`, `public_id`, `code`                                                           | identifier / input app               |
| `package_name`                                                                                     | snapshot display                     |
| `ban_reason`, `failure_reason`, `cancel_reason`, `revoke_reason`                                   | catatan bebas                        |
| `browser`, `os`, `ip_address`, `city`, `country`, `extension_version`, `extension_id`, `device_id` | data log / tracking                  |

### 3.4. Konsep `access_key`
Semua entitlement package dan snapshot entitlement memakai format string tunggal:

```text
platform:asset_type
```

Contoh valid:
- `tradingview:private`
- `tradingview:share`
- `fxreplay:private`
- `fxreplay:share`
- `fxtester:private`
- `fxtester:share`

Aturan:
- `access_key` hanya boleh berasal dari kombinasi enum `platform_enum` dan `asset_type_enum`
- `access_key` adalah dasar otorisasi asset exact
- ringkasan package `private/share/mixed` tidak pernah dipakai untuk otorisasi asset

### 3.5. Validasi JSON Minimum
Untuk semua kolom `access_keys_json`:
- harus berupa array JSON
- tidak boleh kosong
- seluruh item harus string
- seluruh item harus valid sebagai `access_key`

Pada baseline migration project ini, dedup item di dalam JSON juga dijaga di level DB melalui helper `is_valid_access_keys_json(jsonb)` yang dipakai pada `check constraint`. App layer tetap disarankan melakukan precheck yang sama untuk UX yang lebih baik.

---

## 4. Tabel Final MVP
| Tabel               | Fungsi                               |
| ------------------- | ------------------------------------ |
| `profiles`          | profil aplikasi user                 |
| `app_sessions`      | session login aktif dan historis     |
| `login_logs`        | histori login sukses dan gagal       |
| `packages`          | master package + entitlement package |
| `assets`            | inventory asset                      |
| `subscriptions`     | subscription user                    |
| `asset_assignments` | assignment asset aktif dan historis  |
| `transactions`      | histori transaksi                    |
| `cd_keys`           | redeem code                          |
| `extension_tracks`  | heartbeat extension                  |

Total: `10` tabel.

Yang sengaja tidak dipakai di versi ini:
- `package_items`
- `subscription_items`
- `admin_audit_logs`
- tabel reporting terpisah
- view materialized

---

## 5. Schema Detail

### 5.1. `profiles`
Satu row per user aplikasi.

| Kolom        | Tipe          | Wajib | Catatan                  |
| ------------ | ------------- | ----- | ------------------------ |
| `user_id`    | `uuid`        | ya    | PK, FK ke auth user      |
| `email`      | `text`        | ya    | cache email auth         |
| `username`   | `text`        | ya    | username user            |
| `public_id`  | `text`        | ya    | ID publik internal/admin |
| `avatar_url` | `text`        | tidak | avatar user              |
| `role`       | `role_enum`   | ya    | `member/admin`           |
| `is_banned`  | `boolean`     | ya    | default `false`          |
| `ban_reason` | `text`        | tidak | alasan ban               |
| `created_at` | `timestamptz` | ya    | default `now()`          |
| `updated_at` | `timestamptz` | ya    | default `now()`          |

Constraint dan index minimum:
- primary key `user_id`
- foreign key `user_id -> auth.users.id`
- unique `email`
- unique `username`
- unique `public_id`
- index `(role, is_banned)`

Catatan:
- `public_id` dipakai sebagai ID publik internal/admin, bukan primary key auth

### 5.2. `app_sessions`
Tabel session minimum untuk cookie `app_session`.

| Kolom          | Tipe          | Wajib | Catatan             |
| -------------- | ------------- | ----- | ------------------- |
| `id`           | `uuid`        | ya    | PK                  |
| `user_id`      | `uuid`        | ya    | owner session       |
| `token_hash`   | `text`        | ya    | hash cookie session |
| `last_seen_at` | `timestamptz` | ya    | activity terakhir   |
| `revoked_at`   | `timestamptz` | tidak | null = aktif        |
| `created_at`   | `timestamptz` | ya    | default `now()`     |

Constraint dan index minimum:
- primary key `id`
- foreign key `user_id -> profiles.user_id`
- unique `token_hash`
- unique partial `(user_id)` where `revoked_at is null`
- index `(user_id, last_seen_at desc)`

Catatan:
- metadata login seperti `ip_address`, `browser`, dan `os` tidak disimpan di tabel ini
- metadata login disimpan di `login_logs`
- tujuan tabel ini hanya session validity, revoke state, dan activity time

### 5.3. `login_logs`
History login sukses dan gagal.

| Kolom            | Tipe          | Wajib | Catatan                        |
| ---------------- | ------------- | ----- | ------------------------------ |
| `id`             | `uuid`        | ya    | PK                             |
| `user_id`        | `uuid`        | tidak | null jika user belum ditemukan |
| `email`          | `text`        | ya    | email input                    |
| `is_success`     | `boolean`     | ya    | sukses / gagal                 |
| `failure_reason` | `text`        | tidak | alasan gagal                   |
| `ip_address`     | `text`        | ya    | IP login                       |
| `browser`        | `text`        | tidak | browser                        |
| `os`             | `text`        | tidak | OS                             |
| `created_at`     | `timestamptz` | ya    | waktu login                    |

Constraint dan index minimum:
- primary key `id`
- foreign key `user_id -> profiles.user_id` nullable
- index `(email, created_at desc)`
- index `(user_id, created_at desc)`
- index `(is_success, created_at desc)`

### 5.4. `packages`
Master package. Entitlement package langsung disimpan di `access_keys_json`.

| Kolom              | Tipe          | Wajib | Catatan            |
| ------------------ | ------------- | ----- | ------------------ |
| `id`               | `uuid`        | ya    | PK                 |
| `code`             | `text`        | ya    | kode unik package  |
| `name`             | `text`        | ya    | nama package       |
| `amount_rp`        | `bigint`      | ya    | harga Rupiah       |
| `duration_days`    | `int`         | ya    | durasi hari        |
| `is_extended`      | `boolean`     | ya    | rule extend        |
| `access_keys_json` | `jsonb`       | ya    | array `access_key` |
| `checkout_url`     | `text`        | tidak | URL payment dummy  |
| `is_active`        | `boolean`     | ya    | default `true`     |
| `created_at`       | `timestamptz` | ya    | default `now()`    |
| `updated_at`       | `timestamptz` | ya    | default `now()`    |

Constraint dan index minimum:
- primary key `id`
- unique `code`
- `amount_rp >= 0`
- `duration_days > 0`
- `jsonb_typeof(access_keys_json) = 'array'`
- index `is_active`

Catatan:
- ringkasan package `private/share/mixed` dihitung dari isi `access_keys_json`
- duplicate `access_key` dalam `access_keys_json` ditolak oleh baseline DB dan sebaiknya juga diprecheck di app layer
- `is_active` mengontrol ketersediaan package untuk aktivasi baru dan penerbitan CD-Key baru
- subscription aktif yang sudah berjalan tidak dipengaruhi perubahan `is_active`
- CD-Key yang sudah diterbitkan tetap bisa dipakai karena menyimpan snapshot sendiri

### 5.5. `assets`
Inventory asset provider.

| Kolom         | Tipe              | Wajib | Catatan                |
| ------------- | ----------------- | ----- | ---------------------- |
| `id`          | `uuid`            | ya    | PK                     |
| `platform`    | `platform_enum`   | ya    | platform asset         |
| `asset_type`  | `asset_type_enum` | ya    | `private/share`        |
| `account`     | `text`            | ya    | data akun, sensitif    |
| `proxy`       | `text`            | tidak | data proxy             |
| `note`        | `text`            | tidak | catatan admin          |
| `asset_json`  | `jsonb`           | ya    | raw credential/cookies |
| `expires_at`  | `timestamptz`     | ya    | expired asset          |
| `disabled_at` | `timestamptz`     | tidak | null = aktif           |
| `created_at`  | `timestamptz`     | ya    | default `now()`        |
| `updated_at`  | `timestamptz`     | ya    | default `now()`        |

Constraint dan index minimum:
- primary key `id`
- `jsonb_typeof(asset_json) in ('array', 'object')`
- index `(platform, asset_type, expires_at, disabled_at)`
- index `created_at desc`

Catatan:
- tabel `assets` menyimpan inventory saat ini yang belum di-hard delete
- asset yang sudah di-hard delete tidak lagi disimpan di tabel ini
- `disabled_at` dipakai untuk menghentikan pemakaian asset tanpa menghapus row asset
- status asset tidak disimpan permanen di tabel ini
- status asset selalu hasil turunan dari `expires_at`, `disabled_at`, dan assignment aktif

### 5.6. `subscriptions`
Satu row = satu kontrak subscription. Snapshot entitlement disimpan di `access_keys_json`.

| Kolom              | Tipe                       | Wajib | Catatan                             |
| ------------------ | -------------------------- | ----- | ----------------------------------- |
| `id`               | `uuid`                     | ya    | PK                                  |
| `user_id`          | `uuid`                     | ya    | owner subscription                  |
| `package_id`       | `uuid`                     | ya    | package referensi                   |
| `package_name`     | `text`                     | ya    | snapshot nama package               |
| `access_keys_json` | `jsonb`                    | ya    | snapshot array `access_key`         |
| `status`           | `subscription_status_enum` | ya    | `active/processed/expired/canceled` |
| `source`           | `source_enum`              | ya    | source aktivasi                     |
| `start_at`         | `timestamptz`              | ya    | mulai subscription                  |
| `end_at`           | `timestamptz`              | ya    | akhir subscription                  |
| `cancel_reason`    | `text`                     | tidak | alasan cancel                       |
| `created_at`       | `timestamptz`              | ya    | default `now()`                     |
| `updated_at`       | `timestamptz`              | ya    | default `now()`                     |

Constraint dan index minimum:
- primary key `id`
- foreign key `user_id -> profiles.user_id`
- foreign key `package_id -> packages.id`
- `end_at > start_at`
- `jsonb_typeof(access_keys_json) = 'array'`
- unique partial `(user_id)` where `status in ('active','processed')`
- index `(user_id, created_at desc)`
- index `(status, end_at)`
- index `package_id`

Catatan:
- `access_keys_json` di sini adalah snapshot immutable dari package atau CD-Key source yang dipakai saat subscription dibuat
- jumlah access key yang belum terpenuhi tidak disimpan di kolom terpisah
- untuk MVP, `missing` dihitung di app layer dari `access_keys_json` vs `asset_assignments` aktif
- sebelum menulis row subscription berjalan baru, stale row `active/processed` yang `end_at <= now()` harus dinormalisasi dulu menjadi `expired` agar tidak memblokir invariant “satu subscription berjalan per user”

### 5.7. `asset_assignments`
Assignment asset aktif dan historis.

| Kolom               | Tipe              | Wajib | Catatan                                           |
| ------------------- | ----------------- | ----- | ------------------------------------------------- |
| `id`                | `uuid`            | ya    | PK                                                |
| `subscription_id`   | `uuid`            | ya    | FK ke `subscriptions.id`                          |
| `user_id`           | `uuid`            | ya    | copy owner untuk query cepat                      |
| `asset_id`          | `uuid`            | tidak | FK ke `assets.id`, nullable setelah asset dihapus |
| `original_asset_id` | `uuid`            | ya    | ID asset asli yang pernah di-assign               |
| `access_key`        | `text`            | ya    | target tuple assignment                           |
| `asset_platform`    | `platform_enum`   | ya    | snapshot platform asset                           |
| `asset_type`        | `asset_type_enum` | ya    | snapshot jenis asset                              |
| `asset_note`        | `text`            | tidak | snapshot note asset                               |
| `asset_expires_at`  | `timestamptz`     | ya    | snapshot expiry asset                             |
| `asset_deleted_at`  | `timestamptz`     | tidak | waktu asset di-hard delete                        |
| `assigned_at`       | `timestamptz`     | ya    | mulai assignment                                  |
| `revoked_at`        | `timestamptz`     | tidak | null = aktif                                      |
| `revoke_reason`     | `text`            | tidak | alasan revoke                                     |

Constraint dan index minimum:
- primary key `id`
- foreign key `subscription_id -> subscriptions.id`
- foreign key `user_id -> profiles.user_id`
- foreign key `asset_id -> assets.id on delete set null`
- unique partial `(subscription_id, access_key)` where `revoked_at is null`
- unique partial `(asset_id)` where `revoked_at is null and asset_id is not null and access_key like '%:private'`
- index `(user_id, revoked_at)`
- index `(asset_id, assigned_at desc)`
- index `(original_asset_id)`
- index `(subscription_id, revoked_at)`
- index `(access_key, revoked_at)`

Catatan:
- histori assignment tidak boleh bergantung pada keberadaan row di `assets`
- snapshot minimum di tabel ini adalah sumber histori final setelah asset dihapus
- `original_asset_id` harus selalu diisi saat assignment dibuat
- kolom snapshot asset harus diisi saat assignment dibuat, bukan saat membaca histori
- snapshot minimum ini tidak menyimpan `account`, `proxy`, atau `asset_json`
- karena platform user share tidak disimpan sebagai kolom terpisah yang bisa di-unique-kan lintas assignment aktif per user dengan cara sederhana, rule "satu asset share per platform per user" tetap dijaga di trigger validasi dan app layer

### 5.8. `transactions`
History transaksi bisnis.

| Kolom             | Tipe                      | Wajib | Catatan                            |
| ----------------- | ------------------------- | ----- | ---------------------------------- |
| `id`              | `uuid`                    | ya    | PK                                 |
| `code`            | `text`                    | ya    | kode transaksi unik                |
| `user_id`         | `uuid`                    | ya    | owner transaksi                    |
| `subscription_id` | `uuid`                    | tidak | terisi setelah aktivasi sukses     |
| `package_id`      | `uuid`                    | ya    | package referensi                  |
| `package_name`    | `text`                    | ya    | snapshot nama package              |
| `source`          | `source_enum`             | ya    | `payment_dummy/cdkey/admin_manual` |
| `status`          | `transaction_status_enum` | ya    | `pending/success/failed/canceled`  |
| `amount_rp`       | `bigint`                  | ya    | nominal Rupiah                     |
| `cd_key_id`       | `uuid`                    | tidak | jika source `cdkey`                |
| `paid_at`         | `timestamptz`             | tidak | waktu sukses                       |
| `failure_reason`  | `text`                    | tidak | alasan gagal/cancel                |
| `created_at`      | `timestamptz`             | ya    | default `now()`                    |
| `updated_at`      | `timestamptz`             | ya    | default `now()`                    |

Constraint dan index minimum:
- primary key `id`
- foreign key `user_id -> profiles.user_id`
- foreign key `subscription_id -> subscriptions.id` nullable
- foreign key `package_id -> packages.id`
- foreign key `cd_key_id -> cd_keys.id` nullable
- unique `code`
- `amount_rp >= 0`
- index `(user_id, created_at desc)`
- index `(status, source, created_at desc)`
- index `package_id`

Catatan:
- entitlement snapshot tidak disimpan di `transactions` agar tabel lebih ramping
- untuk MVP, histori akses package cukup diwakili `package_name`, `package_id`, `source`, `amount_rp`, dan relasi ke `subscriptions`

### 5.9. `cd_keys`
Redeem code sekali pakai. Tetap menyimpan snapshot penting agar redeem tetap stabil walau package master berubah.

| Kolom              | Tipe          | Wajib | Catatan                      |
| ------------------ | ------------- | ----- | ---------------------------- |
| `id`               | `uuid`        | ya    | PK                           |
| `code`             | `text`        | ya    | unique redeem code           |
| `package_id`       | `uuid`        | ya    | package referensi            |
| `duration_days`    | `int`         | ya    | snapshot durasi              |
| `is_extended`      | `boolean`     | ya    | snapshot rule extend         |
| `access_keys_json` | `jsonb`       | ya    | snapshot array `access_key`  |
| `amount_rp`        | `bigint`      | ya    | nominal final key            |
| `is_active`        | `boolean`     | ya    | bisa disable sebelum dipakai |
| `created_by`       | `uuid`        | ya    | admin creator                |
| `used_by`          | `uuid`        | tidak | user pemakai                 |
| `used_at`          | `timestamptz` | tidak | waktu redeem sukses          |
| `created_at`       | `timestamptz` | ya    | default `now()`              |
| `updated_at`       | `timestamptz` | ya    | default `now()`              |

Constraint dan index minimum:
- primary key `id`
- foreign key `package_id -> packages.id`
- foreign key `created_by -> profiles.user_id`
- foreign key `used_by -> profiles.user_id` nullable
- unique `code`
- `amount_rp >= 0`
- `duration_days > 0`
- `jsonb_typeof(access_keys_json) = 'array'`
- index `(package_id, is_active, used_at)`
- index `(used_by, used_at desc)`

### 5.10. `extension_tracks`
Heartbeat extension. Satu tabel cukup untuk MVP.

| Kolom               | Tipe          | Wajib | Catatan                           |
| ------------------- | ------------- | ----- | --------------------------------- |
| `id`                | `uuid`        | ya    | PK                                |
| `user_id`           | `uuid`        | ya    | owner                             |
| `session_id`        | `uuid`        | tidak | session aktif saat ping           |
| `extension_id`      | `text`        | ya    | extension id                      |
| `device_id`         | `text`        | ya    | device id dari extension          |
| `extension_version` | `text`        | ya    | versi extension                   |
| `ip_address`        | `text`        | ya    | IP hasil ekstraksi server         |
| `city`              | `text`        | tidak | geolocation                       |
| `country`           | `text`        | tidak | geolocation                       |
| `browser`           | `text`        | tidak | browser                           |
| `os`                | `text`        | tidak | OS                                |
| `first_seen_at`     | `timestamptz` | ya    | pertama kali kombinasi ini muncul |
| `last_seen_at`      | `timestamptz` | ya    | heartbeat terakhir                |

Constraint dan index minimum:
- primary key `id`
- foreign key `user_id -> profiles.user_id`
- foreign key `session_id -> app_sessions.id` nullable
- unique `(user_id, device_id, ip_address, extension_id)`
- index `(user_id, last_seen_at desc)`
- index `last_seen_at desc`

---

## 6. Relasi Inti
| Relasi                               | Kardinalitas | Catatan                                                                   |
| ------------------------------------ | ------------ | ------------------------------------------------------------------------- |
| `auth.users -> profiles`             | 1 : 1        | satu auth user punya satu profile app                                     |
| `profiles -> app_sessions`           | 1 : N        | satu user bisa punya banyak histori session, tetapi hanya satu yang aktif |
| `profiles -> login_logs`             | 1 : N        | satu user punya banyak histori login                                      |
| `packages -> subscriptions`          | 1 : N        | satu package bisa dipakai banyak subscription historis                    |
| `packages -> cd_keys`                | 1 : N        | satu package bisa menghasilkan banyak CD-Key                              |
| `profiles -> subscriptions`          | 1 : N        | satu user punya banyak subscription historis                              |
| `subscriptions -> asset_assignments` | 1 : N        | satu subscription punya banyak assignment asset historis                  |
| `assets -> asset_assignments`        | 1 : N        | satu asset bisa dipakai berkali-kali secara historis                      |
| `profiles -> transactions`           | 1 : N        | satu user punya banyak transaksi                                          |
| `subscriptions -> transactions`      | 1 : N        | satu subscription bisa dirujuk oleh transaksi sukses                      |
| `profiles -> extension_tracks`       | 1 : N        | satu user punya banyak fingerprint heartbeat extension                    |

Catatan inti:
- source of truth akses package ada di `packages.access_keys_json`
- source of truth akses kontrak berjalan ada di `subscriptions.access_keys_json`
- source of truth asset yang boleh diakses sekarang ada di `asset_assignments`

---

## 7. View Minimum yang Layak
View di bawah ini tidak mengubah source of truth. Tujuannya hanya untuk menyederhanakan query yang akan sering dipakai UI dan API.

### 7.1. `v_current_subscriptions`
View untuk subscription berjalan user.

Kolom yang disarankan:
- `user_id`
- `subscription_id`
- `package_id`
- `package_name`
- `status`
- `start_at`
- `end_at`

Sumber:
- `subscriptions`

Filter inti:
- hanya row dengan `status in ('active', 'processed')`
- hanya row dengan `end_at > now()`

Dipakai untuk:
- `/console`
- `/admin/users`
- `/admin/subscriber`
- `GET /api/extension/session`

### 7.2. `v_current_asset_access`
View untuk asset aktif yang saat ini benar-benar boleh diakses user.

Kolom yang disarankan:
- `user_id`
- `subscription_id`
- `asset_id`
- `access_key`
- `platform`
- `asset_type`
- `note`
- `proxy`
- `expires_at`
- `subscription_status`
- `subscription_end_at`

Sumber:
- `asset_assignments`
- join `assets`
- join `subscriptions`

Filter inti:
- `asset_assignments.revoked_at is null`
- `subscriptions.status in ('active', 'processed')`
- `subscriptions.end_at > now()`
- `assets.disabled_at is null`
- `assets.expires_at >= now()`

Dipakai untuk:
- asset list di `/console`
- validasi akses `GET /api/extension/asset`
- metadata asset untuk extension

Catatan:
- view ini hanya berlaku untuk asset yang masih ada di inventory aktif
- view ini adalah guard rail read path. Asset invalid harus hilang dari view walaupun assignment row belum sempat direvoke oleh job background.
- histori asset yang sudah dihapus tidak dibaca dari view ini, tetapi dari snapshot di `asset_assignments`

Untuk raw asset detail yang sensitif seperti `account`, `proxy`, dan `asset_json`, jangan expose lewat view ini. Gunakan helper server-side atau RPC aman yang me-recheck assignment aktif, status subscription `active/processed`, dan validitas asset real-time sebelum mengembalikan detail. Nama helper yang disarankan untuk baseline migration adalah `get_user_asset_detail(...)`.

### 7.3. `v_asset_status`
View untuk menghitung status asset saat ini tanpa menyimpan kolom status permanen.

Kolom yang disarankan:
- `asset_id`
- `platform`
- `asset_type`
- `expires_at`
- `disabled_at`
- `active_use`
- `status`

Logic `status`:
- `disabled` jika `disabled_at is not null`
- `expired` jika `expires_at < now()`
- `assigned` jika `asset_type = 'private'` dan ada assignment aktif
- `available` selain itu

Dipakai untuk:
- `/admin/assets`
- fulfillment candidate lookup
- popup detail asset

Catatan:
- view ini hanya menghitung asset yang masih ada di tabel `assets`
- asset yang sudah dihapus tidak termasuk di view ini

### 7.4. `v_live_users`
View untuk menentukan user online atau last active.

Kolom yang disarankan:
- `user_id`
- `username`
- `email`
- `session_last_seen_at`
- `extension_last_seen_at`
- `last_seen_at`

Logic:
- `last_seen_at = greatest(session_last_seen_at, extension_last_seen_at)`

Dipakai untuk:
- widget `Live User` di `/admin`
- monitoring user aktif

Catatan:
- view ini adalah basis mentah untuk online activity
- filter `last_seen_at >= now() - interval '10 minutes'`, urutkan `last_seen_at desc`, dan batasi `50` user terbaru di query layer admin atau RPC khusus dashboard

### 7.5. `v_transaction_list`
View untuk list transaksi user dan admin tanpa join berulang.

Kolom yang disarankan:
- `transaction_id`
- `user_id`
- `username`
- `email`
- `package_id`
- `package_name`
- `source`
- `status`
- `amount_rp`
- `created_at`
- `updated_at`
- `paid_at`

Dipakai untuk:
- history transaksi user di `/console`
- tab transactions di admin

Rekomendasi prioritas implementasi:
1. `v_current_subscriptions`
2. `v_current_asset_access`
3. `v_asset_status`
4. `v_live_users`
5. `v_transaction_list`

---

## 8. Trigger, Function, dan Job yang Wajib Ada
Daftar ini sengaja pendek. Hanya yang benar-benar menjaga invariant inti yang masuk ke level DB/job.

| Nama                                                | Jenis               | Menyentuh                                      | Tujuan                                                                                 |
| --------------------------------------------------- | ------------------- | ---------------------------------------------- | -------------------------------------------------------------------------------------- |
| `set_updated_at()`                                  | trigger function    | tabel yang punya `updated_at`                  | mengisi `updated_at` otomatis                                                          |
| `is_app_admin()`                                    | helper function     | `profiles`                                     | mengecek apakah session auth saat ini milik admin aplikasi                             |
| `validate_asset_assignment()`                       | trigger function    | `asset_assignments`, `subscriptions`, `assets` | memastikan assignment asset valid dan match exact tuple                                |
| `normalize_running_subscriptions_before_write()`    | trigger function    | `subscriptions`                                | menormalkan row berjalan yang sudah lewat waktu sebelum menulis row berjalan baru      |
| `revoke_app_sessions(user_id)`                      | service/db function | `app_sessions`                                 | revoke session lama saat login baru berhasil                                           |
| `apply_subscription_status(subscription_id)`        | service/db function | `subscriptions`, `asset_assignments`           | set `active` atau `processed` berdasarkan assignment aktif vs `access_keys_json`       |
| `expire_subscriptions_job`                          | scheduled job       | `subscriptions`, `asset_assignments`           | tandai subscription expired dan revoke assignment aktif                                |
| `reconcile_invalid_assets_job`                      | scheduled job       | `assets`, `asset_assignments`, `subscriptions` | mencari asset disabled/expired yang masih dipakai lalu menjalankan revoke + re-fulfill |
| `recheck_subscription_after_asset_change(asset_id)` | function/job        | `assets`, `asset_assignments`, `subscriptions` | revoke assignment rusak dan coba re-fulfill saat asset disabled atau expired           |
| `delete_asset_safely(asset_id)`                     | function/job        | `assets`, `asset_assignments`, `subscriptions` | hard delete asset secara aman tanpa merusak history                                    |

Catatan penting untuk `validate_asset_assignment()`:
- `access_key` harus ada di `subscriptions.access_keys_json`
- `assets.platform || ':' || assets.asset_type` harus sama persis dengan `access_key`
- asset `private` tidak boleh punya assignment aktif lebih dari satu
- untuk asset `share`, user tidak boleh punya assignment aktif lain pada platform yang sama
- subscription target tidak boleh berstatus `expired` atau `canceled`
- subscription target tidak boleh sudah melewati `end_at`
- `asset_assignments.user_id` harus sama dengan `subscriptions.user_id`
- kolom snapshot minimum harus langsung diisi saat assignment dibuat:
  - `original_asset_id`
  - `asset_platform`
  - `asset_type`
  - `asset_note`
  - `asset_expires_at`

Catatan penting untuk `expire_subscriptions_job`:
- job sebaiknya jalan tiap 1 menit melalui Next.js cron
- jika `subscriptions.end_at < now()` dan status masih `active` atau `processed`, ubah ke `expired`
- revoke semua `asset_assignments` aktif pada subscription tersebut

Catatan penting untuk `reconcile_invalid_assets_job`:
- job sebaiknya jalan tiap 1 menit melalui Next.js cron
- job mencari asset yang `disabled_at is not null` atau `expires_at < now()` dan masih punya assignment aktif pada subscription yang memang masih berjalan
- job memanggil `recheck_subscription_after_asset_change(asset_id)` untuk setiap asset yang ditemukan
- job ini adalah safety net. Read path tetap wajib menolak asset invalid walaupun job belum berjalan.

Catatan penting untuk `recheck_subscription_after_asset_change(asset_id)`:
- dipanggil langsung dalam action admin saat asset di-disable
- juga boleh dipanggil oleh `reconcile_invalid_assets_job` untuk asset yang natural expired
- revoke assignment aktif pada asset itu
- coba fulfillment ulang untuk `access_key` yang sama
- jika semua access key terpenuhi, subscription kembali `active`
- jika masih ada access key kosong, subscription jadi atau tetap `processed`

Catatan penting untuk `delete_asset_safely(asset_id)`:
- dipakai khusus saat admin melakukan hard delete asset
- jika asset masih punya assignment aktif, sistem wajib:
  - revoke assignment aktif
  - mencoba fulfillment ulang subscription terkait
  - mengubah subscription menjadi `processed` jika tidak ada pengganti

- snapshot histori pada `asset_assignments` harus sudah lengkap sebelum hard delete dijalankan
- setelah itu row di `assets` boleh dihapus fisik

---

## 9. DB vs App Layer Responsibility

### 9.1. Database Wajib Menjaga Invariant Inti
Yang wajib dijaga di level database:
- unique email, username, public_id
- satu session aktif per user
- satu subscription berjalan per user
- asset private tidak boleh dipakai dua user aktif sekaligus
- assignment harus match exact `access_key`
- histori asset tetap bisa dibaca walau row `assets` sudah dihapus

### 9.2. App Layer Wajib Menjaga Flow Bisnis
Yang sengaja tetap di app layer:
- dedup `access_keys_json`
- hitung ringkasan package `private/share/mixed`
- hitung jumlah access key missing
- pilih candidate asset terbaik saat fulfillment
- menjalankan Next.js cron untuk `expire_subscriptions_job` dan `reconcile_invalid_assets_job`
- validasi request extension seperti header, origin, dan nonce
- memanggil helper/RPC aman untuk raw asset detail member atau extension, bukan direct read tabel `assets` oleh member
- counter gagal login 5x dan UX reset password
- logic upgrade/downgrade dan `is_extended`
- memutuskan kapan asset boleh di-hard delete dari dashboard
- menyusun chart series dashboard dan query `Live User` final dari basis data mentah seperti `v_live_users` sesuai kontrak UI

Catatan:
- app layer boleh melakukan precheck untuk UX yang lebih baik
- Next.js cron adalah eksekusi server-side tepercaya yang terpisah dari session browser user
- database tetap menjadi guard rail terakhir untuk invariant utama

---

## 10. RLS dan Akses Data
Jika seluruh akses data dilakukan lewat Server Actions atau server-side SDK, RLS tetap disarankan sebagai guard rail. Prinsip dasarnya: user hanya boleh membaca datanya sendiri, sedangkan data sensitif asset hanya boleh diakses server.

Catatan penting:
- RLS policy tidak cukup tanpa `GRANT` privilege tabel yang sesuai
- baseline migration harus memberi grant tabel minimal ke role `authenticated` agar policy `to authenticated` benar-benar bisa dieksekusi
- jika dashboard backend memakai role seperti `project_admin`, baseline migration juga harus memberi grant tabel yang sesuai untuk role tersebut

Untuk MVP ini, admin dashboard memakai session user admin biasa. Karena itu policy admin tidak boleh bergantung pada role platform seperti `project_admin`. Guard rail minimum yang disarankan:
- sediakan helper `is_app_admin()` yang membaca `profiles.role` untuk `auth.uid()` saat ini
- policy tabel admin memakai pola `auth.uid() = user_id or is_app_admin()` untuk tabel milik user
- untuk tabel global seperti `packages`, `assets`, dan `cd_keys`, admin diberi akses sesuai operasi yang memang didokumentasikan; destructive action harus dibatasi jika flow bisnisnya tidak mengizinkan delete langsung
- query admin tetap dijalankan server-side oleh Next.js, bukan direct client DB access

| Tabel               | Member                                                           | Admin                                                          | Service / Server Only |
| ------------------- | ---------------------------------------------------------------- | -------------------------------------------------------------- | --------------------- |
| `profiles`          | read/update row sendiri terbatas                                 | read/insert/update                                             | full                  |
| `app_sessions`      | tidak direct read                                                | read terbatas                                                  | full                  |
| `login_logs`        | tidak direct read; jika nanti dibuka harus lewat projection aman | full read                                                      | insert/read sistem    |
| `packages`          | read active only                                                 | read/insert/update                                             | full                  |
| `assets`            | tidak direct read                                                | read/insert/update; delete hanya lewat `delete_asset_safely()` | full                  |
| `subscriptions`     | read row sendiri                                                 | read/insert/update                                             | full                  |
| `asset_assignments` | read row sendiri via projection aman                             | read/insert/update                                             | full                  |
| `transactions`      | read row sendiri                                                 | read/insert/update                                             | full                  |
| `cd_keys`           | tidak direct read                                                | read/insert/update                                             | full                  |
| `extension_tracks`  | tidak direct read                                                | full                                                           | full                  |

Catatan keamanan penting:
- `assets.account`, `assets.proxy`, dan `assets.asset_json` tidak boleh pernah dibuka langsung lewat client DB access
- member tidak boleh direct select ke tabel `assets`; akses member ke metadata asset harus lewat view/RPC aman yang sudah memfilter asset invalid
- extension tidak pernah mengakses database langsung; extension hanya mengakses API Next.js
- validasi session untuk extension selalu melalui `app_sessions.token_hash` + cookie `app_session`
- `app_sessions.token_hash` hanya boleh dibaca server

---

## 11. Query Kritis dan Index Pendukung
| Use Case                                     | Query Utama                                                                                                                              | Index Pendukung                                                               |
| -------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| cek email login/register                     | cari user by `profiles.email`                                                                                                            | unique `email`                                                                |
| hitung gagal login                           | `login_logs` by `email` order by `created_at desc`                                                                                       | index `(email, created_at desc)`                                              |
| validasi session cookie                      | cari `app_sessions` by `token_hash` dan `revoked_at is null`                                                                             | unique `token_hash`, unique partial `(user_id) where revoked_at is null`      |
| cari subscription berjalan user              | `subscriptions where user_id = ? and status in ('active','processed') and end_at > now()`                                                | unique partial `(user_id) where status in ('active','processed')`             |
| list package aktif                           | `packages where is_active = true`                                                                                                        | index `is_active`                                                             |
| cari asset candidate untuk fulfillment       | `assets` by `platform`, `asset_type`, expiry, disabled state                                                                             | index `(platform, asset_type, expires_at, disabled_at)`                       |
| validasi asset access extension              | `asset_assignments` aktif by `user_id` + `asset_id` lalu join `assets` dan `subscriptions` dengan filter validitas real-time             | index `(user_id, revoked_at)`, index `(asset_id, assigned_at desc)`           |
| ambil asset aktif user                       | `asset_assignments` aktif join `assets` dan `subscriptions` dengan filter `disabled_at is null`, `expires_at >= now()`, `end_at > now()` | index `(user_id, revoked_at)`, index `(access_key, revoked_at)`               |
| ambil raw asset detail user yang masih valid | RPC aman seperti `get_user_asset_detail(asset_id, user_id)`                                                                              | index `(user_id, revoked_at)`, index `(asset_id, assigned_at desc)`           |
| baca histori asset yang sudah dihapus        | `asset_assignments` by snapshot tanpa join wajib ke `assets`                                                                             | index `(original_asset_id)`, index `(subscription_id, revoked_at)`            |
| redeem CD-Key                                | `cd_keys` by `code` dan `used_at is null`                                                                                                | unique `code`, index `(package_id, is_active, used_at)`                       |
| history transaksi user/admin                 | `transactions` by user atau by status/source/time                                                                                        | index `(user_id, created_at desc)`, index `(status, source, created_at desc)` |
| live user admin                              | aggregate `app_sessions` + `extension_tracks`                                                                                            | index `(user_id, last_seen_at desc)` di `app_sessions` dan `extension_tracks` |

Index tambahan yang layak dipertimbangkan nanti:
- index `(user_id, asset_id, revoked_at)` pada `asset_assignments` jika endpoint extension asset detail sangat sering dipanggil
- GIN index untuk `access_keys_json` hanya jika nanti query by entitlement dari JSON benar-benar sering dipakai

---

## 12. Retensi, Archive, dan Delete Policy
| Data                | Kebijakan                                                                          |
| ------------------- | ---------------------------------------------------------------------------------- |
| `profiles`          | tidak dihapus; jika perlu, user diban atau auth dinonaktifkan                      |
| `app_sessions`      | simpan histori minimal 90 hari; boleh dibersihkan periodik jika sudah revoked lama |
| `login_logs`        | append-only; idealnya simpan 6-12 bulan online                                     |
| `packages`          | tidak hard delete; kelola availability dengan `is_active`                          |
| `assets`            | boleh hard delete; histori tetap dibaca dari snapshot di `asset_assignments`       |
| `subscriptions`     | tidak pernah hard delete                                                           |
| `asset_assignments` | tidak pernah hard delete                                                           |
| `transactions`      | tidak pernah hard delete                                                           |
| `cd_keys`           | tidak hard delete setelah dibuat; key used harus permanen                          |
| `extension_tracks`  | simpan minimal 6-12 bulan online; bisa dipurge periodik jika volume besar          |

Aturan praktis untuk aksi admin di UI:
- `package disable` = set `is_active = false`
- `package enable` = set `is_active = true`
- `asset delete` = hard delete aman lewat `delete_asset_safely(asset_id)`
- `user delete` = tidak dianjurkan, gunakan ban atau disable auth
- `transaction delete` = tidak boleh
- `subscription delete` = tidak boleh

Catatan:
- asset boleh hard delete walau pernah dipakai
- jika asset masih punya assignment aktif, sistem wajib revoke + re-fulfill dulu
- histori asset lama tetap dibaca dari snapshot di `asset_assignments`

---

## 13. Data yang Tidak Perlu Disimpan di App DB
| Item                                               | Lokasi yang Disarankan              | Alasan                                                                     |
| -------------------------------------------------- | ----------------------------------- | -------------------------------------------------------------------------- |
| raw password                                       | tidak disimpan                      | dikelola oleh InsForge Auth                                                |
| password reset token                               | InsForge Auth                       | domain auth provider                                                       |
| raw session token                                  | cookie browser saja                 | DB cukup simpan `token_hash`                                               |
| extension request nonce 60 detik                   | signed stateless token di app layer | tidak perlu write DB                                                       |
| allowlist extension ID                             | env/config server                   | v1 belum butuh CRUD admin untuk allowlist                                  |
| ringkasan package `private/share/mixed`            | app layer                           | turunan dari `access_keys_json`                                            |
| status asset `available/assigned/expired/disabled` | view/app layer                      | turunan dari asset + assignment aktif                                      |
| jumlah access key missing pada subscription        | app layer                           | turunan dari `subscriptions.access_keys_json` vs `asset_assignments` aktif |
| payload asset lama setelah hard delete             | tidak perlu disimpan                | histori cukup dari snapshot minimum non-sensitif                           |

---

## 14. Urutan Implementasi Cepat
1. `profiles`
2. `app_sessions`
3. `login_logs`
4. `packages`
5. `assets`
6. `subscriptions`
7. `asset_assignments`
8. `transactions`
9. `cd_keys`
10. `extension_tracks`
11. trigger, function, job
12. view minimum

Fokus urutan fitur untuk rilis cepat:
1. auth + session
2. package
3. assets
4. transaksi + subscription + assignment
5. CD-Key
6. extension API
7. log activity

---

## 15. Kesimpulan
Versi final `DB.md` ini sengaja dibuat lengkap secara dokumentasi, tetapi tetap lean secara schema:
- hanya `10` tabel utama
- exact rule `platform + asset_type` tetap aman
- single-device login tetap aman
- partial fulfill tetap bisa berjalan
- mendukung soft delete package dan hard delete asset tanpa merusak history
- ada view minimum, trigger minimum, RLS minimum, dan policy data minimum
- masih realistis dibangun oleh solo developer tanpa jatuh ke over-engineering

Upgrade pertama yang masuk akal nanti adalah memecah `packages.access_keys_json` dan `subscriptions.access_keys_json` ke tabel item terpisah jika kebutuhan reporting, analytics, dan query entitlement sudah makin kompleks.
