---
title: Milestone 6 Member Console and Payment Dummy Specification
version: 0.1
date_created: 2026-04-18
last_updated: 2026-04-18
owner: Product Engineering
tags: [design, m6, member-console, payment-dummy, subscriptions, cdkey]
---

# Introduction
Dokumen ini mendefinisikan spesifikasi implementasi Milestone 6 untuk member console, flow extend subscription, redeem CD-Key, dan payment dummy. Spesifikasi ini disusun agar konsisten dengan `docs/PRD.md`, `docs/IMPLEMENTATION_PLAN.md`, `docs/DB.md`, baseline SQL di `migrations/`, dan aturan struktur folder di `docs/agent-rules/folder-structure.md`.

## 1. Purpose & Scope
Tujuan spesifikasi ini adalah mengunci requirement, constraint, interface, dan acceptance criteria untuk milestone berikut:
- route `/console`
- route `/paymentdummy`
- read path member untuk subscription overview, asset list, dan section `History Subscription`
- flow `Perpanjang Langganan`
- flow `Redeem Code`
- orchestration `payment_dummy` dan `cdkey` yang menghasilkan `transactions` dan `subscriptions` konsisten
- reuse activation core yang sama dengan flow admin manual

Audience utama:
- engineer yang mengerjakan Milestone 6
- reviewer implementasi
- AI agent yang akan mengubah codebase

Di luar scope dokumen ini:
- final dashboard `/admin`
- user management milestone 7
- endpoint extension milestone 11
- payment gateway production
- cron recovery milestone 10

## 2. Definitions
- **M6**: Milestone 6 `Member Console dan Payment Dummy`.
- **Running Subscription**: subscription dengan `status in ('active', 'processed')` dan `end_at > now()`.
- **Activation Core**: business logic sumber-tunggal yang menjalankan rule `is_extended`, revoke assignment lama, create/extend subscription, fulfillment asset, dan final status subscription.
- **Console Snapshot**: snapshot data member untuk `/console` yang berasal dari helper RPC `get_user_console_snapshot`.
- **Asset Detail**: detail raw asset yang hanya boleh dibaca untuk assignment aktif yang masih valid melalui helper RPC `get_user_asset_detail`.
- **Active Package Catalog**: daftar package member-purchasable yang hanya berisi `packages.is_active = true`.
- **Payment Dummy Checkout**: flow simulasi pembayaran pada `/paymentdummy` yang berakhir pada transaction `payment_dummy`.
- **CD-Key Reservation**: state sementara saat `cd_keys.used_by` dan `cd_keys.used_at` diisi untuk mencegah redeem ganda selama orchestration server-side.
- **Processed Subscription**: subscription valid yang belum terpenuhi seluruh entitlement-nya; user tetap boleh mengakses asset yang sudah berhasil di-assign.
- **Exact Entitlement**: kombinasi exact `platform + asset_type` atau `access_key`, misalnya `tradingview:share`.
- **Member Guard**: guard server-side berbasis `app_session`, role `member`, dan status `is_banned = false`.
- **Console State**: state bisnis yang harus terlihat jelas di `/console`, yaitu `active`, `processed`, `expired`, `canceled`, atau `none`.
- **History Subscription**: nama section UI di `/console` yang menampilkan histori row `transactions` user, bukan histori assignment atau histori subscription row murni.

