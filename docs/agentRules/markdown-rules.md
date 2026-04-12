# Markdown Rules

## Tujuan
Rules ini dipakai secara global saat agent menulis Markdown agar format dokumen konsisten, rapi, dan mudah dibaca.

## Aturan Umum
- Gunakan `-` untuk bullet list.
- Jangan gunakan `*` atau `+` untuk bullet list.
- Gunakan `1. 2. 3.` untuk list bernomor.
- Jangan gunakan `1)` atau format nomor lain.
- Gunakan heading yang singkat dan konsisten.
- Jangan beri baris kosong jika setelah heading langsung ada paragraf, list, atau blockquote.

## Aturan Heading dan Paragraf
- Jika setelah heading langsung ada kalimat pembuka, paragraf singkat, list, atau blockquote, tulis langsung di baris berikutnya tanpa baris kosong.
- Jika sebuah paragraf singkat menjadi pengantar untuk list berikutnya, list harus langsung dimulai di baris berikutnya tanpa baris kosong.
- Tambah satu baris kosong hanya jika benar-benar berpindah ke paragraf baru atau section baru.

### Contoh Heading dan Pengantar
```md
### 6.1. React Query
`react-query` hanya dipakai untuk query / read state.

Aturan wajib:
- jangan pakai `react-query` untuk mutation bisnis
- mutation tetap ditangani oleh Server Actions di `src/server/<domain>/actions.ts`

## 7. Kapan Pindah ke Shared
Pindahkan file dari route ke shared jika:
- dipakai minimal 3 route
- nama file sudah generik
- file tidak lagi spesifik ke satu flow halaman
```

## Aturan Bullet dan Numbered List
- Jika bullet atau nomor hanya 1 baris, tulis rapat.
- Jika bullet atau nomor punya isi lanjutan, jangan beri baris kosong setelah baris utama.
- Isi lanjutan ditulis di baris berikutnya dengan indentasi 2 spasi.
- Jika ada beberapa item multi-line dalam satu list, beri satu baris kosong antar item agar lebih rapi.
- Jika ada kalimat pengantar yang berakhir dengan `:` atau kalimat pengantar biasa, dan setelahnya langsung list, jangan beri baris kosong.
- Rule ini berlaku untuk bullet list, numbered list, checklist, dan nested list, baik setelah heading, paragraf biasa, maupun item list parent.
- Rule ini tidak menghapus satu enter antar item multi-line sibling dalam list detail, misalnya backlog yang punya `Target:`, `Acceptance:`, dan `Tests:`.

### Contoh Backlog Detail
```md
### Task Backlog
- [ ] `P1.1` Implement auth service.
  Target: `src/server/auth/service.ts`.
  Acceptance: login, register, revoke session lama berjalan.
  Tests: integration test auth service.

- [ ] `P1.2` Implement login page.
  Target: `app/(public)/login/**`.
  Acceptance: flow login/register tampil sesuai PRD.
  Tests: unit test schema dan browser E2E.
```

### Contoh List Pendek
```md
### Browser E2E Checklist
- login sebagai admin
- buka dashboard
- pastikan tidak ada browser console error
```

### Contoh Pengantar List
```md
Fitur yang wajib tersedia pada v1:
- autentikasi Email + Password
- single-device login enforcement

Ringkasan package adalah label turunan dari seluruh entitlement package.
- `private`: semua entitlement bertipe `private`
- `share`: semua entitlement bertipe `share`

Contoh entitlement package:
- `Paket_1` memiliki entitlement:
  - `tradingview/private`
  - `fxreplay/share`

Counter gagal login reset jika:
- login berhasil
- sudah melewati 15 menit sejak kegagalan terakhir.
```

### Contoh Salah
```md
Fitur yang wajib tersedia pada v1:

- autentikasi Email + Password
- single-device login enforcement

Ringkasan package adalah label turunan dari seluruh entitlement package.

- `private`: semua entitlement bertipe `private`
- `share`: semua entitlement bertipe `share`

Contoh entitlement package:

- `Paket_1` memiliki entitlement:
  - `tradingview/private`
  - `fxreplay/share`
```

### Contoh Numbered List
```md
1. Setup environment
2. Jalankan migration
3. Verifikasi hasil
```

## Aturan Checklist
- Untuk backlog task, selalu gunakan format `- [ ]`.
- Detail task ditulis di bawah item yang sama dengan indentasi 2 spasi.
- Gunakan satu enter antar task jika task memiliki detail multi-line.

## Aturan Blockquote
- Gunakan `>` untuk deskripsi singkat jika format section membutuhkannya.
- Jika blockquote terdiri dari beberapa baris yang masih satu grup, tulis berurutan tanpa baris kosong di antaranya.

Contoh:
```md
## Phase `P01` - Auth and Session
> Deskripsi singkat phase.
> **goal**: hasil utama yang ingin dicapai.
> **scope**: area kerja phase.
```

## Aturan Praktis
- Pilih satu gaya lalu konsisten di seluruh file.
- Jangan campur beberapa style bullet dalam satu dokumen.
- Jangan beri spasi vertikal berlebihan.
- Untuk section checklist pendek, gunakan list rapat.
- Untuk section backlog detail, gunakan item multi-line yang dipisah satu enter antar item.

## Prioritas Jika Ragu
1. Konsistensi format dalam satu file.
2. Kerapian visual saat dibaca cepat.
3. Kemudahan scan untuk manusia dan agent lain.
