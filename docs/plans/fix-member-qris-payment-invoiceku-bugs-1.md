---
goal: Fix all remaining QRIS payment bugs for member checkout and payment flow, align runtime behavior with real InvoiceKu integration, and rebuild payment UI to match the approved mockup
version: 1.0
date_created: 2026-05-23
last_updated: 2026-05-23
owner: OpenCode
status: Planned
tags: [bugfix, payments, qris, invoiceku, checkout, member, ui, runtime]
---

# Introduction

Dokumen ini adalah breakdown plan untuk member QRIS payment fix pass setelah implementasi awal terbukti masih memiliki bug penting di runtime nyata. Fokus dokumen ini bukan menambah scope baru, tetapi menutup seluruh gap antara implementasi saat ini dengan rencana awal yang sudah disepakati:

- checkout QRIS harus benar-benar bisa membuat invoice riil
- env real InvoiceKu harus benar-benar terbaca dan bekerja
- payment page harus visualnya setia ke `docs/mockup/payment.html`
- state lifecycle payment harus konsisten, retry-safe, dan idempotent
- seluruh flow `console -> checkout -> payment/[transactionId] -> paid -> fulfillment -> console` harus lolos verifikasi browser manual

## 1. Audit Summary

### Finding A: Checkout QRIS masih bisa gagal dengan error generik

- `next-safe-action` masih mengubah exception server tertentu menjadi `Unexpected server error.`
- layer checkout belum cukup membungkus error provider, error schema backend, dan error response parser menjadi result domain yang stabil

### Finding B: QRIS flow masih sangat sensitif terhadap kesiapan backend aktif

- implementasi sekarang menulis kolom payment-specific baru pada `transactions`
- jika backend aktif belum sinkron dengan migration `054_real_qris_payments.sql`, checkout akan gagal sebelum user melihat payment page
- menambah `.env.local` saja tidak menyelesaikan mismatch schema backend

### Finding C: Integrasi InvoiceKu masih terlalu brittle untuk response real

- adapter saat ini mengasumsikan shape response yang sempit
- perbedaan kecil pada `status`, `paid_at`, `expired_at`, atau field optional dapat membuat parser gagal total
- belum ada diagnostic handling yang cukup jelas untuk auth error, malformed response, provider unavailable, atau drift response shape

### Finding D: Lifecycle transaksi QRIS belum sepenuhnya sesuai rencana awal

- create flow, check status flow, dan reconcile flow masih punya area yang mencampur terminal dan non-terminal error
- state `provider paid` vs `fulfillment failed retryable` belum dibedakan dengan jelas di UI maupun domain

### Finding E: Payment page visual belum mengikuti mockup yang disetujui

- komposisi section, spacing, visual hierarchy, modal cancel, dan state terminal masih drift dari `docs/mockup/payment.html`
- page masih terasa seperti hasil patch bertahap, bukan halaman final yang dibangun dari mockup sebagai source of truth visual

## 2. Non-Negotiable Fix Targets

- **FIX-001**: Submit checkout QRIS harus berhasil membuat invoice riil bila backend schema dan env sudah benar.
- **FIX-002**: Jika backend schema atau env belum siap, UI checkout harus menampilkan error yang jelas, bukan generic server error.
- **FIX-003**: Adapter InvoiceKu harus tahan terhadap variasi response real yang masuk akal tanpa mengorbankan validasi.
- **FIX-004**: Payment lifecycle harus membedakan state `pending`, `paid-processing`, `success`, `expired`, `canceled`, dan `failed` secara eksplisit.
- **FIX-005**: Payment page harus dibangun ulang agar struktur visual utamanya setia ke mockup.
- **FIX-006**: Terminal states tidak boleh lagi memakai heading dan layout yang masih terasa pending.
- **FIX-007**: Browser verification manual harus terdokumentasi dan lolos sebelum pekerjaan dianggap selesai.

## 3. Implementation Phases

### Phase 0: Runtime Readiness Audit

- **GOAL-000**: Pastikan backend aktif dan runtime server benar-benar siap menerima flow QRIS.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-000 | Verifikasi backend aktif sudah memiliki enum `payment_qris` pada `public.source_enum`. |  |  |
| TASK-001 | Verifikasi backend aktif sudah memiliki seluruh kolom payment-specific pada `public.transactions`. |  |  |
| TASK-002 | Verifikasi backend aktif sudah memiliki index dan constraint QRIS dari migration `054_real_qris_payments.sql`. |  |  |
| TASK-003 | Verifikasi runtime Next.js benar-benar membaca `INVOICEKU_API_KEY` dan `INVOICEKU_BASE_URL` setelah restart server. |  |  |
| TASK-004 | Tambahkan diagnostic helper atau logging server-side yang cukup untuk membedakan error env, schema, auth, provider, dan parser. |  |  |