## 3. Requirements, Constraints & Guidelines
- **REQ-001**: Route final milestone ini harus tersedia pada `src/app/(member)/console/page.tsx` dan `src/app/(member)/paymentdummy/page.tsx`, sehingga URL publik tetap `/console` dan `/paymentdummy`.
- **REQ-002**: `/console` harus menampilkan tiga section utama: `Subscription Overview`, `Asset List`, dan `History Subscription`.
- **REQ-003**: `Subscription Overview` minimal menampilkan `status`, `packageName`, `endAt`, dan `daysLeft`.
- **REQ-004**: `Asset List` minimal menampilkan `id`, `platform`, `asset type`, `note`, `proxy`, `expires at`, dan `action`.
- **REQ-005**: `History Subscription` minimal menampilkan `source`, `package`, `amount (Rp)`, `status`, dan `created_at`.
- **REQ-006**: `/console` harus menampilkan state yang eksplisit untuk user `active`, `processed`, `expired`, `canceled`, dan `none`.
- **REQ-006A**: Read path `/console` wajib memiliki kontrak data yang cukup untuk membedakan `expired`, `canceled`, dan `none`; snapshot running subscription saja tidak cukup karena helper baseline `get_user_console_snapshot` hanya mengembalikan subscription `active` atau `processed`.
- **REQ-007**: Jika subscription berstatus `processed`, UI harus menampilkan pesan yang jelas bahwa akses masih parsial.
- **REQ-008**: Read path `/console` wajib menggunakan `src/modules/console/queries.ts` sebagai query layer utama untuk snapshot console, state console, dan asset detail member.
- **REQ-009**: Read path asset aktif hanya boleh menampilkan asset yang masih valid sekarang, yaitu assignment aktif pada subscription berjalan dan inventory `assets.disabled_at is null` serta `assets.expires_at >= now()`.
- **REQ-010**: Detail raw asset tidak boleh dimuat di snapshot `/console`; detail sensitif hanya boleh dibaca saat user meminta action `View`.
- **REQ-011**: Action `View` pada asset harus membuka detail raw asset dan menyediakan tombol `Copy JSON`.
- **REQ-012**: Tombol `Perpanjang Langganan` harus membuka dialog pemilihan package yang hanya memuat package aktif.
- **REQ-012A**: User dengan state `none`, `expired`, atau `canceled` tetap harus dapat memulai flow pembelian dari `/console`, baik melalui CTA yang sama maupun CTA lain yang ekuivalen, selama berujung ke package picker dan `/paymentdummy` yang sama.
- **REQ-013**: Tombol `Redeem Code` harus membuka dialog input CD-Key dan submit server-side.
- **REQ-014**: Route `/paymentdummy` harus menampilkan ringkasan package dan nominal sebelum user menekan `Bayar`.
- **REQ-015**: Flow `Bayar` harus mencatat transaction dengan `source = 'payment_dummy'` dan mengaktifkan subscription melalui activation core yang sama dengan source lain.
- **REQ-016**: Flow redeem harus mencatat transaction dengan `source = 'cdkey'`, menghubungkan `cd_key_id`, dan mengaktifkan subscription melalui activation core yang sama.
- **REQ-017**: Rule `is_extended` untuk `payment_dummy` dan `cdkey` harus identik dengan rule yang sudah dipakai `admin_manual`.
- **REQ-018**: Implementasi harus menjaga invariant satu user hanya punya satu running subscription pada satu waktu.
- **REQ-019**: Implementasi harus menjaga invariant exact entitlement; asset hanya boleh di-assign jika `platform:asset_type` cocok persis dengan `access_key`.
- **REQ-020**: Package disabled tidak boleh muncul pada flow extend atau payment baru, tetapi subscription lama yang sedang berjalan tetap normal.
- **REQ-021**: CD-Key yang diterbitkan sebelum package master di-disable tetap valid karena memakai snapshot `cd_keys`.
- **REQ-022**: Redeem invalid atau redeem key yang sudah terpakai harus gagal tanpa mengubah subscription user, assignment user, atau state `cd_keys.used_by/used_at`.
- **REQ-023**: History di `/console` harus tetap dapat menampilkan transaction dengan status `pending`, `success`, `failed`, dan `canceled` jika row tersebut memang ada.
- **REQ-024**: Reload `/console` setelah transaksi sukses wajib menampilkan state terbaru yang konsisten tanpa membutuhkan refresh data manual di database.
- **REQ-025**: Guard route `(member)` harus tetap memakai trusted app session server-side. Admin yang mengakses route `(member)` harus diarahkan ke `/admin`, user banned ke `/unauthorized`, dan guest ke `/login`.
- **REQ-026**: Setiap request terautentikasi yang melewati shell member harus tetap menyentuh `app_sessions.last_seen_at` sesuai kontrak milestone foundation.
- **REQ-027**: Semua mutation UI M6 harus memakai Server Actions berbasis `next-safe-action`. Tidak boleh membuka REST endpoint publik baru untuk UI internal.
- **REQ-027A**: Member write action untuk payment dummy dan redeem wajib memakai shared member-safe action client yang hanya menerima user terautentikasi, tidak banned, dan role `member`; action tersebut tidak boleh reuse `adminActionClient`.
- **REQ-027B**: Implementasi M6 tidak boleh mengasumsikan baseline SQL saat ini sudah membuka write path member untuk `transactions`, `subscriptions`, `asset_assignments`, atau `cd_keys`. M6 wajib menyediakan trusted server-side write path tersendiri untuk checkout dan redeem.
- **REQ-027C**: `memberActionClient` wajib memakai contract authenticated-user yang sama dengan `src/modules/users/services.ts`, sehingga validasi session, role, dan banned state tidak terduplikasi di jalur lain.
- **REQ-028**: Semua form member harus memakai `react-hook-form` + `zod` dan seluruh external input wajib tervalidasi dengan error message jelas.
- **REQ-029**: Semua input form baru pada UI wajib memiliki icon di sisi kiri sesuai rule UI repo.
- **REQ-030**: Struktur file wajib mengikuti `docs/agent-rules/folder-structure.md`. `src/app` tetap tipis, business logic utama hidup di `src/modules`.
- **REQ-031**: UI baru harus reuse primitive yang sudah ada di `src/components/ui/**` dan tidak boleh memperkenalkan fondasi UI baru.
- **REQ-032**: `/console` dan `/paymentdummy` harus aman dibuka langsung dari browser tanpa runtime error dan tanpa mengandalkan route demo `(main)`.
- **REQ-033**: Spec ini mengizinkan reuse read RPC baseline yang sudah ada, dan melarang bypass langsung dari client component ke database atau admin client.
- **SEC-001**: Browser member tidak boleh memakai credential admin database, `project_admin`, atau service credential.
- **SEC-002**: Raw asset detail tidak boleh dikirim ke browser sampai user memang lolos guard session dan meminta detail asset yang masih valid.
- **SEC-003**: Semua mutation M6 harus dieksekusi server-side dengan user session biasa.
- **SEC-004**: Flow redeem harus bersifat idempotent terhadap kode yang sudah terpakai; second redemption attempt wajib gagal aman.
- **SEC-005**: Flow payment dummy dan redeem tidak boleh bergantung pada edit SQL manual di tengah journey browser.
- **CON-001**: Milestone ini tidak boleh mengubah URL final produk. Gunakan route group `(member)` tanpa mengubah path publik.
- **CON-002**: Milestone ini tidak boleh menulis business logic inti di `page.tsx`, `layout.tsx`, atau client component.
- **CON-003**: Milestone ini tidak boleh membuat endpoint `/api/*` baru untuk flow web internal.
- **CON-004**: Milestone ini tidak boleh menduplikasi activation rule di tiga tempat berbeda; admin manual, payment dummy, dan cdkey harus berbagi activation core.
- **CON-005**: Milestone ini tidak boleh menjadikan ringkasan package `private/share/mixed` sebagai dasar otorisasi asset.
- **CON-006**: Milestone ini harus kompatibel dengan baseline migrations `001` sampai `030`, plus `040` dan `041` untuk verifikasi seed browser.
- **CON-007**: Milestone ini harus memanfaatkan `pnpm` dan Next.js App Router v16, serta tidak boleh memakai pola API lama yang bertentangan dengan App Router.
- **PAT-001**: `src/modules/console/queries.ts` tetap menjadi adapter read model utama untuk member console. M6 menambah `getConsoleStateSnapshot()` di file ini, berdampingan dengan `getConsoleSnapshot()` dan `getConsoleAssetDetail()`.
- **PAT-002**: `src/modules/subscriptions/services.ts` menjadi rumah activation core lintas source dan harus bersifat transaction-agnostic, yaitu tidak membuat atau mengubah row transaction secara langsung.
- **PAT-003**: `src/modules/subscriptions/actions.ts` adalah rumah tunggal untuk member payment action karena flow ini langsung mengorkestrasi activation subscription.
- **PAT-004**: `src/modules/cdkeys/actions.ts` tetap menjadi rumah action redeem CD-Key, dengan delegasi ke activation core dan transaction helper.
- **PAT-004A**: M6 wajib menambah shared `memberActionClient` di `src/lib/safe-action/*`, dibangun di atas base `actionClient` yang sama dan dipakai lintas domain. Action payment dummy dan redeem wajib memakai client ini.
- **PAT-004B**: `memberActionClient` wajib mengomposisikan `getAuthenticatedAppUser()` sebagai lookup authenticated app user yang sama dengan contract user/session app, lalu menambahkan validasi `role = member` dan `!isBanned`, bukan membuat jalur validasi session/role/banned yang terpisah.
- **PAT-005**: Untuk flow member baru `payment_dummy` dan `cdkey`, seluruh write path transaction yang menyertai activation core harus lewat domain `src/modules/transactions/*` sebagai target-state source of truth untuk create, link, dan update status transaction.
- **PAT-005A**: Baseline repo saat ini masih memakai `src/modules/subscriptions/repositories.ts#createTransactionRow` untuk `admin_manual`. M6 tidak wajib merombak jalur lama itu bila tidak disentuh, tetapi tidak boleh memperluas pemakaian helper lama tersebut ke flow member baru.
- **PAT-005B**: Untuk mendukung flow member baru, domain transaction perlu menyediakan operasi terpisah untuk `createTransaction`, `attachTransactionToSubscription`, `markTransactionSuccess`, dan `markTransactionFailed` dengan `failureReason` yang dapat diaudit.
- **PAT-006**: `src/app/(member)/console/_components/**` dan `src/app/(member)/paymentdummy/_components/**` dipakai untuk komponen route-local yang spesifik page.
- **PAT-007**: Jika tim memilih dialog yang dapat di-restore via URL, gunakan query string/search params untuk state dialog route-local, sementara Server Actions tetap dipakai hanya untuk mutation dan loading data sensitif. Ini adalah rekomendasi implementasi, bukan acceptance requirement wajib M6.
- **GUD-001**: Perubahan sebaiknya minimal dan menjaga nama/kontrak existing yang sudah stabil.
- **GUD-002**: Jika perlu refactor admin manual agar memakai activation core baru, lakukan hanya sebatas yang dibutuhkan untuk menghapus duplikasi rule.
- **GUD-003**: Payment dummy tidak perlu mensimulasikan seluruh skenario gateway; happy path `Bayar` sukses adalah prioritas, tetapi model transaction tetap harus sanggup menyimpan `failed` atau `canceled` bila orchestration gagal.
- **GUD-004**: History transaction di console sebaiknya memakai mapping langsung dari RPC snapshot yang sudah ada, bukan query join baru yang tidak perlu.
- **GUD-005**: Asset detail sebaiknya dimuat on-demand berdasarkan `assetId`, bukan preloading seluruh raw asset ke console snapshot.

