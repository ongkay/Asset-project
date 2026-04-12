# Seed & Migration Guide
Dokumen ini merangkum baseline migration yang sudah dipecah per domain agar lebih rapi, mudah dibaca, dan mudah dipahami.

## Source of Truth
| File               | Fungsi                                                              |
| ------------------ | ------------------------------------------------------------------- |
| `.docsplan/PRD.md` | source of truth business rules, user flow, admin flow, API contract |
| `.docsplan/DB.md`  | source of truth schema database MVP                                 |
| `migrations/*.sql` | implementasi baseline schema, RPC, dan seed development             |

## Struktur Migration

### Fondasi
| File                   | Fungsi Singkat                                    |
| ---------------------- | ------------------------------------------------- |
| `001_extensions.sql`   | mengaktifkan extension PostgreSQL yang dibutuhkan |
| `002_enums.sql`        | membuat enum utama yang dipakai tabel             |
| `003_core_helpers.sql` | helper validasi umum dan trigger helper           |

### Tabel Inti
| File                               | Fungsi Singkat                                                 |
| ---------------------------------- | -------------------------------------------------------------- |
| `010_profiles_and_auth_tables.sql` | profile, session, dan login log                                |
| `011_catalog_tables.sql`           | package dan inventory asset                                    |
| `012_subscription_tables.sql`      | subscription, cd_key, transaction, assignment, extension track |

### Access dan Engine
| File                           | Fungsi Singkat                                                     |
| ------------------------------ | ------------------------------------------------------------------ |
| `020_admin_access_helpers.sql` | helper admin aplikasi `is_app_admin()`                             |
| `021_rls_policies.sql`         | semua policy RLS                                                   |
| `022_subscription_engine.sql`  | function inti untuk assignment, status subscription, dan reconcile |
| `023_triggers.sql`             | trigger wiring ke tabel                                            |
| `024_views.sql`                | view read model untuk app dan admin                                |
| `025_table_grants.sql`         | grant privilege tabel agar policy RLS bisa bekerja                 |

### RPC dan Seed
| File                               | Fungsi Singkat                                                                                       |
| ---------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `030_rpc.sql`                      | helper RPC app + seed helper package dan CD-Key                                                      |
| `040_dev_seed_full.sql`            | seed development lengkap untuk environment lokal/staging                                             |
| `041_dev_seed_loginable_users.sql` | seed user browser-loginable lengkap untuk skenario manual login dan verifikasi `/console` / `/admin` |

## Urutan Eksekusi
Jalankan file SQL dengan urutan berikut:
1. `001_extensions.sql`
2. `002_enums.sql`
3. `003_core_helpers.sql`
4. `010_profiles_and_auth_tables.sql`
5. `011_catalog_tables.sql`
6. `012_subscription_tables.sql`
7. `020_admin_access_helpers.sql`
8. `021_rls_policies.sql`
9. `022_subscription_engine.sql`
10. `023_triggers.sql`
11. `024_views.sql`
12. `025_table_grants.sql`
13. `030_rpc.sql`
14. `040_dev_seed_full.sql` jika butuh data development lengkap
15. `041_dev_seed_loginable_users.sql` jika butuh akun seed baru yang bisa login manual di browser

## Kenapa Dipecah
Tujuan split ini:
- junior developer bisa cepat tahu file mana yang perlu dibaca
- error lebih mudah diisolasi saat apply migration
- schema, policy, engine, dan RPC tidak tercampur dalam satu file besar
- reset database dari nol jadi lebih jelas langkahnya

## Catatan Penting

### Auth User Development
`040_dev_seed_full.sql` mengasumsikan user auth development sudah ada di `auth.users`.

User development yang dipakai:
- `admin@assetnext.dev`
- `user.a@assetnext.dev`
- `user.b@assetnext.dev`
- `user.c@assetnext.dev`
- `user.d@assetnext.dev`

Artinya, sebelum menjalankan seed development penuh di environment baru, auth user perlu dibuat lebih dulu lewat Auth API atau SDK.

### Browser-Loginable Seed
`041_dev_seed_loginable_users.sql` dibuat untuk kasus ketika dibutuhkan akun seed yang benar-benar bisa dipakai login manual di browser.

