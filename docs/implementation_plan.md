# Implement Member Area & Redirect Updates

Dokumen ini adalah plan final yang siap dieksekusi untuk memindahkan landing area member dari `/console` ke `/member`, membangun page baru sesuai mockup, dan menjaga `/console` sebagai legacy redirect.

## Target Outcome

- Login sukses untuk user dengan role `member` harus redirect ke `/member`.
- Route baru `/member` harus dibangun di `src/app/(member)/member/page.tsx`.
- `/console` tidak lagi menjadi landing utama dan harus menjadi redirect ke `/member`.
- UI `/member` harus mengikuti `docs/mockup/member-area.html` sedekat mungkin tanpa melanggar aturan token/theme repo.
- CTA wajib:
  - Renew Subscription -> `/checkout`
  - Hubungi Admin -> `https://wa.link/w3xnqc`
  - Grup Telegram -> `https://t.me/pk_oa`
- Thumbnail tutorial wajib memakai asset lokal yang sudah tersedia:
  - `/public/member/thumbnail-pc.jpg`
  - `/public/member/thumbnail-hp.jpg`

## Non-Negotiables

- Gunakan `pnpm` saja.
- Jangan membuat `src/app/(member)/page.tsx`.
- Route `/member` harus hidup di `src/app/(member)/member/page.tsx` karena route group `(member)` tidak masuk URL.
- `src/app/**` hanya untuk route, layout, dan route-local components.
- Business logic dan read model tetap reuse dari `src/modules/**`.
- Jangan memperkenalkan stack UI baru.
- Jangan ubah `src/app/globals.css` untuk kebutuhan halaman tunggal ini.
- Gunakan semantic tokens dari repo sebagai default. Arbitrary value hanya boleh dipakai tipis untuk gap visual kecil yang memang perlu agar mockup tetap dekat.
- Reuse primitive existing di `src/components/ui/**`.

## Existing Source Of Truth

### Routing and Auth

- `src/app/(member)/layout.tsx`
- `src/modules/auth/services.ts`
- `src/modules/auth/types.ts`
- `src/modules/users/services.ts`

### Member Data

- `src/modules/console/queries.ts`
- `src/modules/console/types.ts`
- `getConsoleSnapshot()`
- `getConsoleStateSnapshot()`

### Existing Reusable Member Flow

- `src/app/(member)/console/_components/console-redeem-dialog/console-redeem-dialog.tsx`
- `src/modules/cdkeys/actions.ts`
- `src/modules/cdkeys/schemas.ts`
- `src/modules/auth/actions.ts`

### Shared UI and Helpers

- `src/components/ui/card.tsx`
- `src/components/ui/button.tsx`
- `src/components/ui/badge.tsx`
- `src/components/ui/avatar.tsx`
- `src/components/ui/dropdown-menu.tsx`
- `src/components/ui/tabs.tsx`
- `src/components/ui/dialog.tsx`
- `src/components/ui/aspect-ratio.tsx`
- `src/components/ui/input-group.tsx`
- `src/components/ui/sonner.tsx`
- `src/components/shared/app-providers.tsx`
- `src/lib/utils.ts`
- `src/lib/avatar.ts`

## Implementation Scope

### 1. Build Canonical `/member` Route

#### [NEW] `src/app/(member)/member/page.tsx`

- Buat server route baru untuk URL `/member`.
- Load data dengan `Promise.all`:
  - `requireMemberShellAccess()`
  - `getConsoleSnapshot()`
  - `getConsoleStateSnapshot()`
- Parse `paymentError` search param agar legacy flow dari `paymentdummy` tetap bekerja.
- Jangan memindahkan read logic ke file ini. File ini hanya bootstrap data dan render page.

#### [NEW] `src/app/(member)/member/_components/*`

Komponen route-local yang disarankan:

- `member-page.tsx`
- `member-user-menu.tsx`
- `member-subscription-card.tsx`
- `member-support-card.tsx`
- `member-installation-tabs.tsx`
- `member-video-dialog.tsx`
- `member-redeem-dialog.tsx`
- `member-page-content.ts`

Tanggung jawab komponen:

- `member-page.tsx`
  - Menyusun shell halaman: header, welcome section, grid utama, modal, toast trigger flow.
- `member-user-menu.tsx`
  - Avatar, username, dropdown action, dan logout.