## 4. Interfaces & Data Contracts

### 4.1 Target-State Route Placement

| Concern | Required Path | Responsibility |
| --- | --- | --- |
| Member console page | `src/app/(member)/console/page.tsx` | Target-state page M6 yang mengambil snapshot console dan merender section utama; baseline saat ini masih placeholder shell |
| Console route-local UI | `src/app/(member)/console/_components/**` | Presentational UI khusus route `/console` |
| Payment dummy page | `src/app/(member)/paymentdummy/page.tsx` | Target-state page M6 untuk validasi package terpilih dan render summary pembayaran; baseline saat ini route file ini belum ada |
| Payment dummy route-local UI | `src/app/(member)/paymentdummy/_components/**` | Presentational UI khusus route `/paymentdummy` |
| Console read model | `src/modules/console/queries.ts` | Read snapshot console dan detail asset aman |
| Shared activation core | `src/modules/subscriptions/services.ts` | Rule `is_extended`, revoke lama, create/extend subscription, fulfillment, apply status |
| Member payment action | `src/modules/subscriptions/actions.ts` | Target-state action M6 untuk klik `Bayar`, wajib memakai `memberActionClient` |
| Redeem action | `src/modules/cdkeys/actions.ts` | Target-state action M6 untuk redeem code |
| Package catalog query | `src/modules/packages/services.ts` | Target-state source of truth daftar package aktif untuk dialog di `/console` dan data server-side `/paymentdummy`; M6 perlu menambah helper list aktif di sini |
| Transaction persistence helper | `src/modules/transactions/services.ts` dan `src/modules/transactions/repositories.ts` | Target-state source of truth untuk insert, link, dan update status transaction; baseline saat ini baru memiliki create/link di domain transactions |
| Member shell guard | `src/modules/users/services.ts#requireMemberShellAccess` | Entry point guard tunggal untuk route `(member)` dan touch `app_sessions.last_seen_at` |
| Member action guard | `src/lib/safe-action/client.ts#memberActionClient` atau file lain di `src/lib/safe-action/*` | Shared safe-action guard tunggal untuk mutation member, wajib memakai `getAuthenticatedAppUser()` sebagai auth-context source yang sama dengan contract user/session app |

### 4.2 Existing Read Contracts To Reuse

#### Console Snapshot RPC
Current baseline wrapper:
- `getConsoleSnapshot(input?: { userId?: string }): Promise<ConsoleSnapshot>`
- source: `src/modules/console/queries.ts`
- backing RPC: `public.get_user_console_snapshot(uuid)`

Important limitation:
- helper baseline ini hanya mengembalikan running subscription `active` atau `processed`
- helper ini tidak cukup sendirian untuk membedakan state `/console` menjadi `expired`, `canceled`, dan `none`
- karena itu, implementasi M6 harus menambah read contract pendamping yang terpisah, tanpa mengubah tanggung jawab inti RPC ini sebagai snapshot running subscription dan asset aktif

Expected normalized shape:
```ts
type ConsoleSnapshot = {
  subscription: {
    id: string
    packageId: string
    packageName: string
    status: "active" | "processed"
    startAt: string
    endAt: string
    daysLeft: number
  } | null
  assets: Array<{
    id: string
    assignmentId: string
    subscriptionId: string
    accessKey: string
    platform: "tradingview" | "fxreplay" | "fxtester"
    assetType: "private" | "share"
    note: string | null
    proxy: string | null
    expiresAt: string
  }>
  transactions: Array<{
    id: string
    packageId: string
    packageName: string
    source: "payment_dummy" | "cdkey" | "admin_manual"
    status: "pending" | "success" | "failed" | "canceled"
    amountRp: number
    paidAt: string | null
    createdAt: string
  }>
}
```

Note:
- internal TypeScript normalization boleh memakai `createdAt`
- contract UI milestone dan acceptance browser tetap memakai nama kolom `created_at`

#### Console State Read Contract
Required capability:
- membedakan state `/console` untuk `active`, `processed`, `expired`, `canceled`, dan `none`
- tetap menampilkan konteks state terakhir walaupun tidak ada running subscription

Recommended shape:
```ts
type ConsoleStateSnapshot = {
  state: "active" | "processed" | "expired" | "canceled" | "none"
  latestSubscription: {
    id: string
    packageId: string
    packageName: string
    status: "active" | "processed" | "expired" | "canceled"
    startAt: string
    endAt: string
  } | null
}
```

Rules:
- jika ada running subscription, `state` harus mengikuti status running subscription tersebut
- jika tidak ada running subscription, state harus diturunkan dari subscription historis terbaru user bila ada
- jika user tidak pernah memiliki subscription, `state` harus `none`
- read contract ini wajib diwujudkan sebagai helper query/RPC pendamping yang terpisah dari `get_user_console_snapshot`, lalu dikomposisikan di `src/modules/console/queries.ts`
- implementasi tidak boleh memaksa browser menebak state dari transaksi saja