### Phase 1: Checkout QRIS Reliability

- **GOAL-001**: Hilangkan generic checkout failure dan ubah menjadi domain error yang jelas dan stabil.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-005 | Refactor `src/modules/checkout/services.ts` agar error create payment dipetakan menjadi result domain stabil. |  |  |
| TASK-006 | Tangani error backend schema belum siap dengan pesan yang eksplisit dan actionable. |  |  |
| TASK-007 | Tangani provider auth error, unavailable provider, dan invalid response dengan pesan yang jelas. |  |  |
| TASK-008 | Pastikan checkout UI tidak lagi hanya menampilkan `Unexpected server error.` pada jalur bug yang bisa dijelaskan. |  |  |

### Phase 2: InvoiceKu Adapter Hardening

- **GOAL-002**: Sesuaikan adapter dengan runtime real InvoiceKu, bukan hanya docs ideal.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-009 | Audit response real `POST /invoice`, `GET /invoice/{id}`, dan `POST /invoice/{id}/cancel`. |  |  |
| TASK-010 | Perluas parser tanggal dan field optional di `src/lib/payments/invoiceku.ts` bila response real membutuhkannya. |  |  |
| TASK-011 | Rapikan mapping error provider agar 401, 404, 422/400, 503, dan malformed response bisa dibedakan. |  |  |
| TASK-012 | Tambahkan logging aman tanpa membocorkan secret agar debugging runtime berikutnya lebih cepat. |  |  |

### Phase 3: Payment Lifecycle Semantics

- **GOAL-003**: Rapikan lifecycle transaksi QRIS agar retry-safe, idempotent, dan sesuai rencana awal.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-013 | Review create flow `createQrisPaymentForCheckout()` agar error transient tidak salah ditandai terminal. |  |  |
| TASK-014 | Rapikan semantics `payment_provider_status` dan `payment_fulfillment_status` untuk jalur `paid but not yet fulfilled`. |  |  |
| TASK-015 | Pastikan `checkMemberQrisPaymentStatus()` tidak mengembalikan `ok: true` untuk state terminal negatif yang seharusnya treated as failure state. |  |  |
| TASK-016 | Pastikan `runReconcileQrisPaymentsCronJob()` menangani retry finalization dan provider error dengan aman. |  |  |
| TASK-017 | Tambahkan state domain eksplisit untuk kasus `provider paid + fulfillment failed retryable`. |  |  |

### Phase 4: Payment Page Rebuild to Mockup

- **GOAL-004**: Bangun ulang page payment agar visual final sesuai `docs/mockup/payment.html`.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-018 | Rebuild layout utama payment page menjadi shell sempit satu card seperti mockup. |  |  |
| TASK-019 | Samakan struktur visual header, amount, QR block, instruction card, dan actions dengan mockup. |  |  |
| TASK-020 | Rebuild modal cancel agar visual hierarchy lebih dekat ke modal mockup. |  |  |
| TASK-021 | Kurangi elemen tambahan yang tidak perlu atau pindahkan menjadi secondary affordance yang tidak mengganggu visual mockup. |  |  |
| TASK-022 | Pastikan page responsif dan tetap konsisten pada mobile seperti mockup. |  |  |

### Phase 5: Terminal State UX Cleanup

- **GOAL-005**: Pastikan success/expired/canceled/failed tidak lagi terasa seperti state pending.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-023 | Ubah heading, copy, dan CTA utama untuk state success. |  |  |
| TASK-024 | Tambahkan expired visual treatment yang jelas pada countdown dan QR overlay. |  |  |
| TASK-025 | Tambahkan canceled visual treatment yang jelas dan non-interactive. |  |  |
| TASK-026 | Tambahkan failed visual treatment yang jelas dan recovery path ke checkout. |  |  |
| TASK-027 | Tambahkan processing visual treatment untuk `uang sudah diterima, akses sedang diselesaikan`. |  |  |

### Phase 6: Surface Integration Cleanup

- **GOAL-006**: Pastikan seluruh surface member/admin yang terdampak tetap konsisten setelah fix QRIS.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-028 | Review `console` history agar source `payment_qris` dan CTA resume pending tetap benar setelah lifecycle diperbaiki. |  |  |
| TASK-029 | Review admin userlogs source/status labels agar tetap konsisten dengan lifecycle final. |  |  |
| TASK-030 | Review copy yang masih menyebut `payment dummy` di surface user-facing yang seharusnya sudah pindah ke checkout/payment riil. |  |  |