- `member-subscription-card.tsx`
  - Tampilkan status subscription dan CTA utama.
- `member-support-card.tsx`
  - Render dua support links.
- `member-installation-tabs.tsx`
  - Render tab PC dan Android, daftar langkah, thumbnail, dan trigger video.
- `member-video-dialog.tsx`
  - Render modal video YouTube dengan close interaction lengkap.
- `member-redeem-dialog.tsx`
  - Adaptasi dialog redeem lama dengan toast sukses.
- `member-page-content.ts`
  - Menjadi source lokal tunggal untuk tutorial steps, download link, label tab, dan YouTube IDs.

### 2. Convert `/console` Into Legacy Redirect

#### [MODIFY] `src/app/(member)/console/page.tsx`

- Ubah page ini menjadi server-side redirect ke `/member`.
- Jika ada `paymentError`, teruskan ke `/member?paymentError=...`.
- Route ini tidak lagi merender UI console lama.

### 3. Update All Member Redirect Contracts

#### [MODIFY] `src/modules/auth/services.ts`

- Ubah member redirect target dari `"/console"` ke `"/member"`.
- Update hardcoded register success redirect untuk member ke `"/member"`.

#### [MODIFY] `src/modules/auth/types.ts`

- Ubah union `AuthRedirectTarget` agar memakai `"/member"` menggantikan `"/console"`.

#### [MODIFY] `src/modules/subscriptions/services.ts`

- Ubah hasil success flow payment dummy agar redirect ke `"/member"`.

#### [MODIFY] `src/modules/subscriptions/types.ts`

- Ubah literal redirect type dari `"/console"` ke `"/member"`.

#### [MODIFY] `src/modules/checkout/types.ts`

- Ubah union result type yang masih memakai `"/console"` agar memakai `"/member"`.

### 4. Update Other Affected Routes and Links

#### [MODIFY] `src/app/(member)/paymentdummy/page.tsx`

- Ubah redirect error target ke `/member?paymentError=...`.
- Redirect valid package tetap ke `/checkout?packageId=...`.

#### [MODIFY] `src/app/(member)/checkout/_components/checkout-page.tsx`

- Ubah backlink dari `/console` ke `/member`.

#### [MODIFY] `src/app/(member)/payment/[transactionId]/_components/payment-client.tsx`

- Ubah success CTA dan backlink yang masih mengarah ke `/console` menjadi `/member`.
- Ubah copy “Kembali ke console” menjadi copy yang sesuai dengan landing baru member.

#### [MODIFY] `src/app/(public)/email-verified/page.tsx`

- Ubah link dan copy yang masih menyebut `/console` menjadi `/member` atau “member area”.

#### [MODIFY] `src/app/(main)/layout.tsx`

- Ubah banner legacy route group agar menyebut `/member`, bukan `/console`.

## UI Requirements For `/member`

### Header

- Sticky top header.
- Logo kiri.
- User dropdown kanan.
- Reuse avatar helper yang ada.

### Welcome Section

- Menampilkan sapaan personal ke username member.
- Copy mengikuti intent mockup: mengelola subscription dan akses extension.

### Subscription Card

- Wajib menampilkan:
  - status badge
  - active plan
  - start date
  - expiry date
- Harus menangani semua state:
  - `active`
  - `processed`
  - `expired`
  - `canceled`
  - `none`
- CTA wajib:
  - `Redeem Code`
  - `Renew Subscription`

### Support Card

- Item 1: Hubungi Admin -> `https://wa.link/w3xnqc`
- Item 2: Grup Komunitas -> `https://t.me/pk_oa`
- External links aman dengan `target="_blank"` dan `rel="noreferrer"` bila dibuka tab baru.

### Tutorial Tabs

- Dua tab:
  - `PC / Laptop`
  - `Android (Kiwi)`
- Download link extension:
  - `https://tvlink.netlify.app/tvlink.zip`
- Thumbnail:
  - `/member/thumbnail-pc.jpg`
  - `/member/thumbnail-hp.jpg`
- YouTube video IDs:
  - PC -> `rjQpnHK5zTw`
  - Android -> `hm2RDtn427U`

### Redeem Modal

- Harus memakai:
  - `react-hook-form`
  - `zod`
  - `next-safe-action`
- Input wajib memakai left icon.
- Saat redeem sukses:
  - modal close
  - route refresh
  - tampilkan toast sukses via `toast` dari `sonner`