#### Asset Detail RPC
Current baseline wrapper:
- `getConsoleAssetDetail(input: { assetId: string; userId?: string }): Promise<ConsoleAssetDetail | null>`
- source: `src/modules/console/queries.ts`
- backing RPC: `public.get_user_asset_detail(uuid, uuid)`

Expected normalized shape:
```ts
type ConsoleAssetDetail = {
  id: string
  subscriptionId: string
  accessKey: string
  platform: "tradingview" | "fxreplay" | "fxtester"
  assetType: "private" | "share"
  note: string | null
  proxy: string | null
  expiresAt: string
  account: string
  asset: unknown
}
```
### 4.3 New Read Contract Required For Package Picker
Required capability:
- list package aktif yang boleh dipilih user dari `/console`
- package disabled tidak boleh ikut
- data minimum harus cukup untuk dialog extend atau purchase awal dan route `/paymentdummy`

Recommended shape:
```ts
type ConsolePurchasablePackage = {
  id: string
  name: string
  amountRp: number
  durationDays: number
  isExtended: boolean
  accessKeys: string[]
  summary: "private" | "share" | "mixed"
}
```
Rules:
- source of truth harus `packages`
- filter harus `is_active = true`
- `summary` boleh dihitung dari helper existing
- top-level ownership read model tetap di `src/modules/packages/services.ts`
- page atau route-local loader boleh mengomposisikan hasil package-domain read bersama console snapshot, tetapi ownership daftar package aktif tidak boleh dipindah ke console module
- read dilakukan server-side

### 4.4 Shared Activation Core Contract
Activation core baru atau hasil ekstraksi harus menjadi source tunggal untuk rule `is_extended`.
Recommended contract:
```ts
type ActivationSource = "payment_dummy" | "cdkey" | "admin_manual"
type SharedActivationInput = {
  userId: string
  source: ActivationSource
  packageSnapshot: {
    packageId: string
    name: string
    amountRp: number
    durationDays: number
    isExtended: boolean
    accessKeys: string[]
  }
  durationDaysOverride?: number | null
  manualAssignmentsByAccessKey?: Record<string, string | null>
  replacementReason?: string
}
type SharedActivationResult = {
  subscriptionId: string
  mode: "create-new" | "extend-existing" | "replace-with-carry-over" | "replace-immediately"
  finalStatus: "active" | "processed"
}
```
Required behavior:
- jika tidak ada running subscription, buat subscription baru
- jika package sama dan `isExtended = true`, extend subscription yang sama
- jika package berbeda dan `isExtended = true`, cancel/revoke lama lalu buat subscription baru mulai `now()`, dengan `endAt` berbasis `max(oldEndAt, now()) + duration`
- jika `isExtended = false`, cancel/revoke lama lalu buat subscription baru mulai `now()` tanpa carry over
- fulfillment asset harus memakai exact `access_key`
- final status harus ditentukan lewat `apply_subscription_status`
- seluruh write path transaction yang menyertai activation core untuk flow member baru `payment_dummy` dan `cdkey` harus lewat domain `src/modules/transactions/*`; flow `admin_manual` existing boleh tetap memakai helper lama selama tidak diperluas pada M6
- activation core tidak boleh menganggap member session browser dapat menulis langsung ke tabel runtime; orchestration write harus lewat trusted server-side path yang eksplisit

### 4.5 Payment Dummy Action Contract
Recommended action:
- name: `completePaymentDummyCheckoutAction`
- home: `src/modules/subscriptions/actions.ts`
- guard: authenticated member only
- write path backend: trusted server-side write path yang eksplisit; current SQL baseline tidak cukup bila hanya mengandalkan member RLS biasa
Input:
```ts
type PaymentDummyCheckoutInput = {
  packageId: string
}
```
Output:
```ts
type PaymentDummyCheckoutResult =
  | {
      ok: true
      subscriptionId: string
      transactionId: string
      redirectTo: "/console"
    }
  | {
      ok: false
      errorCode: "checkout-failed" | "disabled-package" | "invalid-package"
      message: string
    }
```
Required orchestration:
1. validasi session member aktif
2. validasi package aktif dan resolvable
3. buat transaction write path untuk source `payment_dummy`
4. panggil shared activation core dengan `source = 'payment_dummy'`
5. link transaction ke subscription hasil aktivasi
6. pastikan row transaction yang terlihat setelah flow sukses berstatus `success` dan memiliki `paid_at`
7. kembalikan structured result sukses dengan `redirectTo: "/console"`
8. jika implementation memakai status transien `pending`, status tersebut wajib diselesaikan menjadi `success` atau `failed` dalam request server-side yang sama dan tidak boleh tertinggal setelah response sukses dikirim
9. jika orchestration gagal, transaction tidak boleh tertinggal dalam state ambigu dan `failure_reason` wajib dapat diaudit server-side

Navigation pattern:
- safe-action mengembalikan structured result; client yang men-trigger action bertanggung jawab melakukan navigasi ke `redirectTo` saat `ok = true`
- action tidak boleh memanggil `redirect()` secara langsung untuk happy path payment dummy
- kegagalan action tidak melakukan redirect otomatis; pesan error ditampilkan inline di `/paymentdummy`

### 4.6 Redeem CD-Key Action Contract
Recommended action:
- name: `redeemCdKeyAction`
- home: `src/modules/cdkeys/actions.ts`
- guard: authenticated member only
- write path backend: trusted server-side write path yang eksplisit; current SQL baseline tidak cukup bila hanya mengandalkan member RLS biasa

Input:
```ts
type RedeemCdKeyInput = {
  code: string
}
```
Output:
```ts
type RedeemCdKeyResult =
  | {
      ok: true
      subscriptionId: string
      transactionId: string
    }
  | {
      ok: false
      errorCode: "code-invalid" | "code-used" | "redeem-failed"
      message: string
    }
```
Required orchestration:
1. validasi session member aktif
2. lookup CD-Key by code
3. reject jika key tidak ada, sudah dipakai, atau `is_active = false`
4. reserve usage `used_by` + `used_at` secara atomik di dalam satu transaksi database
5. buat transaction write path dengan `source = 'cdkey'` dan `cd_key_id`
6. panggil shared activation core dengan `source = 'cdkey'` dan snapshot dari `cd_keys`
7. link transaction ke subscription hasil aktivasi
8. pastikan row transaction yang terlihat setelah flow sukses berstatus `success` dan memiliki `paid_at`
9. pertahankan `used_by` dan `used_at`
10. jika implementation memakai status transien `pending`, status tersebut wajib diselesaikan menjadi `success` atau `failed` dalam request server-side yang sama
11. jika flow gagal setelah reservation, rollback `used_by` dan `used_at`, lalu tandai transaction `failed` bila row transaction sudah terbuat