Seed ini:
- bergantung pada `040_dev_seed_full.sql` karena reuse package fixture
- membuat auth user sendiri di `auth.users`
- mengisi `profiles`, `subscriptions`, `transactions`, `asset_assignments`, `app_sessions`, `login_logs`, dan `extension_tracks`
- menambah asset seed baru dengan UUID valid agar read path `/console` tidak gagal pada parser schema app
- bersifat idempotent untuk email `seed.*.browser@assetnext.dev`

Akun yang dibuat:
- `seed.admin.browser@assetnext.dev`
- `seed.active.browser@assetnext.dev`
- `seed.processed.browser@assetnext.dev`
- `seed.expired.browser@assetnext.dev`
- `seed.canceled.browser@assetnext.dev`
- `seed.none.browser@assetnext.dev`

Password shared untuk semua akun tersebut:
- `Devpass123`

Catatan penting:
- untuk verifikasi login browser, apply `041_dev_seed_loginable_users.sql` ke database yang benar-benar dipakai app lewat `DATABASE_URL`
- jangan mengasumsikan database yang diakses tooling admin/MCP selalu identik dengan database runtime app

Catatan penting untuk workflow DB lokal:
- baseline migration project ini mengasumsikan schema auth sudah ada
- target `DATABASE_URL` untuk `db:apply`, `db:reset`, dan `db:verify` harus menunjuk ke database yang sudah memiliki `auth.users`
- plain local Postgres tanpa schema auth tidak cukup untuk baseline ini

### Asset Delete
Project ini memakai aturan berikut:
- package: `Disable/Enable`, bukan hard delete
- asset: bisa `Disable/Enable` atau hard delete aman
- hard delete asset tetap menjaga history lewat snapshot minimum di `asset_assignments`
- transaksi, subscription, assignment historis, dan CD-Key tidak boleh di-hard delete lewat flow admin biasa

### Safe RPC
Baseline migration juga menyediakan helper RPC aman untuk read path sensitif.

Contoh penting:
- `get_user_console_snapshot(uuid)` untuk snapshot `/console`
- `get_user_asset_detail(asset_id, user_id)` untuk raw asset detail yang masih valid
- `get_admin_dashboard_stats(from, to)` untuk aggregate dashboard awal

### Scheduled Job
SQL migration belum otomatis menjadwalkan job runtime. Job berikut tetap perlu dihubungkan dari app/backend:
- `expire_subscriptions_job()`
- `reconcile_invalid_assets_job()`
- action admin yang memanggil `recheck_subscription_after_asset_change(asset_id)` saat disable asset

## Cara Apply ke InsForge
Pilihan yang tersedia:
1. import file SQL satu per satu lewat admin database import endpoint
2. execute per file lewat raw SQL admin endpoint / MCP

Untuk baseline yang sudah dipecah seperti ini, execute per file lebih mudah di-debug jika ada error.

## Checklist Setelah Baseline Migration
Verifikasi minimum:
- semua tabel terbentuk
- enum terbentuk
- helper function terbentuk
- trigger terbentuk
- policy RLS aktif
- table grants untuk `authenticated` dan `project_admin` tersedia
- view terbentuk
- RPC helper bisa dipanggil

## Checklist Setelah Dev Seed
Verifikasi minimum:
- admin dev punya `profiles.role = admin`
- semua user dev `email_verified = true`
- terdapat subscription `active`, `processed`, `expired`, dan `canceled`
- terdapat transaction `success`, `pending`, `failed`, dan `canceled`
- terdapat asset `disabled`, `expired`, dan asset history hasil hard delete

## Checklist Setelah Browser-Loginable Seed
Verifikasi minimum:
- semua akun `seed.*.browser@assetnext.dev` ada di `auth.users` dan punya password
- login `/login` berhasil untuk akun `seed.active...`, `seed.processed...`, `seed.expired...`, `seed.canceled...`, `seed.none...`, dan `seed.admin...`
- `/console` menampilkan state `active`, `processed`, `expired`, `canceled`, dan `none` secara eksplisit sesuai akun seed
- `/admin` bisa dibuka oleh `seed.admin.browser@assetnext.dev`

## Catatan Keamanan
- jangan commit API key ke repo
- jika API key pernah dipakai di chat atau tooling, rotate key setelah sesi selesai
- data dalam `040_dev_seed_full.sql` hanya untuk development/staging, bukan production
