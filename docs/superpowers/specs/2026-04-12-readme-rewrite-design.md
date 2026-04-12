# README Rewrite Design

## Tujuan
Menulis ulang `README.md` menjadi panduan utama repo dalam bahasa Indonesia natural yang cukup lengkap untuk dipakai saat membangun project real dari template ini, tanpa bergantung pada `BOILERPLATE.md` atau `rulesUI.md`.

## Pendekatan
README akan ditulis ulang secara terarah, bukan sekadar ditambal. Struktur barunya tetap fokus ke kebutuhan developer: cara menjalankan repo, memahami arsitektur inti, menemukan blok bangunan yang bisa dipakai ulang, dan mengikuti pola implementasi yang sesuai dengan codebase saat ini.

README tidak akan dijadikan changelog migrasi atau dokumen internal agent. Semua isi harus relevan untuk developer yang benar-benar memakai template ini.

## Struktur README Baru
1. Gambaran template dan tujuan utamanya
2. Quick start dan command penting
3. Tech stack dan fungsi masing-masing teknologi
4. Struktur project yang relevan untuk pengembangan harian
5. Penjelasan arsitektur utama:
   - App Router dan layout utama
   - dashboard shell
   - auth pages
   - SSR/client preferences flow
6. Sistem theme, preset, dan preferences
7. Reusable building blocks yang sudah tersedia
8. Recipe implementasi untuk kebutuhan umum project real
9. Tooling dan workflow pengembangan
10. Pitfalls dan aturan praktis agar pola template tidak rusak

## Isi Yang Wajib Disinkronkan
- Tooling sekarang memakai `ESLint + Prettier + Husky`
- `src/components/ui/*` tidak dijadikan target rule ESLint spesifik project dan di-ignore oleh Prettier
- Struktur route dan folder harus sesuai dengan hasil update upstream terbaru
- Referensi ke file reusable lama yang sudah tidak ada harus dihapus atau diganti
- README harus bisa berdiri sendiri tanpa merujuk pembaca ke `BOILERPLATE.md` atau `rulesUI.md`

## Gaya Penulisan
- Bahasa Indonesia natural dan teknis
- Istilah teknis umum boleh tetap memakai bahasa aslinya
- Penjelasan harus konkret: fungsi, lokasi file, kapan dipakai, dan batasannya
- Hindari promosi, pengulangan, dan kalimat abstrak

## Batasan
- Tidak mendokumentasikan tiap komponen UI satu per satu
- Tidak membahas detail internal migrasi tooling
- Tidak memuat dokumen kerja agent atau plan implementasi sementara
- Tidak mengandalkan file dokumentasi lain sebagai sumber penjelasan utama

## Kriteria Selesai
- `README.md` cukup lengkap untuk onboarding dan implementasi project real
- isi README cocok dengan codebase aktual
- tidak ada ketergantungan penjelasan ke `BOILERPLATE.md` dan `rulesUI.md`
- README tetap cukup ringkas untuk dibaca, meskipun lebih lengkap dari versi lama