Atomic reservation rule:
- implementasi wajib mencegah dua redeem sukses paralel pada key yang sama
- reservation harus dilakukan dengan mekanisme atomik seperti `SELECT ... FOR UPDATE` atau `UPDATE ... WHERE used_at IS NULL RETURNING *`
- jika reservation atomik tidak mengembalikan row, flow harus gagal sebagai `code-used` atau `code-invalid` tanpa side effect lain

### 4.7 Payment Dummy Route Contract
Recommended URL contract:
- `/paymentdummy?packageId=<uuid>`

Required route behavior:
- guard member harus dijalankan terlebih dahulu sebelum parsing `packageId`, lookup package, atau redirect `paymentError`
- outcome guard wajib mengikuti contract shell yang sama: guest ke `/login`, admin ke `/admin`, banned member ke `/unauthorized`
- hanya member yang lolos guard boleh menerima redirect route-level kembali ke `/console?paymentError=...`
- page harus membaca `searchParams.packageId`
- jika packageId tidak ada atau invalid, redirect kembali ke `/console` dengan state error yang jelas
- page harus memuat package summary server-side
- page tidak boleh menampilkan package disabled
- page tidak boleh mempercayai data package dari client tanpa lookup ulang server-side
- direct URL access ke `/paymentdummy` tetap harus tunduk pada member guard yang sama dengan `/console`

Required redirect query contract for route-level errors:
- packageId hilang: `/console?paymentError=missing-package`
- packageId invalid atau package tidak ditemukan: `/console?paymentError=invalid-package`
- package disabled: `/console?paymentError=disabled-package`

Console error consumption contract:
- `/console` wajib membaca `searchParams.paymentError`
- key yang diizinkan hanya `missing-package`, `invalid-package`, dan `disabled-package`
- setiap key harus dipetakan ke pesan di section `4.9 Error Message Contract`
- unknown key harus diabaikan tanpa memecahkan render halaman
- error route-level harus dirender di surface UI yang stabil, misalnya banner atau alert inline di atas section utama

Recommended page data shape:
```ts
type PaymentDummyPageData = {
  selectedPackage: {
    id: string
    name: string
    amountRp: number
    durationDays: number
    isExtended: boolean
    accessKeys: string[]
    summary: "private" | "share" | "mixed"
  }
  currentSubscription: {
    packageId: string
    packageName: string
    status: "active" | "processed"
    endAt: string
    daysLeft: number
  } | null
}
```
### 4.8 UI Composition Contract
Recommended console composition:
- `console-page.tsx`
- `console-overview-card.tsx`
- `console-asset-table/console-asset-table.tsx`
- `console-history-table/console-history-table.tsx`
- `console-extend-dialog/console-extend-dialog.tsx`
- `console-redeem-dialog/console-redeem-dialog.tsx`
- `console-asset-detail-dialog/console-asset-detail-dialog.tsx`

Rules:
- file names harus eksplisit
- route-local UI tetap di `_components`
- business logic tidak boleh pindah ke komponen client

Recommended dialog URL contract if URL-restorable dialogs are desired:
- package picker dialog: `/console?dialog=extend`
- redeem dialog: `/console?dialog=redeem`
- asset detail dialog: `/console?dialog=asset-detail&assetId=<uuid>`
- close dialog harus menghapus query param yang relevan dan mengembalikan URL ke `/console`
- refresh browser pada URL dialog yang valid harus memulihkan dialog yang sama tanpa runtime error
- query param dialog yang tidak dikenal harus diabaikan tanpa merusak render halaman

### 4.9 Error Message Contract
Member-facing error messages harus jelas tetapi aman:
- `errorCode=code-invalid` atau `errorCode=code-used`: `CD-Key tidak valid atau sudah terpakai.`
- `errorCode=redeem-failed`: `Redeem CD-Key gagal diproses. Silakan coba lagi.`
- selected package disabled: `Package sudah tidak tersedia untuk pembelian baru.`
- checkout orchestration failed: `Pembayaran dummy gagal diproses. Silakan coba lagi.`
- asset detail unavailable: `Asset sudah tidak tersedia.`
- unauthorized session: redirect sesuai shell guard, bukan toast biasa
- `paymentError=missing-package`: `Package tujuan pembayaran tidak ditemukan.`
- `paymentError=invalid-package`: `Package yang dipilih tidak valid atau sudah tidak tersedia.`
- `paymentError=disabled-package`: `Package sudah tidak tersedia untuk pembelian baru.`

Payment route-level error keys:
- `missing-package`: query param `packageId` tidak ada pada request `/paymentdummy`
- `invalid-package`: `packageId` ada, tetapi bukan UUID valid atau tidak resolve ke package mana pun
- `disabled-package`: package sudah tidak tersedia untuk pembelian baru

Namespace note:
- `errorCode` pada hasil Server Action dan `paymentError` pada query param route-level memakai skema key yang sama untuk kasus package validation (`invalid-package`, `disabled-package`)
- `missing-package` hanya dipakai oleh route-level redirect sebelum action checkout dijalankan
- unused CD-Key yang `is_active = false` harus dipetakan ke `errorCode=code-invalid`, bukan status member-facing baru yang terpisah

