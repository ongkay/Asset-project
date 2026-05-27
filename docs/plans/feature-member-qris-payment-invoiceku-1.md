---
goal: Implement real QRIS payment flow with InvoiceKu-backed member payment page and deferred subscription fulfillment end-to-end
version: 1.0
date_created: 2026-05-22
last_updated: 2026-05-22
owner: OpenCode
status: Planned
tags: [feature, payments, qris, invoiceku, checkout, member, migration]
---

# Introduction

![Status: Planned](https://img.shields.io/badge/status-Planned-blue)

Dokumen ini adalah implementation plan end-to-end untuk mengganti flow `payment_dummy` dengan payment QRIS riil berbasis InvoiceKu. Target akhir plan ini adalah flow `console -> checkout -> payment/[transactionId] -> paid -> fulfillment subscription -> console`, dengan invoice QRIS dibuat server-side, `qris_string` disimpan sebagai source of truth, QR code dirender langsung di app, dan subscription hanya diaktifkan setelah status pembayaran benar-benar terkonfirmasi `paid`.

Plan ini sengaja mempertahankan pilihan payment method `Crypto` dan `Card` di UI checkout sebagai state disabled, tetapi backend payment riil pada fase ini hanya mengaktifkan `QRIS`. Plan ini juga memisahkan `source` bisnis (`payment_qris`) dari `payment_provider` teknis (`invoiceku`) agar repo tetap fleksibel jika provider diganti di masa depan.

## 1. Requirements & Constraints

- **REQ-001**: Route payment final harus berada di `src/app/(member)/payment/[transactionId]/page.tsx` dan hanya boleh diakses oleh member yang berhak atas transaksi tersebut.
- **REQ-002**: Flow pembelian final harus menjadi `console -> checkout -> payment/[transactionId] -> console`, bukan `checkout -> activation langsung`.
- **REQ-003**: Subscription dan asset assignment hanya boleh di-fulfill setelah provider mengembalikan status pembayaran `paid`.
- **REQ-004**: `qris_string` harus disimpan di database dan menjadi source of truth untuk render QR code di app.
- **REQ-005**: UI tidak boleh bergantung pada `qris_image_url` provider sebagai source of truth visual QRIS.
- **REQ-006**: `payment_url` provider tetap boleh disimpan sebagai fallback aksi sekunder bila scan QR dari app bermasalah.
- **REQ-007**: Payment method `QRIS`, `Crypto`, dan `Card` harus tetap tampil di checkout, tetapi `Crypto` dan `Card` harus disabled dengan copy yang jelas bahwa metode tersebut belum tersedia.
- **REQ-008**: Backend real payment pada fase ini hanya menerima submit checkout dengan `paymentMethod = 'qris'`.
- **REQ-009**: Source transaksi dan subscription baru harus memakai nilai bisnis `payment_qris`, bukan nama vendor seperti `qris_invoiceku`.
- **REQ-010**: Nama provider teknis harus disimpan terpisah, minimal sebagai `payment_provider = 'invoiceku'` pada transaksi QRIS.
- **REQ-011**: Halaman payment harus mengikuti struktur UX mockup di `docs/mockup/payment.html`, tetapi implementasi visual wajib tetap mengikuti token dan primitive repo.
- **REQ-012**: `amount_total` dari provider harus menjadi nominal tagihan final yang dibayar user, termasuk jika provider menambahkan biaya admin di atas quote checkout.
- **REQ-013**: Breakdown harga checkout sebelum biaya provider harus tetap audit-friendly melalui snapshot transaksi yang sudah ada.
- **REQ-014**: Jika provider menambahkan biaya, sistem harus menyimpan `payment_fee_amount_rp` secara eksplisit agar nominal final tetap dapat dijelaskan.
- **REQ-015**: Jika user submit checkout QRIS berulang kali untuk quote yang sama dan invoice sebelumnya masih valid, sistem harus dapat me-reuse invoice pending yang existing agar tidak membuat invoice duplikat tanpa perlu.
- **REQ-016**: User harus tetap bisa melanjutkan pembayaran pending yang sudah ada tanpa harus mengulang seluruh flow dari awal.
- **REQ-017**: Tidak boleh ada aktivasi subscription palsu saat invoice masih `pending`, `failed`, `expired`, atau `canceled`.
- **REQ-018**: Transaksi payment QRIS harus bisa direkonsiliasi ulang oleh cron tanpa endpoint publik baru untuk internal web app.
- **REQ-019**: Flow baru harus tetap menjaga backward compatibility route lama `/paymentdummy` minimal sebagai redirect transisi yang aman.
- **REQ-020**: UI member dan admin yang menampilkan `source` transaksi harus mengenali source baru `payment_qris`.
- **REQ-021**: History transaksi member minimal harus tetap dapat menampilkan transaksi QRIS pending/success/failed/canceled dengan label yang benar.
- **REQ-022**: Bila memungkinkan tanpa over-refactor, history member harus menyediakan jalur untuk melanjutkan pembayaran QRIS pending.
- **SEC-001**: API key InvoiceKu wajib disimpan server-side dan tidak boleh pernah bocor ke browser.
- **SEC-002**: Semua request ke provider wajib dilakukan dari server-side code yang tervalidasi, bukan dari client component.
- **SEC-003**: Semua payload external dan response provider wajib diparse dengan Zod atau guard typed yang setara sebelum dipakai lebih lanjut.
- **SEC-004**: Finalisasi payment `paid` harus idempotent; satu invoice tidak boleh menghasilkan dua aktivasi subscription.
- **SEC-005**: Finalisasi payment harus memakai claim atomik atau conditional update terhadap row transaksi agar retry manual, polling, dan cron tidak saling menduplikasi fulfillment.
- **SEC-006**: Jika provider sedang error sementara seperti `503`, sistem tidak boleh langsung menandai transaksi gagal terminal; status lokal harus tetap aman untuk retry.
- **SEC-007**: Cancel invoice hanya boleh berjalan untuk owner transaksi yang masih `pending` dan belum terminal.
- **SEC-008**: Check status invoice hanya boleh dijalankan untuk owner transaksi yang sah atau trusted cron.
- **CON-001**: Implementasi wajib mengikuti `docs/agent-rules/folder-structure.md`.
- **CON-002**: `src/app/**` harus tetap tipis; business logic payment wajib hidup di `src/modules/payments/**`, bukan di `page.tsx` atau client component.
- **CON-003**: Akses HTTP ke provider external harus dibungkus di `src/lib/**` sebagai adapter teknis, bukan langsung dibuat di route/page/action domain.
- **CON-004**: Mutation yang dipicu UI web internal wajib memakai `next-safe-action`, bukan REST endpoint internal baru.
- **CON-005**: Route handler baru hanya boleh dipakai untuk trusted cron atau integrasi external yang memang membutuhkan endpoint HTTP.
- **CON-006**: Repo tetap memakai `pnpm`, Next.js App Router, Tailwind, dan primitive UI existing.
- **CON-007**: Jangan memperkenalkan fondasi UI baru seperti HeroUI.
- **CON-008**: Karena docs provider yang tersedia belum menunjukkan webhook, fase ini harus mengandalkan server action + polling/manual refresh + cron reconcile sebagai mekanisme finalisasi utama.
- **CON-009**: Patch implementasi sebaiknya dipecah kecil agar aman terhadap repo yang rawan patch besar gagal.
- **GUD-001**: Payment page harus mobile-first, responsif, dan tidak bergantung pada CSS mockup mentah.
- **GUD-002**: Semua state penting di payment page harus jelas secara visual: pending, paid, expired, canceled, dan processing.
- **GUD-003**: Button utama payment page harus fokus ke cek status/konfirmasi pembayaran; aksi sekunder seperti cancel harus lebih tenang tetapi tetap jelas.
- **GUD-004**: Copy UI harus berbahasa Indonesia, singkat, dan tidak membocorkan istilah internal engineering.
- **PAT-001**: Domain payment baru harus mengikuti konvensi `actions.ts`, `services.ts`, `repositories.ts`, `schemas.ts`, `types.ts`, dan `queries.ts` sesuai kebutuhan.
- **PAT-002**: `transactions` tetap menjadi audit trail utama; fase ini tidak membuat tabel payment baru jika extend `transactions` masih cukup.
- **PAT-003**: `source` bisnis dan `payment_provider` teknis harus dipisah agar code tidak vendor-locked di layer domain.
- **PAT-004**: QR code harus dirender dari string lokal sehingga implementasi tidak memerlukan `next.config` remote image allowlist.

## 2. Implementation Steps

### Implementation Phase 0

- **GOAL-000**: Bekukan keputusan domain, naming, dan lifecycle agar seluruh phase implementasi berikutnya deterministic.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-000 | Tetapkan route payment final sebagai `src/app/(member)/payment/[transactionId]/page.tsx` dan bukan memperluas `paymentdummy` menjadi halaman final. |  |  |
| TASK-001 | Tetapkan source bisnis baru sebagai `payment_qris` untuk transaksi dan subscription hasil payment QRIS. |  |  |
| TASK-002 | Tetapkan provider teknis baru sebagai `invoiceku`, disimpan terpisah dari `source`. |  |  |
| TASK-003 | Tetapkan bahwa `qris_string` menjadi source of truth visual QRIS, sedangkan `qris_image_url` provider tidak dipakai sebagai sumber render utama. |  |  |
| TASK-004 | Tetapkan bahwa `Crypto` dan `Card` tetap tampil di UI checkout tetapi disabled, dan submit backend untuk dua metode tersebut harus mengembalikan error stabil `payment-method-unavailable`. |  |  |
| TASK-005 | Tetapkan bahwa fase ini tidak memakai webhook karena docs provider yang tersedia belum mendokumentasikan webhook secara memadai. |  |  |
| TASK-006 | Tetapkan bahwa existing `/paymentdummy` tetap dipertahankan minimal sebagai redirect transisi yang aman sampai cleanup lanjutan disetujui. |  |  |

### Implementation Phase 1

- **GOAL-001**: Tambahkan fondasi schema database dan environment variable untuk QRIS payment riil.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-007 | Tambahkan migration baru `migrations/054_real_qris_payments.sql` untuk `alter type public.source_enum add value if not exists 'payment_qris'`. |  |  |
| TASK-008 | Pada migration yang sama, buat enum baru atau constraint typed setara untuk `payment_provider`, `payment_provider_status`, dan `payment_fulfillment_status` yang minimal mendukung `invoiceku`, `pending|paid|failed|canceled|expired`, dan `not_started|processing|fulfilled|failed`. |  |  |
| TASK-009 | Extend `public.transactions` dengan kolom payment-specific minimal: `payment_provider`, `payment_provider_status`, `payment_fulfillment_status`, `provider_invoice_id`, `provider_expired_at`, `provider_payment_url`, `qris_string`, `payment_fee_amount_rp`, `payment_received_at`, dan `provider_payload_json`. |  |  |
| TASK-010 | Tambahkan partial unique index untuk `provider_invoice_id` yang non-null agar satu invoice provider tidak bisa tertulis ke dua transaksi berbeda. |  |  |
| TASK-011 | Tambahkan constraint nominal non-negative untuk `payment_fee_amount_rp`. |  |  |
| TASK-012 | Putuskan dan implementasikan default aman untuk row legacy non-payment, misalnya seluruh kolom payment baru nullable atau memiliki default yang tidak memaksa backfill rumit. |  |  |
| TASK-013 | Review constraint `transactions_paid_at_consistency` existing pada `migrations/012_subscription_tables.sql` dan pastikan semantics baru tidak bentrok dengan field `payment_received_at` tambahan. |  |  |
| TASK-014 | Extend `src/config/env.server.ts` dengan `INVOICEKU_API_KEY` dan `INVOICEKU_BASE_URL`, dengan base URL default `https://invoiceku.net/api/v1` bila memang ingin configurable. |  |  |

### Implementation Phase 2

- **GOAL-002**: Tambahkan adapter teknis provider dan kontrak typed transaksi agar integrasi external tetap terisolasi rapi.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-015 | Tambahkan adapter teknis baru di `src/lib/payments/invoiceku.ts` untuk `createInvoice`, `getInvoiceById`, dan `cancelInvoiceById`. |  |  |
| TASK-016 | Di adapter yang sama, parse seluruh response create/check/cancel provider dengan schema Zod internal agar perubahan shape response tidak bocor langsung ke domain. |  |  |
| TASK-017 | Tambahkan mapping error provider ke error domain stabil, misalnya `provider-auth-error`, `provider-not-found`, `provider-unavailable`, dan `provider-invalid-response`. |  |  |
| TASK-018 | Extend `src/modules/transactions/types.ts` dengan field payment-specific baru dan source union `payment_qris`. |  |  |
| TASK-019 | Extend `src/modules/transactions/repositories.ts` select mapper agar field payment-specific baru ikut di-read dan di-write secara type-safe. |  |  |
| TASK-020 | Tambahkan helper repository transaksi untuk menyimpan metadata invoice setelah create provider sukses, termasuk `provider_invoice_id`, `provider_status`, `provider_expired_at`, `provider_payment_url`, `qris_string`, `payment_fee_amount_rp`, dan payload raw terpilih. |  |  |
| TASK-021 | Tambahkan helper repository transaksi untuk claim atomik finalisasi payment paid, misalnya conditional update dari `status = 'pending'` dan `payment_fulfillment_status in ('not_started', 'failed')` menjadi `processing`. |  |  |
| TASK-022 | Tambahkan helper repository transaksi untuk menandai payment provider sebagai `paid`, `expired`, `failed`, atau `canceled` tanpa menduplikasi logic table update di banyak tempat. |  |  |

### Implementation Phase 3

- **GOAL-003**: Bangun domain `payments` sebagai source of truth business logic QRIS member.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-023 | Buat `src/modules/payments/types.ts` untuk type payment detail page, payment lifecycle snapshot, action result, cron result, dan provider snapshot yang dipakai domain. |  |  |
| TASK-024 | Buat `src/modules/payments/schemas.ts` untuk schema `transactionId`, schema provider invoice identifier, schema action input `check status`, dan schema action input `cancel payment`. |  |  |
| TASK-025 | Buat `src/modules/payments/repositories.ts` untuk read model payment page member dan query candidate transaksi yang perlu direkonsiliasi. |  |  |
| TASK-026 | Buat `src/modules/payments/queries.ts` untuk `getMemberPaymentPageData({ transactionId, userId })` yang merakit data UI payment page dari transaksi existing. |  |  |
| TASK-027 | Buat `src/modules/payments/services.ts` untuk `createQrisPaymentForCheckout()` yang menerima user, package snapshot, pricing snapshot, dan profil customer lalu membuat transaksi pending + invoice provider. |  |  |
| TASK-028 | Pada `createQrisPaymentForCheckout()`, lakukan check reuse invoice pending yang existing untuk quote yang sama sebelum membuat invoice baru. |  |  |
| TASK-029 | Pada `createQrisPaymentForCheckout()`, buat transaksi pending lokal lebih dulu, call provider `POST /invoice`, lalu update row transaksi dengan metadata invoice dan total biaya provider. |  |  |
| TASK-030 | Tambahkan service `checkMemberQrisPaymentStatus()` yang membaca transaksi owner, memanggil provider `GET /invoice/{invoice_id}`, menyimpan snapshot status baru, dan memicu finalisasi fulfillment bila status provider `paid`. |  |  |
| TASK-031 | Tambahkan service `cancelMemberQrisPayment()` yang hanya mengizinkan cancel untuk transaksi QRIS owner yang masih `pending`, memanggil provider `POST /invoice/{invoice_id}/cancel`, lalu menandai transaksi lokal `canceled`. |  |  |
| TASK-032 | Tambahkan service `finalizePaidQrisTransaction()` yang menjalankan claim atomik, memanggil fulfillment subscription, meng-consume voucher bila ada, mengaitkan subscription ke transaksi, lalu menandai transaksi `success`. |  |  |
| TASK-033 | Pada `finalizePaidQrisTransaction()`, jika fulfillment gagal setelah provider sudah `paid`, simpan `payment_provider_status = 'paid'`, set `payment_fulfillment_status = 'failed'`, pertahankan transaksi tetap retriable, dan jangan membuat aktivasi ganda pada retry berikutnya. |  |  |

### Implementation Phase 4

- **GOAL-004**: Refactor fulfillment subscription agar payment dummy dan payment QRIS bisa reuse logic inti tanpa duplikasi berbahaya.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-034 | Extend `src/modules/subscriptions/types.ts` dan `src/modules/subscriptions/schemas.ts` agar union source mengenali `payment_qris` di seluruh kontrak domain yang relevan. |  |  |
| TASK-035 | Extract helper fulfillment generik dari `src/modules/subscriptions/services.ts` yang saat ini masih terkunci pada `purchaseSubscriptionWithPaymentDummy()`, misalnya helper untuk mengaktifkan subscription terbayar dengan `source`, `userId`, `packageSnapshot`, `durationDays`, dan `pricingSnapshot`. |  |  |
| TASK-036 | Jadikan `purchaseSubscriptionWithPaymentDummy()` sebagai wrapper legacy tipis di atas helper fulfillment generik tersebut agar flow lama tidak rusak selama transisi. |  |  |
| TASK-037 | Tambahkan mapping cancel reason dan compensation reason baru di `src/modules/subscriptions/services.ts` untuk source `payment_qris`, misalnya `replaced_by_payment_qris` dan `payment_qris_compensation`. |  |  |
| TASK-038 | Pastikan voucher usage hanya dikonsumsi setelah fulfillment QRIS benar-benar sukses dan tidak dikonsumsi saat invoice baru dibuat atau saat payment masih pending. |  |  |

### Implementation Phase 5

- **GOAL-005**: Integrasikan checkout existing dengan domain payment baru tanpa merusak pricing dan voucher flow yang sudah selesai.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-039 | Extend `src/modules/checkout/types.ts` agar `SubmitCheckoutResult` mendukung redirect final ke `/payment/[transactionId]` dan error `payment-method-unavailable`. |  |  |
| TASK-040 | Extend `src/modules/checkout/schemas.ts` bila perlu agar validasi payment method tetap menerima `qris|crypto|card`, tetapi backend service bisa menolak metode disabled dengan pesan stabil. |  |  |
| TASK-041 | Refactor `submitCheckout()` di `src/modules/checkout/services.ts` agar branch `qris` memanggil `createQrisPaymentForCheckout()` dan tidak lagi langsung memanggil `purchaseSubscriptionWithPaymentDummy()`. |  |  |
| TASK-042 | Pada branch `crypto` dan `card`, kembalikan result `ok: false` dengan error code stabil `payment-method-unavailable` dan copy user-facing yang sesuai. |  |  |
| TASK-043 | Tetap gunakan revalidation package dan voucher existing di checkout service sebelum invoice QRIS dibuat, agar provider hanya menerima nominal final yang sudah tervalidasi server-side. |  |  |
| TASK-044 | Pastikan `submitCheckoutAction` di `src/modules/checkout/actions.ts` mengembalikan result baru yang konsisten dengan redirect ke payment page. |  |  |
| TASK-045 | Update unit test `tests/unit/modules/checkout/services.test.ts` agar checkout QRIS kini menguji create invoice path, bukan aktivasi dummy langsung. |  |  |

### Implementation Phase 6

- **GOAL-006**: Update UI checkout agar QRIS aktif, `Crypto` dan `Card` disabled, dan user diarahkan ke payment page baru.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-046 | Update `src/app/(member)/checkout/_components/checkout-page.tsx` agar card method `QRIS` tetap selectable default dan `Crypto`/`Card` tampil disabled dengan affordance visual yang jelas. |  |  |
| TASK-047 | Tambahkan copy helper singkat di area payment method bahwa metode selain QRIS belum tersedia pada fase ini. |  |  |
| TASK-048 | Pastikan CTA submit checkout tetap hanya mengirim `paymentMethod = 'qris'` dari UI normal dan tidak mengizinkan klik pada card disabled. |  |  |
| TASK-049 | Saat submit checkout sukses, arahkan user ke `/payment/${transactionId}` alih-alih `/console`. |  |  |
| TASK-050 | Tambahkan UI state error yang jelas untuk `payment-method-unavailable` jika payload non-QRIS tetap sampai ke server melalui jalur tak terduga. |  |  |

### Implementation Phase 7

- **GOAL-007**: Bangun halaman payment member baru yang mengikuti mockup, memakai token repo, dan merender QR dari `qris_string`.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-051 | Tambahkan dependency QR renderer yang kompatibel dengan React 19 dan Next.js 16, misalnya `qrcode.react`, di `package.json` untuk merender QR dari `qris_string`. |  |  |
| TASK-052 | Buat route server `src/app/(member)/payment/[transactionId]/page.tsx` yang membaca param, memuat data via `getMemberPaymentPageData()`, dan merender payment page tipis. |  |  |
| TASK-053 | Buat route-local components di `src/app/(member)/payment/[transactionId]/_components/**`, minimal `payment-page.tsx`, `payment-header.tsx`, `payment-countdown.tsx`, `payment-qris-card.tsx`, `payment-instructions.tsx`, dan `payment-cancel-dialog.tsx` bila file utama mulai besar. |  |  |
| TASK-054 | Implementasikan header payment yang menampilkan nama package, kode transaksi atau invoice, dan countdown dari `provider_expired_at`. |  |  |
| TASK-055 | Render QR code dari `qris_string` di app dengan fallback placeholder/error state jika string kosong atau invalid. |  |  |
| TASK-056 | Tampilkan total tagihan final berdasarkan `transactions.amount_rp` setelah metadata provider terpasang, serta opsional breakdown biaya admin jika `payment_fee_amount_rp > 0`. |  |  |
| TASK-057 | Tampilkan instruksi pembayaran yang konsisten dengan mockup, termasuk scan QR dan nominal yang harus dibayar persis sama. |  |  |
| TASK-058 | Tampilkan button utama `Cek Status Pembayaran`, button sekunder `Batalkan Transaksi`, dan fallback link atau button ke `payment_url` provider bila dibutuhkan. |  |  |
| TASK-059 | Payment page harus memiliki state terminal yang jelas untuk `success`, `expired`, `canceled`, dan `failed`, termasuk overlay QR saat invoice sudah tidak berlaku. |  |  |
| TASK-060 | Jika transaksi sudah `success`, payment page boleh langsung redirect ke `/console` atau menampilkan success state singkat sebelum redirect, selama flow tetap konsisten dan tidak membingungkan. |  |  |

### Implementation Phase 8

- **GOAL-008**: Sambungkan payment page ke server actions untuk check status, cancel, dan auto-refresh yang aman.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-061 | Buat `src/modules/payments/actions.ts` menggunakan `memberActionClient` untuk action `checkPaymentStatusAction` dan `cancelPaymentAction`. |  |  |
| TASK-062 | Pastikan kedua action memakai schema Zod eksplisit untuk `transactionId` dan mengembalikan result serializable dengan status baru yang bisa langsung dipakai UI. |  |  |
| TASK-063 | Implementasikan client payment page agar `Cek Status Pembayaran` memanggil action status check, menampilkan loading state, lalu meng-update state lokal atau refresh route sesuai hasil. |  |  |
| TASK-064 | Implementasikan dialog cancel yang memanggil `cancelPaymentAction`, menutup invoice secara remote, dan mengunci UI setelah status terminal tercapai. |  |  |
| TASK-065 | Tambahkan polling ringan atau recheck berkala di payment page selama status masih pending, dengan interval yang masuk akal dan penghormatan pada lifecycle komponen. |  |  |
| TASK-066 | Pastikan check status tidak menggandakan finalisasi fulfillment bila button diklik berulang atau polling berjalan hampir bersamaan. |  |  |
| TASK-067 | Bila provider mengembalikan error non-terminal seperti `503`, tampilkan pesan retry yang aman tanpa mengubah transaksi menjadi terminal. |  |  |

### Implementation Phase 9

- **GOAL-009**: Tambahkan cron reconcile trusted untuk menutup gap tanpa webhook dan memulihkan transaksi yang tertinggal.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-068 | Tambahkan `runReconcileQrisPaymentsCronJob()` di `src/modules/payments/services.ts` untuk memeriksa transaksi `payment_qris` yang masih pending. |  |  |
| TASK-069 | Pada cron reconcile, refresh status provider untuk invoice `pending` yang belum expired, tandai `expired` atau `canceled` jika provider sudah terminal, dan panggil `finalizePaidQrisTransaction()` bila provider sudah `paid`. |  |  |
| TASK-070 | Pada cron reconcile, retry finalisasi untuk transaksi dengan `payment_provider_status = 'paid'` tetapi `payment_fulfillment_status = 'failed'` atau `not_started`. |  |  |
| TASK-071 | Tambahkan route trusted cron baru `src/app/api/cron/reconcile-qris-payments/route.ts` mengikuti pola existing `expire-subscriptions` route dan `assertTrustedCronRequest()`. |  |  |
| TASK-072 | Tambahkan result type dan logging secukupnya untuk jumlah transaksi yang dicek, difinalisasi, di-expire, di-cancel, dan gagal diproses. |  |  |

### Implementation Phase 10

- **GOAL-010**: Perbarui seluruh surface repo yang hardcoded pada source lama agar source baru `payment_qris` tidak merusak UI dan parsing.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-073 | Extend union source dan parser enum pada `src/modules/console/types.ts`, `src/modules/console/queries.ts`, `src/modules/console/repositories.ts`, `src/modules/subscriptions/repositories.ts`, `src/modules/admin/userlogs/schemas.ts`, `src/modules/admin/userlogs/repositories.ts`, dan `src/modules/admin/users/repositories.ts`. |  |  |
| TASK-074 | Update label source di `src/app/(member)/console/_components/console-history-table/console-history-table.tsx` agar `payment_qris` tampil sebagai label yang benar, misalnya `QRIS Payment`. |  |  |
| TASK-075 | Review apakah `ConsoleHistoryTable` perlu menambah CTA `Lanjutkan Pembayaran` untuk transaksi `payment_qris` berstatus pending agar resume flow lebih ramah. |  |  |
| TASK-076 | Update filter source di admin userlogs toolbar agar `payment_qris` muncul sebagai opsi filter yang valid. |  |  |
| TASK-077 | Review semua test fixture yang mengasumsikan hanya ada tiga source (`payment_dummy`, `cdkey`, `admin_manual`) dan extend fixture tersebut secara aman. |  |  |

### Implementation Phase 11

- **GOAL-011**: Rapikan transisi route lama dan jalur masuk member agar flow baru tidak menyisakan dead-end.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-078 | Pertahankan `src/app/(member)/paymentdummy/page.tsx` sebagai redirect transisi yang aman ke `/checkout` selama masih ada link lama yang hidup. |  |  |
| TASK-079 | Review apakah file legacy `src/app/(member)/paymentdummy/_components/*` masih direferensikan; jika sudah dead sepenuhnya dan aman dihapus, jadwalkan cleanup kecil terpisah agar patch implementasi utama tidak membesar tanpa perlu. |  |  |
| TASK-080 | Pastikan entry point pembelian di `src/app/(member)/console/_components/console-extend-dialog/console-extend-dialog.tsx` tetap mengarah ke `/checkout?packageId=...` dan tidak regress setelah flow payment baru ditambahkan. |  |  |
| TASK-081 | Review `src/modules/ext/repositories.ts` yang mengembalikan `checkoutUrl` agar tetap konsisten dengan flow `checkout -> payment/[transactionId]` dan tidak mengarah ke route legacy. |  |  |

### Implementation Phase 12

- **GOAL-012**: Tambahkan coverage test, browser verification, dan gate verifikasi agar implementasi aman di-ship.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-082 | Tambahkan unit test baru untuk `src/lib/payments/invoiceku.ts` dengan mock `fetch`, termasuk response create, check, cancel, error auth, invalid payload, dan unavailable provider. |  |  |
| TASK-083 | Tambahkan unit test baru untuk `src/modules/payments/services.ts` yang mencakup create invoice baru, reuse pending invoice existing, check status pending, check status paid, cancel invoice, finalization retry, dan handling `503`. |  |  |
| TASK-084 | Extend `tests/unit/modules/subscriptions/services.test.ts` untuk source `payment_qris` dan helper fulfillment generik hasil refactor. |  |  |
| TASK-085 | Extend `tests/unit/modules/transactions/repositories.test.ts` dan `tests/unit/modules/transactions/services.test.ts` agar field payment-specific dan claim finalization baru ter-cover. |  |  |
| TASK-086 | Extend `tests/unit/modules/checkout/services.test.ts` dan `tests/unit/app/member/checkout*.test.ts` agar payment method disabled dan redirect baru ke payment page ter-cover. |  |  |
| TASK-087 | Tambahkan page/UI test baru untuk `src/app/(member)/payment/[transactionId]/*` yang mencakup state pending, expired, canceled, success, dan render QR dari `qris_string`. |  |  |
| TASK-088 | Extend test `console` dan `admin userlogs` agar label/filter source `payment_qris` tidak merusak parser dan UI existing. |  |  |
| TASK-089 | Jalankan `pnpm lint`, `pnpm typecheck`, `pnpm test`, dan `pnpm check:fix`. |  |  |
| TASK-090 | Lakukan browser verification headless untuk flow yang terdampak: pilih package di checkout, lihat `Crypto`/`Card` disabled, submit QRIS, buka payment page, cek countdown, cek dialog cancel, dan verifikasi tidak ada runtime error relevan. |  |  |
| TASK-091 | Scan `.next/dev/logs/*.log` dan next-devtools runtime diagnostics untuk memastikan tidak ada error compile/runtime relevan pada route checkout dan payment. |  |  |

## 3. Alternatives

- **ALT-001**: Memperluas `src/app/(member)/paymentdummy/*` menjadi halaman payment final. Ditolak karena route tersebut sudah memiliki makna transisi dan membawa legacy naming yang tidak layak menjadi source of truth produk.
- **ALT-002**: Menyimpan source vendor-specific seperti `qris_invoiceku` langsung pada `transactions.source` dan `subscriptions.source`. Ditolak karena mencampur concern bisnis dan concern provider, sehingga migrasi provider di masa depan menjadi lebih mahal.
- **ALT-003**: Merender QR dari `qris_image_url` provider. Ditolak karena user sudah memutuskan `qris_string` harus disimpan dan QR harus dirender di app agar lebih independen dari asset remote provider.
- **ALT-004**: Mengaktifkan subscription langsung saat `submitCheckout()` membuat invoice. Ditolak karena ini mengulang bug arsitektur `payment_dummy`, yaitu menyamakan submit checkout dengan payment sukses.
- **ALT-005**: Menghapus pilihan `Crypto` dan `Card` dari UI checkout sepenuhnya. Ditolak karena user meminta kedua metode tetap terlihat sebagai placeholder disabled.
- **ALT-006**: Membuat tabel `payments` baru terpisah dari `transactions`. Ditolak untuk fase ini karena extend `transactions` masih cukup dan lebih kecil risiko migrasinya terhadap read path existing.
- **ALT-007**: Menambah internal REST endpoint baru untuk create/check/cancel payment. Ditolak karena web app internal repo ini mengarahkan mutation UI ke Server Action + Server Component, bukan REST publik baru.

## 4. Dependencies

- **DEP-001**: `docs/api/qris-invoiceku.md` sebagai sumber kontrak API provider yang tersedia saat ini.
- **DEP-002**: `docs/mockup/payment.html` sebagai referensi flow dan struktur visual payment page.
- **DEP-003**: `docs/plans/member-checkout-plan.md` sebagai konteks checkout, voucher, dan snapshot pricing yang sudah selesai lebih dulu.
- **DEP-004**: `src/modules/checkout/*` sebagai source of truth pricing, voucher, dan submit flow member existing.
- **DEP-005**: `src/modules/transactions/*` sebagai rumah tabel transaksi dan audit trail pembelian.
- **DEP-006**: `src/modules/subscriptions/*` sebagai source of truth fulfillment subscription dan assignment assets.
- **DEP-007**: `src/modules/auth/action-client.ts` untuk `memberActionClient` dan `adminActionClient` yang sudah ada.
- **DEP-008**: `src/lib/cron.ts` dan pola route `src/app/api/cron/*` yang sudah ada untuk trusted cron.
- **DEP-009**: Primitive UI existing di `src/components/ui/**` dan shared components yang sudah dipakai checkout.
- **DEP-010**: `next-safe-action`, `react-hook-form`, `zod`, dan React Query yang sudah dipakai repo.
- **DEP-011**: Dependency QR renderer baru di `package.json`, misalnya `qrcode.react`, agar QR bisa dirender dari string lokal.
- **DEP-012**: Dokumen `docs/agent-rules/folder-structure.md`.
- **DEP-013**: Dokumen `docs/agent-rules/ui-ux-rules.md`.

## 5. Files

- **FILE-001**: `docs/plans/feature-member-qris-payment-invoiceku-1.md` - implementation plan ini.
- **FILE-002**: `migrations/054_real_qris_payments.sql` - migration source baru, kolom payment-specific transaksi, dan constraint/index terkait.
- **FILE-003**: `package.json` - dependency QR renderer bila diputuskan memakai package baru.
- **FILE-004**: `src/config/env.server.ts` - environment variable InvoiceKu.
- **FILE-005**: `src/lib/payments/invoiceku.ts` - adapter teknis request/response provider.
- **FILE-006**: `src/modules/transactions/types.ts` - contract transaksi dengan field payment baru.
- **FILE-007**: `src/modules/transactions/repositories.ts` - persist dan update lifecycle payment-specific.
- **FILE-008**: `src/modules/transactions/services.ts` - helper transaksi baru bila dibutuhkan untuk update payment lifecycle.
- **FILE-009**: `src/modules/payments/types.ts` - type domain payment baru.
- **FILE-010**: `src/modules/payments/schemas.ts` - schema action/input domain payment baru.
- **FILE-011**: `src/modules/payments/repositories.ts` - read model payment dan candidate reconcile query.
- **FILE-012**: `src/modules/payments/queries.ts` - data loader payment page member.
- **FILE-013**: `src/modules/payments/services.ts` - create invoice, check status, cancel, finalization, dan cron reconcile.
- **FILE-014**: `src/modules/payments/actions.ts` - server actions payment member.
- **FILE-015**: `src/modules/subscriptions/types.ts` - source union `payment_qris` dan helper input fulfillment.
- **FILE-016**: `src/modules/subscriptions/schemas.ts` - schema/union source yang relevan dengan QRIS.
- **FILE-017**: `src/modules/subscriptions/services.ts` - refactor helper fulfillment generik dan source `payment_qris`.
- **FILE-018**: `src/modules/checkout/types.ts` - result redirect baru dan error `payment-method-unavailable`.
- **FILE-019**: `src/modules/checkout/schemas.ts` - validasi submit checkout yang tetap typed untuk method disabled.
- **FILE-020**: `src/modules/checkout/services.ts` - branch create invoice QRIS dan reject non-QRIS.
- **FILE-021**: `src/modules/checkout/actions.ts` - submit action result baru.
- **FILE-022**: `src/app/(member)/checkout/_components/checkout-page.tsx` - disabled state `Crypto`/`Card` dan redirect ke payment page.
- **FILE-023**: `src/app/(member)/payment/[transactionId]/page.tsx` - route server payment member.
- **FILE-024**: `src/app/(member)/payment/[transactionId]/_components/**` - UI payment page route-local.
- **FILE-025**: `src/app/api/cron/reconcile-qris-payments/route.ts` - trusted cron payment reconcile.
- **FILE-026**: `src/modules/console/types.ts` - source union `payment_qris` untuk console history.
- **FILE-027**: `src/modules/console/queries.ts` - parser source baru untuk console snapshot.
- **FILE-028**: `src/app/(member)/console/_components/console-history-table/console-history-table.tsx` - label source baru dan optional resume CTA.
- **FILE-029**: `src/modules/admin/userlogs/schemas.ts` - filter source baru untuk admin.
- **FILE-030**: `src/modules/admin/userlogs/repositories.ts` - parser source baru untuk admin userlogs.
- **FILE-031**: `src/app/(admin)/admin/userlogs/_components/transactions-table/transactions-toolbar.tsx` - opsi filter source `payment_qris`.
- **FILE-032**: `src/modules/admin/users/repositories.ts` - parser source baru bila summary admin user membaca transaksi.
- **FILE-033**: `src/app/(member)/paymentdummy/page.tsx` - route compatibility transisi.
- **FILE-034**: `tests/unit/modules/payments/*.test.ts` - test domain payment baru.
- **FILE-035**: `tests/unit/modules/transactions/*.test.ts` - test lifecycle payment-specific transaksi.
- **FILE-036**: `tests/unit/modules/subscriptions/*.test.ts` - test helper fulfillment generik dan source baru.
- **FILE-037**: `tests/unit/modules/checkout/*.test.ts` - test submit checkout QRIS dan disable method.
- **FILE-038**: `tests/unit/app/member/payment*.test.ts` - test page/UI payment member baru.
- **FILE-039**: `tests/unit/app/member/console*.test.ts` - update UI source/payment resume bila terkena dampak.
- **FILE-040**: `tests/unit/modules/admin/userlogs/*.test.ts` - update filter/parser source baru.

## 6. Testing

- **TEST-001**: Migration berhasil menambah source `payment_qris` dan kolom payment-specific tanpa merusak row legacy existing.
- **TEST-002**: Adapter InvoiceKu berhasil mem-parse response create invoice sukses dari docs provider.
- **TEST-003**: Adapter InvoiceKu berhasil mem-parse response check status `paid` dari docs provider.
- **TEST-004**: Adapter InvoiceKu berhasil mem-parse response cancel invoice sukses dari docs provider.
- **TEST-005**: Adapter InvoiceKu mengembalikan error stabil saat provider mengembalikan `401`.
- **TEST-006**: Adapter InvoiceKu mengembalikan error non-terminal saat provider mengembalikan `503`.
- **TEST-007**: `createQrisPaymentForCheckout()` membuat transaksi pending baru dan menyimpan `provider_invoice_id`, `qris_string`, `payment_fee_amount_rp`, dan `provider_expired_at` saat create invoice sukses.
- **TEST-008**: `createQrisPaymentForCheckout()` me-reuse transaksi pending yang existing untuk quote yang sama bila invoice lama masih valid.
- **TEST-009**: `createQrisPaymentForCheckout()` tidak meninggalkan transaksi success palsu saat create invoice provider gagal.
- **TEST-010**: `checkMemberQrisPaymentStatus()` tidak mengaktifkan subscription ketika provider masih `pending`.
- **TEST-011**: `checkMemberQrisPaymentStatus()` mengaktifkan subscription tepat satu kali ketika provider berubah menjadi `paid`.
- **TEST-012**: `checkMemberQrisPaymentStatus()` aman terhadap double click dan polling paralel berkat claim atomik finalization.
- **TEST-013**: `cancelMemberQrisPayment()` menolak cancel untuk transaksi yang bukan milik user aktif.
- **TEST-014**: `cancelMemberQrisPayment()` menolak cancel untuk transaksi yang sudah terminal.
- **TEST-015**: `cancelMemberQrisPayment()` menandai transaksi lokal `canceled` saat cancel provider sukses.
- **TEST-016**: `finalizePaidQrisTransaction()` meng-consume voucher tepat satu kali hanya setelah fulfillment sukses.
- **TEST-017**: `finalizePaidQrisTransaction()` menyimpan `payment_fulfillment_status = 'failed'` dan tetap retriable bila fulfillment gagal setelah provider `paid`.
- **TEST-018**: `submitCheckout()` branch QRIS mengembalikan redirect ke `/payment/[transactionId]`.
- **TEST-019**: `submitCheckout()` branch `crypto` dan `card` mengembalikan error `payment-method-unavailable`.
- **TEST-020**: UI checkout menampilkan `Crypto` dan `Card` dalam kondisi disabled dan tidak selectable.
- **TEST-021**: Payment page merender QR dari `qris_string`, bukan dari remote image URL.
- **TEST-022**: Payment page menampilkan countdown expiry yang benar dari `provider_expired_at`.
- **TEST-023**: Payment page menampilkan state expired overlay ketika invoice melewati expiry.
- **TEST-024**: Payment page menampilkan success flow yang benar saat transaksi sudah `success`.
- **TEST-025**: Console history dan admin userlogs mengenali source `payment_qris` tanpa parser error.
- **TEST-026**: Trusted cron reconcile dapat memfinalisasi transaksi `paid` yang tertinggal tanpa membuat aktivasi ganda.
- **TEST-027**: `pnpm lint` hijau.
- **TEST-028**: `pnpm typecheck` hijau.
- **TEST-029**: `pnpm test` hijau.
- **TEST-030**: `pnpm check:fix` hijau.
- **TEST-031**: Browser verification headless menunjukkan flow checkout dan payment tanpa runtime error relevan.
- **TEST-032**: next-devtools runtime diagnostics dan scan `.next/dev/logs/*.log` tidak menunjukkan error compile/runtime relevan pada route checkout dan payment.

## 7. Risks & Assumptions

- **RISK-001**: Docs provider yang tersedia belum menunjukkan webhook atau sandbox secara jelas, sehingga finalisasi fase awal harus mengandalkan polling/manual refresh + cron.
- **RISK-002**: `amount_total` provider dapat berbeda dari quote checkout karena adanya biaya admin provider, sehingga UI dan histori harus jelas membedakan fee tambahan dari diskon/voucher internal.
- **RISK-003**: Menambah source `payment_qris` menyentuh banyak parser, union, dan test fixture lama yang saat ini mengasumsikan hanya tiga source.
- **RISK-004**: Jika fulfillment gagal setelah provider sudah `paid`, dibutuhkan retry path yang benar-benar idempotent agar user tidak kehilangan pembayaran atau menerima double access.
- **RISK-005**: Reuse pending invoice yang terlalu agresif bisa membingungkan jika user mengubah voucher atau pilihan quote; implementasi reuse harus cukup ketat terhadap signature quote yang sama.
- **RISK-006**: Cron reconcile tanpa rate limit yang hati-hati dapat menambah load ke provider bila transaksi pending menumpuk.
- **ASSUMPTION-001**: Endpoint provider yang saat ini tersedia hanyalah `POST /invoice`, `GET /invoice/{invoice_id}`, dan `POST /invoice/{invoice_id}/cancel` seperti di `docs/api/qris-invoiceku.md`.
- **ASSUMPTION-002**: `expired_at` dari provider adalah source of truth expiry invoice yang dipakai UI countdown dan terminal status invoice.
- **ASSUMPTION-003**: `status` provider minimal mengikuti shape docs saat ini: `pending`, `paid`, atau `failed`/terminal setara.
- **ASSUMPTION-004**: User aktif untuk checkout selalu memiliki data profil minimum yang cukup untuk mengirim `customer_name` dan `email` ke provider.
- **ASSUMPTION-005**: `paymentdummy` sudah bukan source of truth produk, sehingga flow baru tidak perlu membangun UI baru di route itu.
- **ASSUMPTION-006**: Fase ini belum mencakup payment method `crypto` atau `card` riil; keduanya hanya placeholder disabled.
- **ASSUMPTION-007**: Fase ini belum mencakup admin UI khusus untuk rekonsiliasi payment manual, selain log/history yang existing.

## 8. Related Specifications / Further Reading

- `docs/api/qris-invoiceku.md`
- `docs/mockup/payment.html`
- `docs/plans/member-checkout-plan.md`
- `docs/agent-rules/folder-structure.md`
- `docs/agent-rules/ui-ux-rules.md`
- `src/modules/checkout/services.ts`
- `src/modules/subscriptions/services.ts`
- `src/modules/transactions/repositories.ts`