### Video Modal

- Klik thumbnail membuka iframe YouTube.
- Harus bisa ditutup lewat:
  - tombol close
  - klik overlay
  - tombol `Escape`

## Implementation Notes

- `toast` gunakan langsung dari `sonner`.
- Provider `Toaster` sudah tersedia via `src/components/shared/app-providers.tsx`.
- Jangan mempertahankan `ConsolePage` sebagai UI yang masih user-facing di `/console`; setelah perubahan ini route tersebut berfungsi sebagai redirect legacy.
- Bila perlu reuse logic dari `console-redeem-dialog`, adaptasi secukupnya tanpa refactor besar ke shared abstraction baru.
- Untuk visual, utamakan semantic classes seperti `bg-card`, `text-foreground`, `border-border`, `bg-muted`, `text-muted-foreground`, `bg-primary`, dan turunannya.
- Arbitrary value boleh dipakai hanya bila diperlukan untuk mendekati mockup dan tidak merusak theme preset/light-dark compatibility.

## Test Plan

### Update Existing Tests

#### [MODIFY] `tests/unit/modules/auth/services.test.ts`

- Ubah expected redirect sukses member dari `/console` menjadi `/member`.

#### [MODIFY] `tests/unit/modules/subscriptions/services.test.ts`

- Ubah expected redirect success payment dummy dari `/console` menjadi `/member`.

#### [MODIFY] `tests/unit/app/member/paymentdummy-page.test.ts`

- Ubah expected redirect error dari `/console?paymentError=...` menjadi `/member?paymentError=...`.

#### [MODIFY] `tests/unit/app/public/email-verified-page.test.ts`

- Ubah expected link dari `/console` menjadi `/member` dan update copy expectation bila perlu.

### Replace Legacy Console Route Coverage

#### [MODIFY] `tests/unit/app/member/console-page.test.ts`

- Ubah test ini agar memverifikasi `/console` sekarang redirect ke `/member`, bukan lagi bootstrap `ConsolePage`.

#### [MODIFY] `tests/unit/app/member/console-ui.test.ts`

- Sesuaikan atau hapus assertion yang masih menganggap `ConsolePage` adalah member landing utama.
- Jika tetap berguna untuk komponen lama, pindahkan fokus test ke komponen yang masih dipakai; jika tidak dipakai lagi untuk landing, jangan jadikan source of truth baru.

### Add New `/member` Route Coverage

#### [NEW] `tests/unit/app/member/member-page.test.ts`

- Verifikasi page baru melakukan bootstrap data yang benar.
- Verifikasi `paymentError` diteruskan ke props/client composition yang tepat.

#### [NEW] `tests/unit/app/member/member-ui.test.ts`

- Verifikasi render elemen utama:
  - welcome section
  - subscription card
  - support links
  - tutorial tabs
  - thumbnail path
  - CTA renew ke `/checkout`
  - redeem input tetap memakai left icon

## Verification Plan

### Required Commands

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm check:fix`

### Browser Verification

Wajib verifikasi flow berikut:

- Login sukses sebagai member mengarah ke `/member`.
- Akses `/console` redirect ke `/member`.
- Akses `paymentdummy` error redirect ke `/member?paymentError=...`.
- CTA `Renew Subscription` membuka `/checkout`.
- Link WhatsApp dan Telegram benar.
- Redeem modal bisa dibuka, validasi form tampil, submit sukses menutup modal dan memunculkan toast.
- Tabs tutorial PC/Android bisa diganti.
- Video modal bisa dibuka dan ditutup dengan benar.
- Layout tetap rapi di desktop dan mobile.

### Runtime Sanity Check

- Pastikan tidak ada error runtime relevan pada browser console.
- Pastikan tidak ada error relevan di log dev server setelah flow utama diuji.

## Done Criteria

Pekerjaan dianggap selesai jika:

- `/member` sudah menjadi canonical landing area untuk member.
- `/console` sudah menjadi legacy redirect.
- Seluruh redirect contract member yang relevan sudah dipindahkan ke `/member`.
- UI `/member` sudah sesuai mockup secara dekat dan tetap patuh pada rules repo.
- Thumbnail lokal dipakai.
- Redeem flow tetap bekerja.
- Test yang relevan diperbarui/ditambah.
- Semua command verifikasi wajib lulus.