## 5. Acceptance Criteria
- **AC-001**: Given user `seed.active.browser@assetnext.dev`, When login dan membuka `/console`, Then halaman menampilkan subscription overview dengan `status`, `packageName`, `endAt`, `daysLeft`, dan asset aktif.
- **AC-002**: Given user `seed.processed.browser@assetnext.dev`, When membuka `/console`, Then UI menampilkan informasi bahwa akses masih parsial dan tetap menampilkan asset yang memang sudah assigned.
- **AC-003**: Given user `seed.expired.browser@assetnext.dev`, When membuka `/console`, Then UI menampilkan state expired yang jelas dan tidak menampilkan inventory aktif yang sudah tidak valid.
- **AC-004**: Given user `seed.canceled.browser@assetnext.dev`, When membuka `/console`, Then UI menampilkan state canceled yang jelas.
- **AC-005**: Given user `seed.none.browser@assetnext.dev`, When membuka `/console`, Then UI menampilkan state belum punya subscription.
- **AC-005A**: Given user `seed.none.browser@assetnext.dev`, When memulai flow pembelian dari `/console` lalu menyelesaikan `/paymentdummy`, Then user memperoleh subscription baru dan hasilnya langsung terbaca kembali di `/console`.
- **AC-006**: Given `/console` berhasil render, When user melihat `Asset List`, Then tabel minimal memuat kolom `id`, `platform`, `asset type`, `note`, `proxy`, `expires at`, dan `action`.
- **AC-007**: Given `/console` berhasil render, When user melihat `History Subscription`, Then tabel minimal memuat kolom `source`, `package`, `amount (Rp)`, `status`, dan `created_at`.
- **AC-008**: Given user membuka dialog `Perpanjang Langganan`, When daftar package tampil, Then hanya package aktif yang muncul.
- **AC-009**: Given user memilih package aktif dari dialog extend, When diarahkan ke `/paymentdummy`, Then halaman menampilkan ringkasan package dan nominal sebelum aksi bayar.
- **AC-010**: Given user menekan `Bayar`, When orchestration sukses, Then transaction `payment_dummy` tercatat, subscription diperbarui sesuai rule `is_extended`, dan user kembali ke `/console`.
- **AC-011**: Given user punya running subscription dan membeli package yang sama dengan `is_extended = true`, When bayar sukses, Then record subscription yang sama memanjang dan tidak muncul dua running subscription sekaligus.
- **AC-012**: Given user punya running subscription dan membeli package berbeda dengan `is_extended = true`, When bayar sukses, Then subscription lama ditutup, assignment lama direvoke, subscription baru dimulai dari `now()`, dan end date baru memakai carry-over base.
- **AC-013**: Given user punya running subscription dan membeli package dengan `is_extended = false`, When bayar sukses, Then subscription lama diganti dan sisa hari lama tidak ikut terbawa.
- **AC-014**: Given package yang sedang dipakai user kemudian di-disable admin, When user membuka extend flow baru, Then package tersebut tidak lagi muncul di package picker dan subscription berjalan yang sudah ada tetap normal.
- **AC-014A**: Given user membuka `/paymentdummy` dengan `packageId` invalid, hilang, atau menunjuk ke package disabled, When request diproses, Then user diarahkan aman kembali ke `/console` dengan error state yang jelas.
- **AC-014B**: Given member login dan membuka `/paymentdummy?packageId=<valid-uuid>` langsung dari browser, When request diproses, Then halaman memuat ringkasan package hasil lookup server-side dan tetap stabil tanpa runtime error.
- **AC-015**: Given user redeem CD-Key valid, When submit redeem sukses, Then `/console` langsung menampilkan transaction/subscription terbaru tanpa edit DB manual.
- **AC-016**: Given user redeem CD-Key yang snapshot package-nya berasal dari package yang sekarang disabled, When key masih valid dan unused, Then redeem tetap sukses sesuai snapshot `cd_keys`.
- **AC-017**: Given user redeem CD-Key invalid atau used, When submit, Then UI menampilkan error yang benar dan state user tidak berubah.
- **AC-017A**: Given user redeem CD-Key berhasil, When admin membuka `/admin/cdkey`, Then key yang sama terlihat berstatus `used` dengan `used_by` dan `used_at` terisi.
- **AC-018**: Given user membuka detail asset dari `Asset List`, When action `View` dipilih, Then raw asset tampil dan tombol `Copy JSON` berfungsi.
- **AC-019**: Given asset sudah invalid sebelum detail dibuka, When user meminta detail, Then server menolak detail dan UI menampilkan state unavailable tanpa membocorkan raw asset.
- **AC-020**: Given user reload `/console` setelah payment atau redeem sukses, When page dirender ulang, Then section `History Subscription` dan snapshot subscription tetap konsisten.
- **AC-020A**: Given member terautentikasi membuka `/console` atau `/paymentdummy`, When request selesai diproses, Then `app_sessions.last_seen_at` bergerak maju dibanding nilai sebelum request.
- **AC-021**: Given guest mengakses `/console` atau `/paymentdummy` langsung, When request diproses, Then guard server-side mengarahkan user ke `/login` tanpa runtime error.
- **AC-021A**: Given admin mengakses `/console` atau `/paymentdummy` langsung, When request diproses, Then guard server-side mengarahkan user ke `/admin` tanpa runtime error.
- **AC-021B**: Given sebuah akun member loginable yang disiapkan pada test setup dengan `profiles.is_banned = true` mengakses `/console` atau `/paymentdummy` langsung, When request diproses, Then guard server-side mengarahkan user ke `/unauthorized` tanpa runtime error.
- **AC-022**: Given implementasi M6 selesai, When diverifikasi via read-only InsForge CLI, Then transaction, subscription, cd_key usage, dan read path console konsisten dengan invariant milestone 6.
- **AC-022A**: Given user memiliki package dengan entitlement exact tertentu, When subscription hasil payment atau redeem sudah aktif, Then asset yang tampil di `/console` hanya merepresentasikan tuple `platform + asset_type` yang memang diizinkan package tersebut dan tidak menampilkan tuple di luar entitlement package.

## 6. Test Automation Strategy
- **Test Levels**: Unit, integration, browser verification manual, runtime diagnostics.
- **Unit Focus**: activation mode resolver, package picker filtering, cdkey error mapping, payment dummy error mapping, DTO/view-model mapping.
- **Integration Focus**: shared activation core, payment dummy orchestration, redeem orchestration, console query wrappers, console state derivation untuk `expired/canceled/none`, dan guard behavior pada `(member)` routes.
- **Browser Verification**: wajib memakai `agent-browser` skill untuk seluruh acceptance browser-visible M6 yang terdampak, termasuk `/console`, `/paymentdummy`, dan konfirmasi lintas-route di `/admin/cdkey` setelah redeem sukses.
- **Frameworks**: repo test stack existing, plus `next-safe-action` action invocation dan React component tests bila sudah tersedia di repo.
- **Test Data Management**: gunakan migrations `001` sampai `030`, lalu `040_dev_seed_full.sql` dan `041_dev_seed_loginable_users.sql` pada database runtime yang sama dengan app.
- **Banned Guard Fixture**: `041_dev_seed_loginable_users.sql` tidak menyediakan akun member loginable yang banned. Verifikasi browser untuk banned guard wajib menyiapkan satu akun loginable tambahan dengan `profiles.is_banned = true` melalui setup test yang tepercaya.
- **Verification Commands**: `pnpm lint`, `pnpm check`, `pnpm test`.
- **Runtime Verification**: next-devtools runtime tidak menunjukkan error compilation/runtime relevan pada route `/console` dan `/paymentdummy`.
- **Log Verification**: scan `.next/dev/logs/*.log` tidak mengandung error relevan dari flow M6.
- **Backend Verification**: pakai read-only InsForge CLI untuk memeriksa `transactions`, `subscriptions`, `cd_keys`, dan read helper RPC. Sesi verifikasi dimulai dengan `npx @insforge/cli whoami` dan `npx @insforge/cli current`, lalu lanjut ke `db rpc get_user_console_snapshot` atau `db query` yang spesifik pada row hasil flow browser.
- **CLI Auth Context**: verifikasi browser membuktikan user journey member. Verifikasi CLI terhadap helper RPC console harus memakai authenticated admin context. Verifikasi direct table query untuk `cd_keys`, `transactions`, dan `subscriptions` boleh memakai read-only admin atau `project_admin` context yang memang memiliki akses baca tabel tersebut.
- **Non-Running State Verification**: `get_user_console_snapshot` hanya membuktikan state running `active` atau `processed` beserta asset validnya. State console `expired`, `canceled`, dan `none` wajib dibuktikan lewat helper state tambahan M6 atau query historis `subscriptions` yang spesifik.
- **Coverage Requirements**: seluruh branch rule `is_extended` dan failure path redeem harus tercakup di level unit/integration.
- **Performance Guidance**: `/console` sebaiknya memanfaatkan satu snapshot read utama dan tidak membuat waterfall query yang tidak perlu.