### Phase 7: Verification and Hard Gates

- **GOAL-007**: Tutup pekerjaan hanya setelah semua gate dan checklist browser lolos.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-031 | Jalankan `pnpm check:fix`. |  |  |
| TASK-032 | Jalankan `pnpm lint`. |  |  |
| TASK-033 | Jalankan `pnpm typecheck`. |  |  |
| TASK-034 | Jalankan `pnpm test`. |  |  |
| TASK-035 | Verifikasi browser untuk flow checkout -> payment -> paid/cancel/expired. |  |  |
| TASK-036 | Scan `.next/dev/logs/*.log` dan pastikan tidak ada error runtime relevan yang tersisa. |  |  |

## 4. Manual Browser Checklist

### A. Checkout Entry

- [ ] Login sebagai member
- [ ] Buka `/console`
- [ ] Klik `Perpanjang langganan`
- [ ] Pilih package lalu lanjut ke checkout
- [ ] URL menjadi `/checkout?packageId=...`

### B. Checkout Payment Method

- [ ] `QRIS` aktif secara default
- [ ] `Crypto` tampil disabled
- [ ] `Card` tampil disabled
- [ ] Copy helper menjelaskan hanya QRIS yang tersedia saat ini

### C. Create Invoice QRIS

- [ ] Klik `Pay Now`
- [ ] Tidak muncul `Unexpected server error.`
- [ ] Jika gagal, pesan error yang tampil spesifik dan mudah dipahami
- [ ] Jika sukses, user diarahkan ke `/payment/[transactionId]`

### D. Payment Pending Page

- [ ] Visual shell sempit satu card seperti mockup
- [ ] Header menampilkan package name dan invoice id
- [ ] Countdown tampil jelas
- [ ] Total tagihan final tampil jelas
- [ ] QR code tampil dari `qris_string`
- [ ] Instruction block tampil seperti mockup
- [ ] Tombol `Cek Status Pembayaran` tampil sebagai CTA utama
- [ ] Tombol `Batalkan Transaksi` tampil sebagai CTA sekunder

### E. Cancel Flow

- [ ] Klik `Batalkan Transaksi`
- [ ] Modal confirm tampil dengan visual yang rapi dan sesuai intent
- [ ] Klik `Tidak` menutup modal tanpa mengubah state
- [ ] Klik `Ya, Batalkan` membatalkan transaksi
- [ ] QR menjadi tidak usable lagi
- [ ] State page berubah jelas ke canceled

### F. Paid Flow

- [ ] Lakukan atau simulasikan pembayaran sukses
- [ ] Klik `Cek Status Pembayaran`
- [ ] Page berubah ke processing atau success sesuai lifecycle final
- [ ] Jika success, heading/copy tidak lagi terasa pending
- [ ] CTA utama mengarah ke console
- [ ] Kembali ke console dan pastikan subscription benar-benar aktif

### G. Expired / Failed Flow

- [ ] Buka transaksi expired dan pastikan QR overlay expired jelas
- [ ] Buka transaksi failed dan pastikan recovery path ke checkout jelas
- [ ] Tidak ada action misleading pada state terminal

### H. Regression Surface

- [ ] Console history tetap render transaksi lama
- [ ] Pending `payment_qris` bisa dilanjutkan dari history bila relevan
- [ ] Admin userlogs filter source tetap bekerja
- [ ] Route legacy `/paymentdummy` tetap redirect aman

## 5. Acceptance Criteria

- **ACC-001**: User bisa membuat invoice QRIS riil dari checkout tanpa generic server error.
- **ACC-002**: Error env/schema/provider yang umum punya pesan yang jelas dan dapat dibedakan.
- **ACC-003**: Payment page visual final dekat secara struktur dan hierarchy dengan `docs/mockup/payment.html`.
- **ACC-004**: State payment pending, processing, success, expired, canceled, dan failed semua jelas secara visual dan behavioral.
- **ACC-005**: Flow paid tidak membuat aktivasi ganda dan tetap idempotent saat check status dipicu berulang.
- **ACC-006**: Semua gate teknis (`check:fix`, `lint`, `typecheck`, `test`, browser verification) hijau.

## 6. Implementation Approval Note

Jika plan ini disetujui, implementasi berikutnya harus dilakukan end-to-end dalam urutan fase di atas, dengan prioritas awal pada:

1. runtime/backend readiness
2. checkout/provider hardening
3. rebuild UI payment sesuai mockup
4. final browser verification dengan flow nyata
