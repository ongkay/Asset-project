# Phase 1 Auth Design

## Tujuan
Menuntaskan Phase 1 auth secara end-to-end sesuai `docs/IMPLEMENTATION_PLAN.md`, `docs/PRD.md`, dan `docs/user-flow/auth-flow.md`, sehingga flow login, register, reset password, logout, dan validasi session benar-benar bisa dijalankan dari browser tanpa bergantung pada langkah SQL manual di tengah flow.

## Kondisi Repo Saat Ini
- Fondasi Phase 0 untuk `app_session`, role guard, `next-safe-action`, dan shell route `/console` serta `/admin` sudah ada.
- `src/modules/auth/services.ts` dan `src/modules/sessions/services.ts` sudah menangani sebagian lifecycle auth dan session.
- Route `src/app/(public)/login/page.tsx` dan `src/app/(public)/reset-password/page.tsx` masih sangat minimal, sehingga Phase 1 belum tertutup di level UI maupun browser test.

## Pendekatan
Phase 1 tetap memakai InsForge Auth untuk credential lifecycle, tetapi Next app menjadi boundary utama flow auth web. Artinya, UI hanya berbicara ke Server Actions di `src/modules/auth/actions.ts`, lalu layer service mengorkestrasi validasi, failed counter, banned check, login log, session revoke, session create, dan redirect role.

Pendekatan ini mempertahankan fondasi repo saat ini, meminimalkan refactor yang tidak perlu, dan tetap patuh pada kontrak PRD bahwa session web dikendalikan lewat cookie `app_session` dengan hash lookup di tabel `app_sessions`.

## Kontrak Session yang Wajib Dijaga
- cookie session web harus selalu bernama `app_session`
- nilai cookie membawa opaque token, bukan ID session yang bisa ditebak
- database hanya boleh menyimpan `token_hash`, bukan token mentah
- validasi session aktif harus memakai hash lookup ke `app_sessions` dengan `revoked_at is null`
- login, register, dan reset password yang berujung sukses harus me-revoke seluruh session lama user sebelum membuat session baru
- logout hanya me-revoke session aktif saat ini lalu menghapus cookie

## Arsitektur
- `src/app/(public)/login/page.tsx` dan `src/app/(public)/reset-password/page.tsx` tetap tipis dan hanya merender container route.
- Komponen UI route-local diletakkan di:
  - `src/app/(public)/login/_components/*`
  - `src/app/(public)/reset-password/_components/*`
- Semua mutation auth dari UI web hidup di `src/modules/auth/actions.ts`.
- `src/modules/auth/services.ts` menjadi orchestration layer untuk:
  - cek status email
  - login
  - register + auto login
  - failed-login counter
  - reset password request
  - reset password completion
  - redirect target berbasis role
- `src/modules/auth/repositories.ts` menangani call ke InsForge Auth dan akses data pendukung auth.
- `src/modules/sessions/*` tetap menjadi layer canonical untuk `app_session`: revoke session lama, create opaque token, hash lookup, logout, touch `last_seen_at`, dan nonce session-bound yang sudah ada.
- `src/modules/users/services.ts` tetap menjaga guarded shell route, tetapi login akan memblokir user banned sebelum session baru dibuat.

## Desain Flow `/login`
UI `/login` tetap satu route dan satu card utama.

Struktur state:
- field email dan tombol `Next` selalu terlihat
- setelah `Next`, field email tetap editable
- state tambahan selalu muncul di bawah form email, bukan mengganti step email penuh
- field email divalidasi lebih dulu sebelum request dikirim ke server
- tombol terkait harus masuk loading state dan disabled saat request sedang berjalan agar tidak terjadi double submit

Perilaku server-side:
- `Next` memanggil action pengecekan status email dan hanya mengembalikan `registered` atau `unregistered`
- jika `registered`, form password ditampilkan di bawah email form
- jika `unregistered`, dialog konfirmasi register ditampilkan
- register form baru muncul setelah user menyetujui dialog tersebut
- jika user membatalkan dialog konfirmasi register, flow kembali bersih ke email step
- jika user mengubah email lalu submit `Next` lagi, state password/register lama dan error lama dibersihkan, lalu pengecekan email dijalankan ulang
- email aktif tetap menjadi sumber kebenaran tunggal untuk step di bawahnya, jadi register flow tidak membuat field email kedua yang terpisah