## 7. Rationale & Context
Milestone 6 adalah vertical slice member pertama yang benar-benar menyatukan auth shell, subscription engine, package catalog, transaction history, asset access, dan CD-Key activation. Ada enam alasan desain utama:
1. Read path `/console` sudah punya baseline yang kuat.
    - `public.get_user_console_snapshot` dan `public.get_user_asset_detail` sudah ada di migration `030_rpc.sql`.
    - `src/modules/console/queries.ts` sudah membungkus kedua RPC ini menjadi shape TypeScript yang stabil.
    - Karena itu, M6 sebaiknya mengutamakan reuse read contract ini daripada membuat query ulang di page atau client.
2. Activation rule saat ini masih terkonsentrasi pada admin manual.
    - `src/modules/subscriptions/services.ts` sudah memiliki logika `is_extended`, revoke assignment, fulfillment, dan `applySubscriptionStatus`.
    - Namun flow itu masih hardcoded ke `admin_manual`.
    - M6 harus mengekstrak core activation tersebut agar payment dummy dan redeem tidak menduplikasi rule yang sama.
    - Pada saat yang sama, write path transaction juga harus dipusatkan ke `src/modules/transactions/*` agar source `admin_manual`, `payment_dummy`, dan `cdkey` tidak memiliki persistence logic yang terpecah.
    - Baseline repo saat ini masih menulis transaction `admin_manual` dari domain subscriptions, sehingga M6 harus memperlakukan sentralisasi transaction sebagai target-state refactor yang eksplisit.
3. Data model baseline sudah mendukung snapshot dan validitas read path.
   - `subscriptions`, `transactions`, `cd_keys`, dan `asset_assignments` sudah memiliki kolom yang cukup untuk M6.
   - `v_current_asset_access` dan RPC asset detail sudah menegakkan rule bahwa asset disabled atau expired harus langsung hilang dari read path aktif.
   - Seed `041_dev_seed_loginable_users.sql` juga sudah menyediakan state `active`, `processed`, `expired`, `canceled`, dan `none`, sehingga UI M6 bisa diverifikasi nyata dari browser.
4. Snapshot baseline yang ada belum cukup untuk semua state console.
    - `get_user_console_snapshot` saat ini hanya mengembalikan running subscription.
    - Karena implementation plan mewajibkan state `expired`, `canceled`, dan `none` terlihat jelas, M6 wajib menambah read contract untuk state non-running tersebut.
5. Baseline SQL saat ini belum membuka member-safe write surface untuk checkout dan redeem.
   - Policy tabel runtime utama masih membatasi write ke jalur admin, sementara helper RPC authenticated yang tersedia masih fokus ke read path console dan extension.
   - Karena itu, M6 harus secara eksplisit memakai trusted server-side write path, bukan mengasumsikan member session browser bisa menulis langsung ke tabel runtime.
6. Kontrak guard member dan action member harus berbagi sumber auth-context yang sama.
    - Route `(member)` sudah punya entrypoint guard nyata di `requireMemberShellAccess()`.
    - Member mutation M6 harus memakai `getAuthenticatedAppUser()` yang sama melalui `memberActionClient`, bukan membuat jalur validasi session/role/banned yang terpisah.

## 8. Dependencies & External Integrations
### External Systems
- **EXT-001**: InsForge Database - source of truth untuk `packages`, `subscriptions`, `transactions`, `cd_keys`, `asset_assignments`, `app_sessions`, dan RPC baseline.
- **EXT-002**: InsForge Auth - source of truth untuk identity user yang masuk ke member shell.

### Third-Party Services
- **SVC-001**: Browser Clipboard API - diperlukan untuk action `Copy JSON` di asset detail dialog.
- **SVC-002**: Next.js Server Actions execution runtime - diperlukan untuk payment dummy dan redeem tanpa endpoint publik baru.

### Infrastructure Dependencies
- **INF-001**: Runtime app harus memakai `DATABASE_URL` yang sama dengan database tempat migrations dan seed M6 diterapkan.
- **INF-002**: Environment `APP_SESSION_SECRET` harus valid karena session dan request nonce sudah bergantung pada secret ini.
- **INF-003**: Guard member harus berjalan pada Next.js server runtime, bukan hanya client redirect.

### Data Dependencies
- **DAT-001**: Baseline migrations `001` sampai `030`.
- **DAT-002**: Development seed `040_dev_seed_full.sql`.
- **DAT-003**: Browser-loginable seed `041_dev_seed_loginable_users.sql`.
- **DAT-004**: RPC `get_user_console_snapshot(uuid)`.
- **DAT-005**: RPC `get_user_asset_detail(uuid, uuid)`.
- **DAT-006**: Function `apply_subscription_status(uuid)` dan `assign_best_asset(uuid, text, uuid)`.
- **DAT-007**: Source read tambahan untuk membedakan state `/console` non-running wajib berupa helper query/RPC pendamping yang terpisah dari `get_user_console_snapshot`.

### Technology Platform Dependencies
- **PLT-001**: Next.js 16 App Router.
- **PLT-002**: `next-safe-action` sebagai server action helper.
- **PLT-003**: Tailwind CSS + primitive UI repo existing.
- **PLT-004**: `react-hook-form` + `zod` untuk form member.
- **PLT-005**: `pnpm` sebagai package manager tunggal.

