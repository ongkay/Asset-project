---
goal: Implement member-only checkout page with package pricing, voucher validation, and transaction pricing snapshots end-to-end
version: 1.0
date_created: 2026-05-21
last_updated: 2026-05-21
owner: OpenCode
status: Planned
tags: [feature, checkout, vouchers, member, pricing, migration]
---

# Introduction

![Status: Planned](https://img.shields.io/badge/status-Planned-blue)

Dokumen ini adalah implementation plan end-to-end untuk membangun halaman `checkout` khusus member yang sudah login, menambahkan backend voucher diskon dengan scope global atau per-package, menyimpan snapshot pricing lengkap ke transaksi, dan mengganti flow pembelian member yang saat ini masih bergantung pada `paymentdummy` menjadi flow `console -> checkout -> submit checkout -> activation -> console`.

Plan ini sengaja memisahkan backend voucher dari admin UI. Backend voucher wajib selesai di plan ini, tetapi halaman admin untuk membuat dan mengelola voucher tidak masuk scope implementasi saat ini.

## 1. Requirements & Constraints

- **REQ-001**: Halaman `/checkout` hanya boleh diakses oleh user yang sudah login sebagai `member`.
- **REQ-002**: UI checkout harus mengikuti flow dan struktur visual dari `docs/ui-flow/checkout-ui.html` dan `docs/ui-flow/Screenshot from 2026-05-21 13-47-22.png`.
- **REQ-003**: Pilihan package aktif yang tersedia saat ini adalah tepat enam package final yang sudah ditentukan user.
- **REQ-004**: Harga akhir checkout harus dihitung dengan formula `(harga asli - diskon paket) - diskon voucher`.
- **REQ-005**: Voucher harus mendukung dua scope: `global` dan `package`.
- **REQ-006**: Voucher hanya disimpan sebagai diskon persentase integer `1..100`.
- **REQ-007**: Voucher harus mendukung `max_uses` dengan default unlimited ketika `null`.
- **REQ-008**: Backend harus menyimpan snapshot pricing checkout ke tabel `transactions` agar histori tetap audit-friendly.
- **REQ-009**: Flow submit checkout sementara tetap boleh berujung pada activation source `payment_dummy` karena payment provider riil belum dikerjakan.
- **REQ-010**: Admin UI voucher di-skip, tetapi struktur backend voucher wajib siap dipakai page admin di fase berikutnya.
- **REQ-011**: Member harus bisa datang ke `/checkout` dari `console` dengan `packageId` sebagai initial selection.
- **REQ-012**: Payment method `QRIS`, `Crypto`, dan `Card` hanya menjadi state UI untuk sekarang dan belum memengaruhi backend payment integration.
- **SEC-001**: Semua validasi voucher dan seluruh perhitungan harga final harus menjadi source of truth server-side.
- **SEC-002**: Kuota voucher tidak boleh berkurang saat user hanya meng-apply voucher untuk preview quote.
- **SEC-003**: Kuota voucher hanya boleh bertambah `used_count` saat checkout benar-benar berhasil finalize transaksi dan activation.
- **SEC-004**: Submit checkout harus me-revalidate package aktif, voucher aktif, voucher scope, voucher expiry, dan voucher remaining uses di server.
- **CON-001**: Implementasi harus mengikuti `docs/agent-rules/folder-structure.md`.
- **CON-002**: `src/app/**` harus tetap tipis; business logic utama wajib tinggal di `src/modules/**`.
- **CON-003**: Mutation web app harus memakai `next-safe-action`.
- **CON-004**: Form harus memakai `react-hook-form` + `zod`.
- **CON-005**: Tidak boleh membuat REST endpoint publik baru untuk flow checkout internal.
- **CON-006**: Tidak boleh menjadikan `checkout_url` sebagai source of truth flow checkout baru.
- **CON-007**: Patch implementasi sebaiknya dipecah kecil-kecil karena repo rawan patch besar gagal.
- **GUD-001**: Reuse primitive yang sudah ada di `src/components/ui/**`.
- **GUD-002**: Semua input form di UI checkout harus memiliki icon di sebelah kiri.
- **GUD-003**: Tampilan checkout harus responsive di desktop dan mobile.
- **PAT-001**: Domain baru harus mengikuti konvensi `actions.ts`, `services.ts`, `repositories.ts`, `schemas.ts`, `types.ts`, `queries.ts` sesuai kebutuhan.
- **PAT-002**: History transaksi harus menyimpan snapshot angka nominal, bukan hasil hitung ulang on-the-fly.

## 2. Implementation Steps

### Implementation Phase 0

- **GOAL-000**: Bekukan shape data final, naming, dan scope implementasi agar semua phase berikutnya deterministic dan tidak berubah di tengah implementasi.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-000 | Tetapkan nama route final sebagai `src/app/(member)/checkout/page.tsx` dan bukan route group lain karena checkout hanya untuk member login. |  |  |
| TASK-001 | Tetapkan bahwa `packages.amount_rp` tetap berarti harga final setelah diskon paket agar kompatibel dengan code existing. |  |  |
| TASK-002 | Tetapkan bahwa `packages.list_amount_rp` menjadi harga asli sebelum diskon paket. |  |  |
| TASK-003 | Tetapkan bahwa voucher hanya menyimpan `discount_percent integer` dan tidak menyimpan `discount_amount_rp` atau `discount_basis_points`. |  |  |
| TASK-004 | Tetapkan bahwa admin UI voucher tidak masuk scope, tetapi seluruh service, repository, dan schema backend voucher wajib selesai. |  |  |
| TASK-005 | Tetapkan bahwa source activation checkout sementara tetap `payment_dummy` sampai ada payment provider riil. |  |  |

### Implementation Phase 1

- **GOAL-001**: Tambahkan schema database final untuk package pricing, voucher backend, dan snapshot transaksi checkout.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-006 | Tambahkan migration baru `migrations/050_checkout_packages_vouchers.sql` untuk menambah kolom `list_amount_rp`, `checkout_group`, dan `sort_order` ke `public.packages`. |  |  |
| TASK-007 | Pada migration yang sama, buat tabel `public.discount_vouchers` dengan kolom `id`, `code`, `scope_type`, `package_id`, `discount_percent`, `max_uses`, `used_count`, `expires_at`, `is_active`, `created_by`, `created_at`, `updated_at`. |  |  |
| TASK-008 | Tambahkan constraint `scope_type in ('global', 'package')` pada `public.discount_vouchers`. |  |  |
| TASK-009 | Tambahkan constraint `discount_percent > 0 and discount_percent <= 100` pada `public.discount_vouchers`. |  |  |
| TASK-010 | Tambahkan constraint `max_uses is null or max_uses > 0` pada `public.discount_vouchers`. |  |  |
| TASK-011 | Tambahkan constraint `used_count >= 0` pada `public.discount_vouchers`. |  |  |
| TASK-012 | Tambahkan constraint konsistensi scope: jika `scope_type = 'global'`, maka `package_id is null`; jika `scope_type = 'package'`, maka `package_id is not null`. |  |  |
| TASK-013 | Tambahkan index untuk `discount_vouchers.code`, `discount_vouchers.is_active`, `discount_vouchers.package_id`, dan kombinasi yang membantu validasi voucher aktif. |  |  |
| TASK-014 | Pada migration yang sama, extend `public.transactions` dengan kolom `list_amount_rp`, `package_discount_amount_rp`, `voucher_id`, `voucher_code`, `voucher_discount_percent`, `voucher_discount_amount_rp`. |  |  |
| TASK-015 | Tambahkan constraint non-negative pada semua kolom nominal transaksi baru. |  |  |
| TASK-016 | Tambahkan trigger timestamp `updated_at` untuk `discount_vouchers` jika repo saat ini mengandalkan pola trigger global yang sama. |  |  |

### Implementation Phase 2

- **GOAL-002**: Perbarui seed package dan data dev agar checkout memakai enam package final yang menjadi source of truth product.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-017 | Update `migrations/040_dev_seed_full.sql` agar package seed dev hanya merepresentasikan package final product yang relevan untuk checkout member. |  |  |
| TASK-018 | Update `migrations/041_dev_seed_loginable_users.sql` agar seed transaksi/subscription tetap konsisten dengan package final baru atau fallback id package yang valid. |  |  |
| TASK-019 | Seed package `Semi Private 30 days` dengan `list_amount_rp = 80000`, `amount_rp = 76000`, `checkout_group = 'semi-private'`, `sort_order = 10`. |  |  |
| TASK-020 | Seed package `Semi Private 60 days` dengan `list_amount_rp = 160000`, `amount_rp = 128000`, `checkout_group = 'semi-private'`, `sort_order = 20`. |  |  |
| TASK-021 | Seed package `Semi Private 180 days` dengan `list_amount_rp = 480000`, `amount_rp = 336000`, `checkout_group = 'semi-private'`, `sort_order = 30`. |  |  |
| TASK-022 | Seed package `Semi Private 360 days` dengan `list_amount_rp = 960000`, `amount_rp = 576000`, `checkout_group = 'semi-private'`, `sort_order = 40`. |  |  |
| TASK-023 | Seed package `Full Private 15 days` dengan `list_amount_rp = 125000`, `amount_rp = 100000`, `checkout_group = 'full-private'`, `sort_order = 10`. |  |  |
| TASK-024 | Seed package `Full Private 30 days` dengan `list_amount_rp = 250000`, `amount_rp = 175000`, `checkout_group = 'full-private'`, `sort_order = 20`. |  |  |
| TASK-025 | Pastikan package inactive/dev-only lama tidak lagi menjadi source of truth checkout baru. |  |  |

### Implementation Phase 3

- **GOAL-003**: Adaptasikan domain `packages` agar bisa menjadi source of truth catalog checkout dan tetap kompatibel dengan read path existing.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-026 | Extend `src/modules/packages/types.ts` untuk menambahkan field `listAmountRp`, `checkoutGroup`, dan `sortOrder` ke type read path yang relevan. |  |  |
| TASK-027 | Extend `src/modules/packages/repositories.ts` agar `PACKAGE_BASE_SELECT_FIELDS` ikut membaca `list_amount_rp`, `checkout_group`, dan `sort_order`. |  |  |
| TASK-028 | Update parser dan mapper row package agar seluruh field baru ter-parse dan ter-map dengan type-safe. |  |  |
| TASK-029 | Update `src/modules/packages/schemas.ts` dan service admin package jika kolom baru harus editable oleh admin package form existing. |  |  |
| TASK-030 | Tentukan apakah admin package form existing akan di-update sekarang atau sementara diberi default values di backend migration supaya tidak memblok checkout. |  |  |
| TASK-031 | Tambahkan helper domain package untuk menghitung `packageDiscountAmountRp` dan `packageDiscountPercent` dari `listAmountRp` dan `amountRp` bila helper ini dipakai lintas checkout/UI. |  |  |

### Implementation Phase 4

- **GOAL-004**: Tambahkan domain backend `vouchers` yang berdiri sendiri, reusable, dan siap dipakai oleh checkout sekarang dan admin dashboard nanti.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-032 | Buat `src/modules/vouchers/types.ts` untuk type row voucher, scope voucher, input validasi voucher, dan hasil quote voucher. |  |  |
| TASK-033 | Buat `src/modules/vouchers/schemas.ts` untuk schema code voucher, schema checkout voucher validation input, dan schema create/update voucher future-proof untuk admin. |  |  |
| TASK-034 | Buat `src/modules/vouchers/repositories.ts` untuk read voucher by code, increment `used_count`, dan optional lock-safe update yang mencegah oversubscribe kuota voucher. |  |  |
| TASK-035 | Buat `src/modules/vouchers/services.ts` untuk `getVoucherByCode`, `validateVoucherForPackage`, `calculateVoucherDiscount`, dan `consumeVoucherUsage`. |  |  |
| TASK-036 | Pada service voucher, implementasikan validasi aktif, expiry, scope package/global, dan `max_uses` remaining. |  |  |
| TASK-037 | Pada service voucher, hitung `voucherDiscountAmountRp` dengan rumus `round(baseAmount * discountPercent / 100)`. |  |  |
| TASK-038 | Pada service voucher, bedakan error code voucher seperti `not-found`, `inactive`, `expired`, `package-mismatch`, dan `usage-limit-reached` untuk UX checkout yang jelas. |  |  |
| TASK-039 | Pastikan increment `used_count` hanya dipakai dari submit checkout sukses dan tidak pernah dipanggil dari preview quote. |  |  |

### Implementation Phase 5

- **GOAL-005**: Tambahkan domain `checkout` sebagai source of truth server-side untuk catalog, quote, dan submit flow.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-040 | Buat `src/modules/checkout/types.ts` untuk type catalog group, checkout item, payment method UI, quote breakdown, dan submit result. |  |  |
| TASK-041 | Buat `src/modules/checkout/schemas.ts` untuk schema search param `packageId`, schema apply voucher, schema submit checkout, dan schema payment method UI. |  |  |
| TASK-042 | Buat `src/modules/checkout/queries.ts` untuk `getCheckoutCatalog()` yang mengambil package aktif lalu mengelompokkan berdasarkan `checkoutGroup`. |  |  |
| TASK-043 | Buat `src/modules/checkout/services.ts` untuk `resolveCheckoutQuote({ packageId, voucherCode })`. |  |  |
| TASK-044 | Pada `resolveCheckoutQuote`, implementasikan formula `subtotal = listAmountRp`, `packageDiscount = listAmountRp - amountRp`, `voucherDiscount = round(amountRp * discountPercent / 100)`, `total = max(0, amountRp - voucherDiscount)`. |  |  |
| TASK-045 | Pada `resolveCheckoutQuote`, kembalikan breakdown lengkap yang cukup untuk panel summary kanan tanpa menghitung ulang di client. |  |  |
| TASK-046 | Buat `submitCheckout` di `src/modules/checkout/services.ts` yang me-revalidate package, me-revalidate voucher, membuat transaksi snapshot, menjalankan activation, menandai transaksi sukses/gagal, lalu meng-consume quota voucher saat sukses. |  |  |
| TASK-047 | Gunakan existing service activation dari `src/modules/subscriptions/services.ts` agar tidak menduplikasi logic subscription fulfillment. |  |  |
| TASK-048 | Jika submit gagal setelah transaksi pending dibuat, finalize transaksi sebagai failed dan jangan increment `used_count` voucher. |  |  |
| TASK-049 | Putuskan error result yang aman untuk UI checkout: package invalid, package disabled, voucher invalid, checkout failed, unauthorized. |  |  |

### Implementation Phase 6

- **GOAL-006**: Extend domain `transactions` agar snapshot pricing checkout tersimpan penuh dan typed end-to-end.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-050 | Extend `src/modules/transactions/types.ts` untuk field snapshot pricing baru pada `TransactionRecord` dan `CreateTransactionInput`. |  |  |
| TASK-051 | Extend `src/modules/transactions/repositories.ts` agar `insertTransaction()` menerima dan menyimpan `list_amount_rp`, `package_discount_amount_rp`, `voucher_id`, `voucher_code`, `voucher_discount_percent`, `voucher_discount_amount_rp`. |  |  |
| TASK-052 | Pastikan `createTransaction()` yang dipakai flow lama tetap memiliki default yang aman agar code existing tidak rusak sebelum semua caller di-update. |  |  |
| TASK-053 | Update parser transaksi di `src/modules/console/queries.ts` dan `src/modules/console/types.ts` jika histori member perlu menampilkan data snapshot baru di masa depan atau agar select fields tidak mismatch. |  |  |

### Implementation Phase 7

- **GOAL-007**: Tambahkan server actions checkout dan sambungkan route baru `/checkout` ke backend quote/submit flow.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-054 | Buat `src/modules/checkout/actions.ts` menggunakan `memberActionClient`. |  |  |
| TASK-055 | Tambahkan action `getCheckoutQuoteAction` untuk refresh quote berdasarkan `packageId` dan optional `voucherCode`. |  |  |
| TASK-056 | Tambahkan action `submitCheckoutAction` untuk submit final checkout dari UI. |  |  |
| TASK-057 | Pastikan seluruh error dari action dipetakan ke pesan stabil yang bisa ditampilkan UI tanpa membocorkan detail internal. |  |  |
| TASK-058 | Gunakan schema Zod yang eksplisit untuk semua payload action checkout. |  |  |

### Implementation Phase 8

- **GOAL-008**: Refactor shell member seperlunya agar route `/checkout` bisa tampil seperti product page, bukan seperti turunan page console template.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-059 | Audit `src/app/(member)/layout.tsx` dan tentukan bagian mana yang terlalu console-specific untuk checkout baru. |  |  |
| TASK-060 | Jadikan `(member)` layout lebih netral jika diperlukan, tetap dengan auth gate member yang sama. |  |  |
| TASK-061 | Pindahkan heading/ornamen yang spesifik console ke route-local component console bila itu diperlukan agar checkout tidak terbebani shell console. |  |  |
| TASK-062 | Pastikan perubahan shell tidak merusak route `console` dan `paymentdummy` yang existing sebelum redirect akhir dilakukan. |  |  |

### Implementation Phase 9

- **GOAL-009**: Bangun page `/checkout` dan seluruh route-local UI yang mengikuti mockup dan rule repo.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-063 | Buat `src/app/(member)/checkout/page.tsx` sebagai server component tipis yang membaca `searchParams`, memanggil `getCheckoutCatalog()`, menentukan package initial, dan merender `CheckoutPage`. |  |  |
| TASK-064 | Buat `src/app/(member)/checkout/_components/checkout-page.tsx` sebagai client component utama untuk state interaksi checkout. |  |  |
| TASK-065 | Pecah route-local UI bila file mulai besar, misalnya `checkout-package-selector.tsx`, `checkout-duration-selector.tsx`, `checkout-payment-selector.tsx`, `checkout-summary-card.tsx`, `checkout-voucher-form.tsx`. |  |  |
| TASK-066 | Gunakan primitive existing seperti `Card`, `Button`, `Field`, `InputGroup`, `Alert`, dan icon `lucide-react`. |  |  |
| TASK-067 | Pastikan voucher input memakai icon kiri sesuai UI rules repo. |  |  |
| TASK-068 | Implementasikan package selector dua grup: `Semi Private` dan `Full Private`, dengan durations diambil dari package dalam grup terpilih. |  |  |
| TASK-069 | Implementasikan state initial dari `packageId` query param jika valid; jika tidak valid, fallback ke package aktif pertama. |  |  |
| TASK-070 | Tampilkan price breakdown kanan berdasarkan hasil quote server, bukan hitung client-only. |  |  |
| TASK-071 | Implementasikan apply voucher, remove voucher, loading state, error state, dan applied state seperti flow mockup. |  |  |
| TASK-072 | Implementasikan payment method cards `QRIS`, `Crypto`, `Card` sebagai local UI state tanpa efek backend dulu. |  |  |
| TASK-073 | Implementasikan CTA `Pay Now` yang memanggil `submitCheckoutAction`. |  |  |
| TASK-074 | Pastikan layout sticky summary desktop dan stack mobile sesuai mockup. |  |  |
| TASK-075 | Tambahkan microcopy Indonesia yang konsisten dengan flow internal member dan bukan copy template demo. |  |  |

### Implementation Phase 10

- **GOAL-010**: Ganti entry point pembelian member dari `paymentdummy` ke `checkout` tanpa memutus compat flow lama selama transisi.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-076 | Update `src/app/(member)/console/_components/console-extend-dialog/console-extend-dialog.tsx` agar CTA mengarah ke `/checkout?packageId=...`. |  |  |
| TASK-077 | Review `src/modules/ext/repositories.ts` dan pastikan `checkoutUrl` untuk payload ext tidak lagi misleading jika masih hardcoded ke `/paymentdummy`. |  |  |
| TASK-078 | Tentukan apakah `/paymentdummy` akan dipertahankan sementara sebagai redirect ke `/checkout` atau dibiarkan untuk backward compatibility internal. |  |  |
| TASK-079 | Jika memilih redirect, update `src/app/(member)/paymentdummy/page.tsx` agar route lama tidak membelah flow baru. |  |  |

### Implementation Phase 11

- **GOAL-011**: Tambahkan coverage test unit, page test, dan verification flow untuk memastikan perubahan aman end-to-end.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-080 | Tambahkan unit test baru untuk `src/modules/vouchers/services.ts`. |  |  |
| TASK-081 | Tambahkan test scenario voucher global valid. |  |  |
| TASK-082 | Tambahkan test scenario voucher package-specific valid. |  |  |
| TASK-083 | Tambahkan test scenario voucher expired. |  |  |
| TASK-084 | Tambahkan test scenario voucher inactive. |  |  |
| TASK-085 | Tambahkan test scenario voucher package mismatch. |  |  |
| TASK-086 | Tambahkan test scenario voucher max use reached. |  |  |
| TASK-087 | Tambahkan unit test baru untuk `src/modules/checkout/services.ts` untuk quote tanpa voucher, quote dengan voucher, dan total final `0`. |  |  |
| TASK-088 | Update `tests/unit/modules/transactions/repositories.test.ts` dan `tests/unit/modules/transactions/services.test.ts` agar snapshot pricing baru ter-cover. |  |  |
| TASK-089 | Tambahkan/ubah test `tests/unit/app/member/paymentdummy-page.test.ts` jika route lama berubah menjadi redirect. |  |  |
| TASK-090 | Tambahkan test baru untuk `src/app/(member)/checkout/page.tsx` dan UI checkout route-local components. |  |  |
| TASK-091 | Tambahkan test integration-level service flow: transaksi sukses + voucher consume, transaksi gagal + voucher tidak consume. |  |  |
| TASK-092 | Jalankan `pnpm lint`, `pnpm typecheck`, `pnpm test`, dan `pnpm check:fix`. |  |  |
| TASK-093 | Lakukan browser verification headless untuk flow impacted: buka `/checkout`, ganti package, apply voucher, remove voucher, submit checkout, dan cek redirect ke `/console`. |  |  |

### Implementation Phase 12

- **GOAL-012**: Finalisasi perubahan, bersihkan debt transisi, dan dokumentasikan hasil implementasi.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-094 | Pastikan tidak ada import boundary violation setelah domain `checkout` dan `vouchers` ditambahkan. |  |  |
| TASK-095 | Review apakah helper format uang perlu dipusatkan ke `src/lib/utils.ts` atau cukup reuse existing formatter tanpa over-refactor. |  |  |
| TASK-096 | Review apakah admin package form existing perlu update field baru di fase yang sama atau diberi fallback aman sampai phase admin berikutnya. |  |  |
| TASK-097 | Scan `.next/dev/logs/*.log` untuk error relevan setelah flow checkout berjalan. |  |  |
| TASK-098 | Catat follow-up out-of-scope: admin UI voucher, payment provider riil, invoice/receipt UI, analytics coupon usage dashboard. |  |  |

## 3. Alternatives

- **ALT-001**: Memperluas route `/paymentdummy` menjadi checkout final. Ditolak karena route itu sudah membawa makna implementasi sementara dan mencampur concern confirm-payment dengan quote builder baru.
- **ALT-002**: Menaruh seluruh logic voucher di `src/modules/subscriptions/services.ts`. Ditolak karena voucher adalah concern pricing/eligibility, bukan concern fulfillment subscription.
- **ALT-003**: Menyimpan voucher sebagai nominal amount atau basis points. Ditolak karena user telah memutuskan model voucher final harus persen integer agar operasional admin lebih sederhana.
- **ALT-004**: Menjadikan `packages.name` sebagai sumber grouping `Semi Private` vs `Full Private`. Ditolak karena parsing nama rapuh dan tidak layak menjadi source of truth domain.
- **ALT-005**: Menjadikan `checkout_url` sebagai source of truth checkout baru. Ditolak karena read path existing sudah tidak konsisten dan field tersebut tidak dibutuhkan untuk internal checkout member baru.
- **ALT-006**: Menambah endpoint REST `api/checkout/quote`. Ditolak karena repo mengarahkan internal web app ke Server Component + Server Action, bukan REST publik baru.

## 4. Dependencies

- **DEP-001**: `next-safe-action` existing setup di `src/lib/safe-action/client.ts`.
- **DEP-002**: Auth/member guard existing melalui `memberActionClient` dan `requireMemberShellAccess()`.
- **DEP-003**: Domain package existing di `src/modules/packages/*`.
- **DEP-004**: Domain subscription activation existing di `src/modules/subscriptions/services.ts`.
- **DEP-005**: Domain transaction existing di `src/modules/transactions/*`.
- **DEP-006**: Primitive UI existing di `src/components/ui/**`.
- **DEP-007**: Dokumen struktur folder `docs/agent-rules/folder-structure.md`.
- **DEP-008**: Dokumen aturan UI `docs/agent-rules/ui-ux-rules.md`.
- **DEP-009**: Mockup/flow reference di `docs/ui-flow/checkout-ui.html` dan screenshot checkout terkait.

## 5. Files

- **FILE-001**: `docs/plans/feature-checkout-voucher-member-flow-1.md` - implementation plan ini.
- **FILE-002**: `migrations/050_checkout_packages_vouchers.sql` - migration utama package pricing, vouchers, transactions snapshot.
- **FILE-003**: `migrations/040_dev_seed_full.sql` - update dev seed package dan data terkait.
- **FILE-004**: `migrations/041_dev_seed_loginable_users.sql` - sinkronisasi seed loginable dataset dengan package final.
- **FILE-005**: `src/modules/packages/types.ts` - extend types package checkout.
- **FILE-006**: `src/modules/packages/repositories.ts` - extend read/write fields package.
- **FILE-007**: `src/modules/packages/services.ts` - adaptasi package snapshot jika diperlukan.
- **FILE-008**: `src/modules/packages/schemas.ts` - validasi field package baru bila admin form ikut di-update.
- **FILE-009**: `src/modules/vouchers/types.ts` - type domain voucher.
- **FILE-010**: `src/modules/vouchers/schemas.ts` - schema domain voucher.
- **FILE-011**: `src/modules/vouchers/repositories.ts` - repository voucher.
- **FILE-012**: `src/modules/vouchers/services.ts` - service voucher.
- **FILE-013**: `src/modules/checkout/types.ts` - type domain checkout.
- **FILE-014**: `src/modules/checkout/schemas.ts` - schema checkout.
- **FILE-015**: `src/modules/checkout/queries.ts` - query catalog checkout.
- **FILE-016**: `src/modules/checkout/services.ts` - quote dan submit checkout.
- **FILE-017**: `src/modules/checkout/actions.ts` - server actions checkout.
- **FILE-018**: `src/modules/transactions/types.ts` - extend snapshot pricing transaction.
- **FILE-019**: `src/modules/transactions/repositories.ts` - persist snapshot pricing transaction.
- **FILE-020**: `src/modules/transactions/services.ts` - wiring create transaction input bila perlu.
- **FILE-021**: `src/modules/console/queries.ts` - optional select/update snapshot transaksi.
- **FILE-022**: `src/modules/console/types.ts` - optional type transaksi console.
- **FILE-023**: `src/app/(member)/layout.tsx` - netralisasi shell member bila dibutuhkan.
- **FILE-024**: `src/app/(member)/checkout/page.tsx` - server route checkout.
- **FILE-025**: `src/app/(member)/checkout/_components/checkout-page.tsx` - client page checkout.
- **FILE-026**: `src/app/(member)/checkout/_components/*` - subcomponents route-local checkout bila diperlukan.
- **FILE-027**: `src/app/(member)/console/_components/console-extend-dialog/console-extend-dialog.tsx` - ganti entry point ke checkout.
- **FILE-028**: `src/app/(member)/paymentdummy/page.tsx` - redirect transisi atau route compatibility.
- **FILE-029**: `src/modules/ext/repositories.ts` - sinkronisasi checkoutUrl payload extension bila diperlukan.
- **FILE-030**: `tests/unit/modules/vouchers/*.test.ts` - test voucher domain baru.
- **FILE-031**: `tests/unit/modules/checkout/*.test.ts` - test checkout domain baru.
- **FILE-032**: `tests/unit/app/member/checkout*.test.ts` - test page/UI checkout.
- **FILE-033**: `tests/unit/modules/transactions/*.test.ts` - update snapshot pricing transaction tests.
- **FILE-034**: `tests/unit/app/member/paymentdummy*.test.ts` - update compatibility tests route lama.

## 6. Testing

- **TEST-001**: Validasi migration berjalan tanpa conflict terhadap schema package, transaction, dan seed existing.
- **TEST-002**: `resolveCheckoutQuote()` mengembalikan subtotal, package discount, voucher discount, dan total final yang benar tanpa voucher.
- **TEST-003**: `resolveCheckoutQuote()` mengembalikan total final yang benar dengan voucher global valid.
- **TEST-004**: `resolveCheckoutQuote()` mengembalikan total final yang benar dengan voucher package-specific valid.
- **TEST-005**: Voucher expired ditolak dengan error code yang stabil.
- **TEST-006**: Voucher inactive ditolak dengan error code yang stabil.
- **TEST-007**: Voucher package mismatch ditolak dengan error code yang stabil.
- **TEST-008**: Voucher max use reached ditolak dengan error code yang stabil.
- **TEST-009**: `submitCheckout()` membuat transaksi snapshot lengkap saat sukses.
- **TEST-010**: `submitCheckout()` tidak increment `used_count` saat activation atau finalize transaction gagal.
- **TEST-011**: `submitCheckout()` increment `used_count` tepat satu kali saat transaksi sukses.
- **TEST-012**: Route `/checkout` me-render package initial yang benar dari `searchParams.packageId`.
- **TEST-013**: UI checkout bisa apply voucher, remove voucher, dan refresh summary tanpa full page reload yang rusak.
- **TEST-014**: UI checkout tetap usable di viewport mobile dan desktop.
- **TEST-015**: `console` dialog member mengarahkan ke `/checkout?packageId=...`.
- **TEST-016**: Bila route `/paymentdummy` dijadikan redirect, behavior lama tidak menghasilkan dead-end bagi member.
- **TEST-017**: `pnpm lint` hijau.
- **TEST-018**: `pnpm typecheck` hijau.
- **TEST-019**: `pnpm test` hijau.
- **TEST-020**: `pnpm check:fix` hijau.
- **TEST-021**: Browser verification headless menunjukkan flow checkout tanpa runtime error relevan.
- **TEST-022**: next-devtools runtime inspection tidak menunjukkan error compile/runtime relevan pada route checkout.

## 7. Risks & Assumptions

- **RISK-001**: Mengubah shape `packages` bisa berdampak ke admin package form existing bila field baru tidak diberi default atau tidak ikut di-wire dengan benar.
- **RISK-002**: Menambah snapshot fields ke `transactions` bisa memerlukan penyesuaian test dan parser yang lebih luas dari dugaan awal.
- **RISK-003**: Refactor `(member)` layout berisiko mengubah visual `console` dan `paymentdummy` jika tidak diisolasi baik.
- **RISK-004**: Increment quota voucher tanpa atomic guard berisiko oversubscribe saat dua checkout submit hampir bersamaan.
- **RISK-005**: Seed package final baru dapat memengaruhi test snapshot atau expectation hardcoded di banyak test existing.
- **ASSUMPTION-001**: Voucher diskon persen selalu integer bulat `1..100`.
- **ASSUMPTION-002**: Payment method belum punya efek backend dalam phase ini.
- **ASSUMPTION-003**: Route checkout tetap berada di route group `(member)` dan tidak akan dibuka untuk guest.
- **ASSUMPTION-004**: Activation checkout tetap boleh memakai source `payment_dummy` sampai payment provider riil ditentukan.
- **ASSUMPTION-005**: Tidak ada requirement stack baru; Tailwind + primitive UI existing tetap menjadi fondasi UI checkout.
- **ASSUMPTION-006**: Admin voucher page akan dibangun di phase berikutnya dengan memanfaatkan backend voucher yang selesai pada plan ini.

## 8. Related Specifications / Further Reading

- `docs/agent-rules/folder-structure.md`
- `docs/agent-rules/ui-ux-rules.md`
- `docs/ui-flow/checkout-ui.html`
- `docs/ui-flow/Screenshot from 2026-05-21 13-47-22.png`
- `src/app/(member)/paymentdummy/page.tsx`
- `src/modules/subscriptions/services.ts`
- `src/modules/packages/services.ts`
- `src/modules/transactions/repositories.ts`