### Login untuk Email Terdaftar
Submit password menjalankan urutan berikut:
1. validasi input
2. reset failed counter lebih dulu jika kegagalan terakhir sudah lewat 15 menit
3. cek banned state sebelum membuat `app_session`
4. sign in via InsForge Auth
5. jika gagal, tulis login log gagal dan naikkan failed counter
6. jika berhasil, reset failed counter, revoke semua session lama user, buat `app_session` baru, tulis login log sukses, lalu redirect sesuai role:
   - member ke `/console`
   - admin ke `/admin`

Perilaku UI login:
- email aktif tetap terlihat selama password step berjalan
- password field pada login wajib mendukung show/hide dengan icon mata di sebelah kanan
- sebelum ambang 5 gagal tercapai, CTA atau dialog reset password tidak boleh terlihat
- tepat setelah kegagalan ke-5, UI menampilkan reset prompt yang jelas dalam bentuk dialog yang mengarahkan user ke flow reset password
- dialog reset itu minimal memuat pesan bahwa user sebaiknya mereset password untuk melanjutkan dan memiliki CTA `Reset Password`
- jika user masuk ke `/reset-password` dari dialog ini, email aktif boleh diprefill untuk membantu UX, tetapi halaman reset tetap boleh dibuka secara mandiri
- login sukses tidak menampilkan layar sukses terpisah; flow langsung berlanjut ke redirect shell yang benar

### Register untuk Email Baru
Submit register menjalankan urutan berikut:
1. validasi email, password, dan `confirmPassword`
2. pastikan password minimal 6 karakter dan `confirmPassword` wajib sama dengan password
3. create user via InsForge Auth
4. ambil profile hasil bootstrap
5. revoke session lama user bila ada
6. buat `app_session` baru
7. tulis login log sukses
8. redirect sesuai role

Register tidak dipisah ke halaman lain. Konfirmasi untuk email yang belum terdaftar tetap berupa dialog, sesuai PRD dan `docs/user-flow/auth-flow.md`.
Form register wajib menampilkan dua field password, yaitu `password` dan `confirmPassword`.
Semua field password pada register wajib mendukung show/hide dengan icon mata di sebelah kanan.
Register sukses tidak menampilkan layar sukses terpisah; flow langsung auto login lalu redirect ke shell yang benar.

## Desain Flow `/reset-password`
Route `/reset-password` memiliki empat state utama:
- request reset
- generic success state setelah request terkirim
- set password baru jika link valid
- invalid/expired link state jika token tidak valid

### Request Reset
- user mengirim email lewat form tunggal
- server memanggil flow kirim email reset via InsForge Auth
- UI selalu menampilkan pesan sukses generik yang sama, baik email terdaftar maupun tidak
- jika terjadi kegagalan sistem nyata saat mengirim reset email, UI menampilkan error umum tanpa membocorkan keberadaan akun
- tombol submit request reset harus loading dan disabled saat request berjalan

### Complete Reset
- user membuka link reset dari actual dev inbox
- route membaca `code` dan `email` dari query parameter
- server menukar token reset menjadi state reset yang valid
- jika token invalid atau expired, tampilkan state error yang jelas dan CTA untuk meminta link baru
- jika valid, tampilkan form password baru dengan dua field: `password` dan `confirmPassword`
- submit password baru menjalankan:
  1. validasi password minimal 6 karakter
  2. pastikan `confirmPassword` wajib sama dengan password
  3. update password via InsForge Auth
  4. ambil snapshot user/profile yang valid
  5. revoke session lama user
  6. buat `app_session` baru
  7. redirect ke `/console` atau `/admin`

Perilaku UI reset completion:
- kedua field password wajib mendukung show/hide dengan icon mata di sebelah kanan
- submit harus loading dan disabled saat request berjalan
- setelah sukses, tidak ada layar sukses panjang; flow langsung redirect ke shell yang benar

## Error Handling dan Rule Server
- failed login counter dihitung per email di server-side
- counter hanya bertambah saat submit password gagal untuk email terdaftar
- counter reset saat login berhasil
- counter reset juga jika kegagalan terakhir sudah lewat 15 menit
- reset prompt baru muncul setelah 5 kegagalan beruntun pada email aktif tersebut
- user dengan `is_banned = true` ditolak saat login sebelum `app_session` baru dibuat
- semua field password di login, register, dan reset wajib mendukung show/hide
- register dan set password baru wajib memakai dua field password yang harus cocok sebelum submit berhasil
- error validasi ditampilkan dekat field terkait dengan copy yang konsisten dengan dokumen flow auth
- login sukses dan gagal sama-sama ditulis ke `login_logs`
- error submit login untuk password salah harus jelas dan tetap terikat pada email aktif yang sedang diproses
- logout hanya me-revoke session aktif saat ini dan menghapus cookie `app_session`

