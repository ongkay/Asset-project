---
goal: Implement admin package checkout metadata management and admin voucher management end-to-end
version: 1.0
date_created: 2026-05-21
last_updated: 2026-05-21
owner: OpenCode
status: Planned
tags: [feature, admin, checkout, packages, vouchers, pricing, catalog]
---

# Introduction

![Status: Planned](https://img.shields.io/badge/status-Planned-blue)

Dokumen ini adalah implementation plan end-to-end untuk menjadikan admin dashboard sebagai source of truth operasional bagi katalog checkout member dan voucher diskon. Scope plan ini mencakup upgrade halaman admin package agar dapat mengelola metadata checkout (`list_amount_rp`, `amount_rp`, `checkout_group`, `sort_order`) dan penambahan halaman admin voucher untuk CRUD, filter, dan aktivasi voucher. Plan ini juga menghapus jalur operasional package `legacy` untuk package baru, sambil tetap menjaga histori data lama tetap aman melalui status archived/inactive dan penyembunyian dari default admin view.

## 1. Requirements & Constraints

- **REQ-001**: Admin dashboard harus dapat mengelola metadata checkout package langsung dari UI tanpa SQL manual.
- **REQ-002**: Halaman admin voucher harus mendukung create, read, update, dan toggle active untuk voucher diskon.
- **REQ-003**: Semua package baru wajib memiliki `checkoutGroup` final yang valid dan tidak boleh lagi memakai fallback `legacy`.
- **REQ-004**: Kode voucher boleh diedit setelah voucher dibuat, selama tetap unik secara global.
- **REQ-005**: Voucher yang sudah expired tetap boleh diedit dari halaman admin.
- **REQ-006**: Admin harus dapat memilih scope voucher `global` atau `package` dengan package target yang valid.
- **REQ-007**: Halaman admin package harus menampilkan pricing checkout dengan breakdown yang mudah diaudit, termasuk harga asli, harga jual, dan diskon package.
- **REQ-008**: Package lama harus keluar dari flow operasional baru dan tidak boleh menjadi source of truth checkout baru.
- **REQ-009**: Package lama tidak boleh di-hard-delete jika masih direferensikan histori subscription, transaction, cd-key, atau voucher.
- **REQ-010**: Default admin list package harus fokus pada package checkout aktif/relevan; package lama hanya boleh terlihat lewat filter archived jika disediakan.
- **REQ-011**: UI/UX admin package dan voucher wajib konsisten dengan pola visual admin existing, terutama referensi `src/app/(admin)/admin/assets/*` dan `src/app/(admin)/admin/package/*`.
- **REQ-012**: Semua mutation admin harus berjalan server-side melalui `next-safe-action`.
- **SEC-001**: Validasi akhir package checkout dan voucher harus menjadi source of truth server-side.
- **SEC-002**: Voucher package-scope tidak boleh menunjuk package yang invalid atau tidak cocok dengan rule domain.
- **SEC-003**: Input admin harus divalidasi dengan Zod dan mengembalikan pesan error stabil.
- **SEC-004**: Histori transaksi existing tidak boleh rusak akibat pembersihan package lama.
- **SEC-005**: Package archived/inactive tidak boleh muncul di checkout member baru.
- **CON-001**: Implementasi harus mengikuti `docs/agent-rules/folder-structure.md`.
- **CON-002**: `src/app/**` harus tetap tipis; business logic domain utama wajib tetap di `src/modules/**`.
- **CON-003**: Layer `src/modules/admin/**` hanya boleh menjadi read model, filter, pagination, dan admin action layer; tidak boleh menduplikasi business logic inti.
- **CON-004**: Form admin harus memakai `react-hook-form` + `zod`.
- **CON-005**: Tidak boleh menambah fondasi UI baru di luar Tailwind + primitive UI existing.
- **CON-006**: Gunakan `pnpm` untuk semua command verifikasi.
- **GUD-001**: Semua input form baru harus memiliki icon di sebelah kiri.
- **GUD-002**: Table admin baru harus memiliki search, filter, pagination, dan view column persistence bila pola page tersebut memang sudah memakainya.
- **GUD-003**: Copy admin harus operasional, singkat, dan tidak terasa seperti template demo.
- **PAT-001**: Domain utama `packages` dan `vouchers` harus menjadi source of truth inti untuk rule create/update/toggle.
- **PAT-002**: Admin voucher page harus mengikuti pola existing page server route + client shell + query/action modules.
- **PAT-003**: “Menghapus package lama” diimplementasikan sebagai archive/inactive-by-default, bukan hard delete row database.

## 2. Implementation Steps

### Implementation Phase 0

- **GOAL-000**: Bekukan keputusan produk, nama filter, dan definisi archive agar seluruh phase implementasi berikutnya deterministic.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-000 | Tetapkan bahwa package baru wajib memakai `checkout_group` final yang valid, minimal `semi-private` atau `full-private`, dan create flow tidak lagi membuat package `legacy`. |  |  |
| TASK-001 | Tetapkan bahwa package lama tidak di-hard-delete; package lama hanya dikeluarkan dari operasional baru lewat `is_active = false` dan/atau filter archived di admin. |  |  |
| TASK-002 | Tetapkan bahwa default admin package table hanya menampilkan package checkout yang relevan, dan package archived hanya muncul jika filter explicit dipilih. |  |  |
| TASK-003 | Tetapkan bahwa voucher code tetap editable pada edit dialog, dengan unique constraint database sebagai guard final. |  |  |
| TASK-004 | Tetapkan bahwa voucher expired tetap editable dan admin boleh mengubah code, expiry, active state, atau scope selama input valid. |  |  |

### Implementation Phase 1

- **GOAL-001**: Perluas kontrak domain `packages` agar admin dapat mengelola checkout metadata tanpa fallback legacy implisit.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-005 | Extend `src/modules/packages/types.ts` untuk menambahkan `checkoutGroup`, `listAmountRp`, dan `sortOrder` ke `PackageEditorData`, `PackageAdminRow`, dan `PackageFormInput` yang dipakai admin. |  |  |
| TASK-006 | Tambahkan type eksplisit untuk nilai `checkoutGroup` admin package, misalnya union literal yang memuat `semi-private` dan `full-private`, agar create/update tidak menerima nilai bebas. |  |  |
| TASK-007 | Extend `src/modules/packages/schemas.ts` agar `packageFormSchema` memvalidasi `listAmountRp`, `checkoutGroup`, dan `sortOrder`, serta memastikan `listAmountRp >= amountRp`. |  |  |
| TASK-008 | Tambahkan helper atau mapping turunan di `src/modules/packages/types.ts` atau `services.ts` untuk menghitung `packageDiscountAmountRp` dan `packageDiscountPercent` secara reusable. |  |  |
| TASK-009 | Update `src/modules/packages/repositories.ts` agar `getPackageEditorData()` mengembalikan field checkout baru dan create/update row menerima input checkout lengkap. |  |  |
| TASK-010 | Hapus fallback create package `checkoutGroup: 'legacy'`, `listAmountRp: amountRp`, dan `sortOrder: 0` yang saat ini ada di `src/modules/packages/services.ts`, lalu ganti dengan input wajib dari form admin. |  |  |
| TASK-011 | Pastikan `updatePackage()` tetap mempertahankan backward compatibility data lama yang sedang diedit, tetapi tidak membiarkan save baru tanpa `checkoutGroup` valid. |  |  |

### Implementation Phase 2

- **GOAL-002**: Tambahkan strategi archive package lama yang aman terhadap histori data existing.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-012 | Audit relasi package existing terhadap `subscriptions`, `transactions`, `cd_keys`, dan `discount_vouchers`, lalu dokumentasikan bahwa package lama tidak boleh di-hard-delete karena foreign key `on delete restrict`. |  |  |
| TASK-013 | Tambahkan migration baru untuk menormalkan package non-checkout lama menjadi archived/inactive secara eksplisit bila masih ada package dengan `checkout_group = 'legacy'` atau package lama aktif di luar enam katalog checkout. |  |  |
| TASK-014 | Di migration yang sama, pastikan create/update operasional baru tidak lagi membutuhkan atau mengandalkan nilai `legacy` untuk package baru. |  |  |
| TASK-015 | Jika dibutuhkan, tambahkan filter/search helper admin package yang dapat membedakan `active checkout`, `inactive checkout`, dan `archived legacy` tanpa mengubah shape histori transaction/subscription. |  |  |
| TASK-016 | Review `src/modules/ext/repositories.ts` yang masih mengembalikan `checkoutUrl: '/paymentdummy?packageId=...'` dan catat follow-up apakah admin catalog cleanup perlu sekaligus mengarahkannya ke `/checkout?packageId=...`. |  |  |

### Implementation Phase 3

- **GOAL-003**: Upgrade layer admin package agar katalog checkout dapat dikelola langsung dari UI dengan filter yang jelas.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-017 | Extend `src/modules/admin/packages/types.ts` untuk menambah filter admin package yang relevan dengan checkout, misalnya `group` dan `lifecycle`. |  |  |
| TASK-018 | Extend `src/modules/admin/packages/schemas.ts` agar search params dan safe-action filter schema mendukung filter `checkoutGroup` dan archived lifecycle. |  |  |
| TASK-019 | Update `src/modules/admin/packages/queries.ts` agar row admin package membawa field `listAmountRp`, `checkoutGroup`, `sortOrder`, `packageDiscountAmountRp`, dan `packageDiscountPercent`. |  |  |
| TASK-020 | Update `src/app/(admin)/admin/package/page.tsx` dan route-local query helper agar filter baru ikut di-load dari URL dan React Query key. |  |  |
| TASK-021 | Update `src/app/(admin)/admin/package/_components/package-table/package-table-columns.tsx` untuk menampilkan harga asli, harga jual, diskon package, checkout group, dan lifecycle/status yang lebih informatif. |  |  |
| TASK-022 | Update toolbar/filter bar package admin agar admin bisa memfilter berdasarkan group checkout dan archived lifecycle tanpa membebani default view. |  |  |
| TASK-023 | Update KPI cards pada `src/app/(admin)/admin/package/_components/package-page.tsx` agar lebih relevan dengan katalog checkout, misalnya total package checkout, active checkout package, archived package, dan active uses. |  |  |
| TASK-024 | Update `package-form-dialog` route-local components agar form create/edit package memuat field `listAmountRp`, `amountRp`, `checkoutGroup`, dan `sortOrder` dengan icon kiri dan helper text operasional. |  |  |
| TASK-025 | Update `package-table-row-actions.tsx` bila perlu untuk menambah tindakan yang relevan dengan archive/inactive state, tetapi hindari destructive hard delete. |  |  |

### Implementation Phase 4

- **GOAL-004**: Lengkapi domain utama `vouchers` agar siap dipakai admin CRUD, bukan hanya checkout validation.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-026 | Extend `src/modules/vouchers/types.ts` untuk menambah input type create voucher, update voucher, toggle voucher active, admin list row, dan admin table result jika memang dibutuhkan di domain utama. |  |  |
| TASK-027 | Extend `src/modules/vouchers/schemas.ts` dengan schema create/update voucher yang final untuk admin, termasuk `code`, `scopeType`, `packageId`, `discountPercent`, `maxUses`, `expiresAt`, dan `isActive`. |  |  |
| TASK-028 | Implementasikan repository baru di `src/modules/vouchers/repositories.ts` untuk list vouchers, get voucher by id, create voucher, update voucher, dan toggle voucher active. |  |  |
| TASK-029 | Pastikan list repository voucher mendukung filter `search`, `scope`, `status`, dan expiry state yang dibutuhkan admin page. |  |  |
| TASK-030 | Implementasikan service baru di `src/modules/vouchers/services.ts` untuk `createVoucher`, `updateVoucher`, `toggleVoucherActive`, dan read helper admin lain, sambil mempertahankan `validateVoucherForPackage()` dan `consumeVoucherUsage()` existing. |  |  |
| TASK-031 | Pada service voucher, validasikan bahwa scope `package` wajib memiliki `packageId` checkout yang valid, sedangkan scope `global` wajib menyimpan `packageId = null`. |  |  |
| TASK-032 | Pada service voucher, biarkan voucher expired tetap bisa di-update tanpa mem-bypass validasi shape data atau unique code. |  |  |
| TASK-033 | Pada service voucher, pastikan edit code voucher akan gagal dengan pesan jelas jika code baru bentrok dengan voucher lain. |  |  |

### Implementation Phase 5

- **GOAL-005**: Tambahkan admin voucher module sebagai read model dan action layer yang terpisah dari business logic inti.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-034 | Buat `src/modules/admin/vouchers/types.ts` untuk filter table, row view model, dialog prefill, dan table page result. |  |  |
| TASK-035 | Buat `src/modules/admin/vouchers/schemas.ts` untuk filter search params, load action input, detail input, dan dialog bootstrap input yang diperlukan halaman admin voucher. |  |  |
| TASK-036 | Buat `src/modules/admin/vouchers/queries.ts` yang memanggil domain `vouchers` dan `packages` untuk membangun table page, package options, dan edit prefill. |  |  |
| TASK-037 | Buat `src/modules/admin/vouchers/actions.ts` menggunakan `adminActionClient` untuk load table page, load voucher detail/editor data, create voucher, update voucher, dan toggle active. |  |  |
| TASK-038 | Pastikan semua admin voucher actions mengembalikan pesan stabil seperti pola `src/modules/admin/cdkeys/actions.ts` dan tidak membocorkan detail exception mentah ke UI. |  |  |

### Implementation Phase 6

- **GOAL-006**: Bangun route dan UI baru `/admin/voucher` yang konsisten dengan shell admin existing.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-039 | Tambahkan entry navigation baru ke `src/app/(admin)/_components/admin-shell/admin-shell-config.ts` untuk route `/admin/voucher`, breadcrumb label, dan quick create item bila sesuai pola shell existing. |  |  |
| TASK-040 | Buat route server `src/app/(admin)/admin/voucher/page.tsx` yang memanggil `requireAdminShellAccess()`, parse search params, load table page dari `src/modules/admin/vouchers/queries.ts`, dan merender client page tipis. |  |  |
| TASK-041 | Buat route-local page shell `src/app/(admin)/admin/voucher/_components/voucher-page.tsx` mengikuti pola `package-page.tsx` dan `cdkey-page.tsx`. |  |  |
| TASK-042 | Buat voucher query helper client, state hook, table columns, toolbar, filter bar, dan row actions di `src/app/(admin)/admin/voucher/_components/**`. |  |  |
| TASK-043 | Buat dialog create/edit voucher di route-local components dengan `react-hook-form`, icon kiri di semua input, dan toast feedback yang konsisten. |  |  |
| TASK-044 | Tambahkan KPI cards voucher seperti total voucher, active voucher, expired voucher, dan exhausted voucher bila data itu mudah dihitung dari table page. |  |  |
| TASK-045 | Implementasikan empty state, loading state, dan table error state yang konsisten dengan halaman admin lain. |  |  |

### Implementation Phase 7

- **GOAL-007**: Finalisasi UX operasional admin package dan voucher agar konsisten, jelas, dan tidak misleading.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-046 | Review copy seluruh admin package page agar istilahnya konsisten dengan katalog checkout baru, bukan terminology template atau fallback lama. |  |  |
| TASK-047 | Review copy admin voucher page agar fokus pada tugas operasional admin, misalnya “Kode Voucher”, “Diskon”, “Berlaku Sampai”, “Kuota”, dan “Status”. |  |  |
| TASK-048 | Pastikan package picker pada voucher form hanya menampilkan package checkout yang valid untuk operasional baru, bukan package archived legacy secara default. |  |  |
| TASK-049 | Pastikan admin package form menampilkan helper text yang jelas untuk hubungan `harga asli`, `harga jual`, dan diskon package. |  |  |
| TASK-050 | Pastikan UI mobile dan desktop tetap rapi untuk page package dan voucher, termasuk dialog form, toolbar, dan table shell. |  |  |

### Implementation Phase 8

- **GOAL-008**: Tambahkan test coverage dan browser verification agar implementasi admin aman di-ship end-to-end.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-051 | Extend unit test `src/modules/packages/*` agar create/update package memvalidasi `checkoutGroup`, `listAmountRp`, `sortOrder`, dan guard `listAmountRp >= amountRp`. |  |  |
| TASK-052 | Tambahkan unit test `src/modules/vouchers/*` untuk create/update admin flow, unique code conflict, expired voucher editable, scope package/global, dan toggle active. |  |  |
| TASK-053 | Tambahkan test `src/modules/admin/packages/*` untuk filter checkoutGroup/lifecycle dan query mapping admin row baru. |  |  |
| TASK-054 | Tambahkan test `src/modules/admin/vouchers/*` untuk table page, filter search params, package options, dan action responses. |  |  |
| TASK-055 | Tambahkan atau update page/UI test untuk `src/app/(admin)/admin/package/*` agar field checkout baru, columns baru, dan filter baru ter-cover. |  |  |
| TASK-056 | Tambahkan page/UI test untuk `src/app/(admin)/admin/voucher/*` termasuk toolbar, table, dialog create/edit, dan empty state. |  |  |
| TASK-057 | Jalankan `pnpm lint`, `pnpm typecheck`, `pnpm test`, dan `pnpm check:fix`. |  |  |
| TASK-058 | Lakukan browser verification headless untuk flow admin package dan voucher: buka package page, edit package checkout metadata, buka voucher page, create voucher global, create voucher package, edit voucher code, toggle voucher active, dan cek hasil table refresh. |  |  |

### Implementation Phase 9

- **GOAL-009**: Finalisasi transisi katalog checkout admin dan catat follow-up yang sengaja di-skip.

| Task | Description | Completed | Date |
|------|-------------|-----------|------|
| TASK-059 | Review apakah package archived legacy perlu hidden sepenuhnya dari default package query atau cukup dipisahkan via explicit filter archived; implementasi akhir harus mengikuti keputusan Phase 0. |  |  |
| TASK-060 | Review apakah `src/modules/ext/repositories.ts` perlu ikut diarahkan ke `/checkout?packageId=...` pada fase yang sama atau dicatat sebagai follow-up agar tidak misleading. |  |  |
| TASK-061 | Scan `.next/dev/logs/*.log` setelah implementasi admin selesai untuk memastikan tidak ada runtime atau compilation error relevan. |  |  |
| TASK-062 | Catat follow-up out-of-scope: analytics voucher dashboard, bulk import voucher, audit log perubahan voucher, dan hard delete package data lama. |  |  |

## 3. Alternatives

- **ALT-001**: Membangun admin voucher saja tanpa meng-upgrade admin package. Ditolak karena katalog checkout masih belum menjadi source of truth operasional penuh di admin.
- **ALT-002**: Mengizinkan package baru tetap dibuat dengan `checkout_group = 'legacy'`. Ditolak karena membuat data baru ambigu dan bertentangan dengan target katalog checkout final.
- **ALT-003**: Hard delete package lama dari database. Ditolak karena package direferensikan oleh subscription, transaction, cd-key, dan voucher dengan foreign key `on delete restrict`, sehingga berisiko merusak histori atau gagal migrasi.
- **ALT-004**: Membuat admin voucher logic langsung di `src/modules/admin/vouchers/*` tanpa memperluas domain utama `src/modules/vouchers/*`. Ditolak karena akan menduplikasi business logic inti voucher.
- **ALT-005**: Menjadikan code voucher immutable setelah create. Ditolak karena keputusan produk final mengizinkan admin mengedit code voucher selama tetap unik.

## 4. Dependencies

- **DEP-001**: `src/modules/packages/*` sebagai source of truth package catalog dan package mutation.
- **DEP-002**: `src/modules/vouchers/*` sebagai source of truth voucher validation dan mutation.
- **DEP-003**: `src/modules/admin/packages/*` sebagai pola admin package existing yang akan di-upgrade.
- **DEP-004**: `src/modules/auth/action-client.ts` untuk `adminActionClient`.
- **DEP-005**: `src/modules/users/services.ts` untuk `requireAdminShellAccess()`.
- **DEP-006**: Primitive UI existing di `src/components/ui/**` dan shared admin table components di `src/components/shared/**`.
- **DEP-007**: `next-safe-action`, `react-hook-form`, `zod`, dan `@tanstack/react-query` yang sudah dipakai page admin existing.
- **DEP-008**: Dokumen `docs/agent-rules/folder-structure.md`.
- **DEP-009**: Dokumen `docs/agent-rules/ui-ux-rules.md`.
- **DEP-010**: Existing checkout implementation plan `docs/plans/feature-checkout-voucher-member-flow-1.md` sebagai konteks keputusan backend voucher dan package pricing yang sudah selesai.

## 5. Files

- **FILE-001**: `docs/plans/feature-admin-checkout-catalog-voucher-management-1.md` - implementation plan ini.
- **FILE-002**: `migrations/053_*` - migration baru untuk archive package lama dan/atau normalisasi package operasional admin.
- **FILE-003**: `src/modules/packages/types.ts` - type package admin dan checkout metadata.
- **FILE-004**: `src/modules/packages/schemas.ts` - schema form package admin yang diperluas.
- **FILE-005**: `src/modules/packages/repositories.ts` - repository package create/update/read admin yang diperluas.
- **FILE-006**: `src/modules/packages/services.ts` - business logic package create/update tanpa fallback legacy.
- **FILE-007**: `src/modules/admin/packages/types.ts` - filter dan table page type admin package.
- **FILE-008**: `src/modules/admin/packages/schemas.ts` - parse search params dan schema filter admin package baru.
- **FILE-009**: `src/modules/admin/packages/queries.ts` - row mapping dan filter admin package baru.
- **FILE-010**: `src/app/(admin)/admin/package/page.tsx` - route server package admin yang memuat filter baru.
- **FILE-011**: `src/app/(admin)/admin/package/_components/**` - UI package admin yang diperluas.
- **FILE-012**: `src/modules/vouchers/types.ts` - type voucher admin CRUD dan list.
- **FILE-013**: `src/modules/vouchers/schemas.ts` - schema voucher admin CRUD.
- **FILE-014**: `src/modules/vouchers/repositories.ts` - repository voucher list/create/update/toggle.
- **FILE-015**: `src/modules/vouchers/services.ts` - service voucher create/update/toggle dan validation existing.
- **FILE-016**: `src/modules/admin/vouchers/types.ts` - type admin voucher page.
- **FILE-017**: `src/modules/admin/vouchers/schemas.ts` - schema filter dan action input admin voucher.
- **FILE-018**: `src/modules/admin/vouchers/queries.ts` - admin voucher read model.
- **FILE-019**: `src/modules/admin/vouchers/actions.ts` - admin voucher safe actions.
- **FILE-020**: `src/app/(admin)/admin/voucher/page.tsx` - route server voucher admin.
- **FILE-021**: `src/app/(admin)/admin/voucher/_components/**` - UI voucher admin route-local.
- **FILE-022**: `src/app/(admin)/_components/admin-shell/admin-shell-config.ts` - admin nav, breadcrumb, quick create entry voucher.
- **FILE-023**: `src/modules/ext/repositories.ts` - optional follow-up checkout URL cleanup.
- **FILE-024**: `tests/unit/modules/packages/*.test.ts` - update test package domain.
- **FILE-025**: `tests/unit/modules/vouchers/*.test.ts` - update dan tambah test voucher domain.
- **FILE-026**: `tests/unit/modules/admin/packages/*.test.ts` - test admin package query/filter baru.
- **FILE-027**: `tests/unit/modules/admin/vouchers/*.test.ts` - test admin voucher query/action baru.
- **FILE-028**: `tests/unit/app/admin/package*.test.tsx` dan `tests/unit/app/admin/voucher*.test.tsx` - UI/page tests admin package dan voucher.

## 6. Testing

- **TEST-001**: `createPackage()` gagal jika `checkoutGroup` tidak valid atau kosong.
- **TEST-002**: `createPackage()` gagal jika `listAmountRp < amountRp`.
- **TEST-003**: `updatePackage()` berhasil untuk package lama selama input baru valid dan menghasilkan package checkout metadata final.
- **TEST-004**: Admin package query default tidak memasukkan package archived jika filter archived tidak dipilih.
- **TEST-005**: Admin package table menampilkan harga asli, harga jual, diskon, group, dan status dengan benar.
- **TEST-006**: `createVoucher()` berhasil untuk scope global.
- **TEST-007**: `createVoucher()` berhasil untuk scope package dengan package checkout valid.
- **TEST-008**: `createVoucher()` gagal jika code bentrok dengan voucher existing.
- **TEST-009**: `updateVoucher()` dapat mengubah code voucher existing ke code unik baru.
- **TEST-010**: `updateVoucher()` tetap mengizinkan edit voucher expired.
- **TEST-011**: `toggleVoucherActive()` mengubah status voucher dan table refresh bekerja.
- **TEST-012**: Admin voucher page memuat table, filter, dialog create/edit, dan empty state dengan benar.
- **TEST-013**: Browser flow admin package berhasil menyimpan perubahan metadata checkout package.
- **TEST-014**: Browser flow admin voucher berhasil create voucher global, create voucher package, edit code voucher, dan toggle active.
- **TEST-015**: Quality gate `pnpm lint`, `pnpm typecheck`, `pnpm test`, dan `pnpm check:fix` seluruhnya hijau.

## 7. Risks & Assumptions

- **RISK-001**: Jika query admin package tidak membedakan archived package dengan jelas, admin dapat salah mengedit package lama yang sebenarnya tidak lagi relevan untuk checkout.
- **RISK-002**: Mengizinkan voucher code editable meningkatkan risiko bentrok code; mitigasi utama adalah unique constraint database + validasi service yang jelas.
- **RISK-003**: Jika voucher form package-scope menampilkan terlalu banyak package termasuk package archived, admin dapat salah menargetkan voucher ke package yang tidak operasional.
- **RISK-004**: Update admin package page dapat mempengaruhi test existing karena shape row dan filter berubah cukup besar.
- **RISK-005**: Cleanup package lama di backend aktif perlu hati-hati agar tidak membuat checkout catalog atau ext payload sementara menjadi misleading.
- **ASSUMPTION-001**: Nilai `checkout_group` final yang diizinkan saat ini cukup `semi-private` dan `full-private`.
- **ASSUMPTION-002**: Package lama tetap perlu dipertahankan di database demi histori audit, walaupun tidak lagi muncul pada operasional default admin.
- **ASSUMPTION-003**: Admin voucher V1 belum perlu analytics, bulk actions, atau audit trail perubahan voucher.
- **ASSUMPTION-004**: Existing primitive UI dan admin table patterns saat ini cukup untuk membangun page voucher tanpa menambah design system baru.

## 8. Related Specifications / Further Reading

- `docs/plans/feature-checkout-voucher-member-flow-1.md`
- `docs/agent-rules/folder-structure.md`
- `docs/agent-rules/ui-ux-rules.md`