### Compliance Dependencies
- **COM-001**: Struktur folder wajib sesuai `docs/agent-rules/folder-structure.md`.
- **COM-002**: Acceptance rules wajib tetap mengacu ke `docs/PRD.md`.
- **COM-003**: Invariant schema dan constraint data wajib tetap kompatibel dengan `docs/DB.md`.

## 9. Examples & Edge Cases
### 9.1 Same Package + `is_extended = true`
```ts
// Existing running subscription
{
  packageId: "pkg-paket-3",
  endAt: "2026-05-01T00:00:00Z",
  status: "active"
}
// User buys same package with durationDays = 30, isExtended = true
// Expected result:
{
  mode: "extend-existing",
  startAt: "unchanged",
  endAt: "2026-05-31T00:00:00Z",
  runningSubscriptionCount: 1
}
```
### 9.2 Different Package + `is_extended = true`
```ts
// Existing running subscription
{
  packageId: "pkg-old",
  endAt: "2026-05-01T00:00:00Z",
  status: "active"
}
// User buys new package with durationDays = 30, isExtended = true
// Expected result:
{
  mode: "replace-with-carry-over",
  oldSubscriptionStatus: "canceled",
  oldAssignments: "revoked",
  newSubscriptionStartAt: "now()",
  newSubscriptionEndAt: "max(oldEndAt, now()) + 30 days"
}
```
### 9.3 Any Package + `is_extended = false`
```ts
// Existing running subscription ends in the future
// User buys replacement package with isExtended = false
// Expected result:
{
  mode: "replace-immediately",
  carryOverDays: 0,
  newSubscriptionStartAt: "now()",
  newSubscriptionEndAt: "now() + durationDays"
}
```
### 9.4 Redeem Disabled Master Package Snapshot
```ts
// Package master disabled after key issuance
{
  packageMaster: { isActive: false },
  cdKeySnapshot: {
    isActive: true,
    usedAt: null,
    packageId: "pkg-disabled-master",
    accessKeys: ["tradingview:share"]
  }
}
// Expected:
// redeem remains allowed because activation uses cd_keys snapshot,
// not current packages.is_active
```
### 9.5 No Running Subscription But Historical State Exists
```ts
// get_user_console_snapshot returns no running subscription
{
  subscription: null,
  assets: [],
  transactions: [{ source: "payment_dummy", status: "success" }]
}

// additional console-state read returns:
{
  state: "expired",
  latestSubscription: {
    id: "sub-expired-1",
    packageId: "pkg-paket-3",
    packageName: "Paket 3",
    status: "expired",
    startAt: "2026-03-11T00:00:00Z",
    endAt: "2026-04-11T00:00:00Z"
  }
}

// Expected:
// UI must render explicit expired state, not fallback to generic "none"
```
### 9.6 Atomic CD-Key Reservation
```sql
update public.cd_keys
set used_by = :user_id,
    used_at = now()
where id = :cd_key_id
  and used_at is null
returning id, used_by, used_at;
```

Expected:
- exactly one concurrent redeem can obtain the row
- if no row is returned, the redeem flow must fail without creating a second successful activation

### 9.7 Invalid Asset Detail Request
```ts
// User clicks View on asset row that became invalid before dialog loads
// Expected:
{
  detail: null,
  uiMessage: "Asset sudah tidak tersedia."
}
```
### 9.8 Processed Subscription With Partial Access
```ts
{
  subscription: {
    status: "processed",
    packageName: "Paket 2",
    daysLeft: 24
  },
  assets: [
    { accessKey: "tradingview:share" }
  ]
}
// Expected:
// overview warns partial access,
// asset table still shows assigned asset,
// missing entitlement is not faked as available
```
## 10. Validation Criteria
- **VAL-001**: `/console` dan `/paymentdummy` dapat dibuka tanpa runtime error dari browser nyata.
- **VAL-002**: Query `/console` memakai `get_user_console_snapshot` wrapper dan tidak melakukan fetch publik internal baru.
- **VAL-003**: Asset detail memakai `get_user_asset_detail` wrapper dan tidak memuat raw asset dalam snapshot utama.
- **VAL-004**: Extend flow hanya menawarkan package aktif.
- **VAL-004A**: `/console` memiliki read contract yang benar-benar membedakan `expired`, `canceled`, dan `none`.
- **VAL-005**: Payment dummy success menulis transaction `payment_dummy` yang terhubung ke subscription hasil aktivasi.
- **VAL-006**: Redeem success menulis transaction `cdkey` yang menyimpan `cd_key_id` dan mengisi `cd_keys.used_by/used_at`.
- **VAL-007**: Redeem gagal tidak mengubah `cd_keys.used_by/used_at`.
- **VAL-008**: Semua source aktivasi memakai activation core yang sama untuk rule `is_extended`.
- **VAL-009**: Tidak pernah ada dua running subscription milik user yang sama setelah flow M6 dijalankan.
- **VAL-010**: Asset invalid tidak muncul pada read path `/console`.
- **VAL-010A**: `app_sessions.last_seen_at` bergerak maju setelah member membuka `/console` atau `/paymentdummy`, dibuktikan lewat inspeksi read-only sebelum dan sesudah request.
- **VAL-010B**: `History Subscription` benar-benar dapat merender status `pending`, `success`, `failed`, dan `canceled` bila row tersebut ada pada user yang diuji.
- **VAL-010C**: Assignment hasil payment atau redeem hanya memakai tuple exact `platform + asset_type` yang diizinkan package snapshot, dibuktikan lewat inspeksi row `subscriptions` dan `asset_assignments`.
- **VAL-011**: `pnpm lint`, `pnpm check`, dan `pnpm test` lulus.
- **VAL-012**: Browser verification milestone 6 lulus dengan akun seed browser.
- **VAL-013**: Next.js runtime diagnostics dan log dev tidak menunjukkan error relevan M6.
- **VAL-014**: Verifikasi read-only InsForge CLI membuktikan transaction, subscription, dan cdkey state konsisten dengan hasil UI.

## 11. Related Specifications / Further Reading
- `docs/IMPLEMENTATION_PLAN.md`
- `docs/PRD.md`
- `docs/DB.md`
- `docs/agent-rules/folder-structure.md`
- `migrations/README.md`
- `migrations/011_catalog_tables.sql`
- `migrations/012_subscription_tables.sql`
- `migrations/022_subscription_engine.sql`
- `migrations/024_views.sql`
- `migrations/030_rpc.sql`
- `migrations/041_dev_seed_loginable_users.sql`
- `src/modules/console/queries.ts`
- `src/modules/subscriptions/services.ts`
- `src/modules/cdkeys/services.ts`
- `src/modules/transactions/repositories.ts`
- `src/modules/sessions/services.ts`