## Copy dan State UI Minimum
Copy implementasi harus tetap sejalan dengan `docs/user-flow/auth-flow.md`. Minimal state dan pesan yang wajib tersedia:

### `/login`
- state default email step
- state loading saat cek email
- state password step untuk email terdaftar
- state dialog konfirmasi register untuk email baru
- state register step setelah dialog disetujui
- state error login saat password salah
- state reset prompt setelah gagal login mencapai ambang
- pesan validasi minimum:
  - `Email wajib diisi.`
  - `Masukkan alamat email yang valid.`
  - `Password wajib diisi.`
  - `Password yang Anda masukkan salah. Coba lagi.`
  - `Lupa password? Reset password untuk lanjut.`

### Register step di `/login`
- pesan validasi minimum:
  - `Password minimal 6 karakter.`
  - `Konfirmasi password wajib diisi.`
  - `Konfirmasi password harus sama dengan password.`
  - `Akun tidak bisa dibuat sekarang. Coba beberapa saat lagi.`

### `/reset-password`
- state request reset
- state sukses generik setelah request terkirim
- state form set password baru saat token valid
- state invalid/expired link saat token tidak valid
- pesan validasi minimum:
  - `Email wajib diisi.`
  - `Masukkan alamat email yang valid.`
  - `Permintaan reset password belum berhasil. Coba beberapa saat lagi.`
  - `Link reset password tidak valid atau sudah kedaluwarsa. Minta link baru untuk lanjut.`
  - `Password baru wajib diisi.`
  - `Konfirmasi password baru wajib diisi.`
  - `Konfirmasi password baru harus sama dengan password baru.`
  - `Password baru belum berhasil disimpan. Coba beberapa saat lagi.`

## Dev-Only Verifiability
Phase 1 butuh verifikasi browser yang repeatable tanpa menunggu 15 menit manual.

Karena itu akan ditambahkan helper dev-only kecil untuk membuat state failed-login counter terlihat expired saat smoke test browser dijalankan. Helper ini:
- hanya aktif di environment development/test
- tidak menjadi jalur auth alternatif
- tidak mengubah flow utama user
- hanya dipakai untuk membuktikan rule reset counter 15 menit dari browser

Flow reset password tetap diverifikasi lewat actual dev inbox, bukan token input manual atau jalur testing palsu di UI utama.

## File Placement
- `src/app/(public)/login/page.tsx`
- `src/app/(public)/login/_components/*`
- `src/app/(public)/reset-password/page.tsx`
- `src/app/(public)/reset-password/_components/*`
- `src/modules/auth/actions.ts`
- `src/modules/auth/services.ts`
- `src/modules/auth/repositories.ts`
- `src/modules/auth/schemas.ts`

Jika perlu state client ringan untuk auth flow visual, state itu tetap route-local dan tidak boleh memindahkan business logic keluar dari server-side domain layer.

## Kriteria Selesai Phase 1
Implementasi dianggap sesuai desain ini jika hal-hal berikut terbukti dari browser nyata:
- login seed member sukses dan redirect ke `/console`
- login seed admin sukses dan redirect ke `/admin`
- email baru bisa lanjut register lewat dialog konfirmasi lalu auto login
- password < 6 ditolak pada register dan reset password
- register dan set password baru menolak submit jika `confirmPassword` tidak sama dengan password
- show/hide bekerja di semua field password
- reset prompt belum terlihat sebelum 5 login gagal beruntun pada email yang sama
- reset prompt baru muncul setelah 5 login gagal beruntun
- reset prompt dan CTA hilang kembali setelah login berhasil
- rule reset counter 15 menit bisa diverifikasi repeatable lewat helper dev-only
- request reset password untuk email tak terdaftar tetap memberi pesan generik yang sama
- flow reset password yang valid bisa diselesaikan sampai redirect ke shell yang benar
- link reset invalid/expired menampilkan error state yang benar
- logout membuat route guarded tidak bisa diakses tanpa login ulang
- login di browser kedua langsung membuat session lama tidak valid
- reload halaman setelah login tetap membaca `app_session` dengan benar

## Di Luar Scope Phase 1
- dashboard member final `/console` tetap ditunda ke Phase 6
- dashboard admin final `/admin` tetap ditunda ke Phase 9
- flow payment, CD-Key, subscription overview, dan extension API tidak disentuh di phase ini selain menjaga guard/session contract yang sudah menjadi fondasi bersama
