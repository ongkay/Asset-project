# UI/UX Rules

## Tujuan
Dokumen ini adalah source of truth untuk semua pekerjaan UI/UX di project ini.
Fokusnya adalah membuat hasil yang terasa siap produksi, konsisten dengan design tokens di `src/app/globals.css`, dan tidak terlihat seperti demo atau template.

## Skills Wajib
Gunakan skill berikut sesuai konteks kerja.

| Skill                 | Wajib Dipakai Untuk                                                                                            |
| --------------------- | -------------------------------------------------------------------------------------------------------------- |
| `ui-ux-pro-max`       | Semua desain, review, refactor, layout, motion, accessibility, dan keputusan visual/UX                         |
| `next-best-practices` | Semua perubahan Next.js App Router, layout, page, loading, error, metadata, dan RSC boundary yang menyentuh UI |
| `shadcn`              | Semua pemilihan, penggunaan, penyesuaian, dan debugging komponen shadcn/ui atau primitive UI yang sudah ada    |
| `agent-browser`       | Verifikasi browser manual, visual QA, responsive check, dan pembuktian flow end-to-end                         |
| `find-docs`           | Saat UI bergantung pada API/library pihak ketiga dan perlu verifikasi dokumentasi terbaru                      |

## Prinsip Utama
- UI harus terasa seperti produk nyata, bukan demo.
- Copy harus menjawab tujuan user, bukan menjelaskan implementasi.
- Setiap screen harus punya satu tujuan utama yang jelas.
- Jangan menambahkan elemen dekoratif yang tidak membantu keputusan atau aksi user.
- Jangan menampilkan istilah internal seperti `phase`, `demo`, `template`, `backend`, `route`, `threshold`, atau nama vendor teknis di copy user-facing.

## Referensi Visual
Untuk screen internal yang sifatnya authenticated app, bahasa visual yang harus diikuti adalah bahasa dashboard demo yang sudah ada di `src/app/(main)/dashboard/*`. khusus untuk rout admin wajib ikuti visual src/app/(admin)/admin/assets/*

Ciri yang harus ditiru:
- shell desktop dengan sidebar kiri dan top bar yang rapih
- content area inset dengan padding konsisten, bukan full-bleed acak
- section berbasis card dengan border tipis dan shadow ringan
- KPI cards dengan aksen halus, bukan dekorasi berlebihan
- toolbar compact dengan search, filter, select, dan action button yang jelas
- tab, select, dropdown, dan table header yang terasa seragam
- sticky table header untuk data grid panjang
- chart card yang ringkas, bersih, dan mudah dibaca

Yang boleh ditiru adalah bahasanya, bukan placeholder datanya.
Jangan menyalin teks demo, angka palsu, atau label internal template ke UI produk.

## Kesesuaian Dengan `globals.css`
Semua UI harus dibangun di atas token dan preset yang sudah ada di `src/app/globals.css`.

Aturan wajib:
- gunakan semantic tokens seperti `bg-background`, `text-foreground`, `bg-card`, `text-card-foreground`, `bg-popover`, `text-popover-foreground`, `bg-muted`, `text-muted-foreground`, `bg-primary`, `text-primary-foreground`, `border-border`, `bg-input`, dan `ring-ring`
- hormati mode light dan dark tanpa membuat style khusus per-page yang hardcoded
- hormati `data-theme-preset` yang sudah ada; UI harus tetap terbaca pada preset default, brutalist, soft-pop, dan tangerine
- jangan hardcode warna hex atau warna brand baru di komponen feature jika token semantic sudah tersedia
- jangan menambah override global baru untuk kebutuhan halaman tunggal
- jangan mengubah font family secara ad hoc; pakai sistem font yang sudah disediakan lewat `data-font` dan CSS variables yang ada
- gunakan skala radius dan shadow yang sudah tersedia; jangan menciptakan shadow atau radius liar yang tidak selaras dengan tokens
- untuk card dan panel internal, pakai radius dan shadow yang lembut seperti `rounded-xl`, `shadow-xs`, atau `shadow-sm`; jangan membuat elevation yang terlalu berat
- bila butuh aksen visual, gunakan gradien halus seperti `from-primary/5 to-card`, bukan background penuh yang ramai
- gunakan container query / responsive density yang sudah selaras dengan layout dashboard demo, bukan layout kaku satu ukuran untuk semua

Aturan tambahan:
- komponen harus tetap kontras dan terbaca di light dan dark mode
- border, divider, dan state fokus harus tetap terlihat di kedua mode
- jangan bergantung pada satu preset tema tertentu untuk terlihat bagus

## Layout Dan Hierarki
- desain mobile-first, lalu scale up ke desktop
- hindari horizontal scroll
- gunakan spacing 4/8px secara konsisten
- pertahankan satu konteks visual utama per layar
- jaga lebar baca yang nyaman untuk teks panjang
- gunakan satu primary CTA dominan per section atau toolbar, secondary action harus lebih tenang secara visual
- jangan campur pola navigasi yang tidak perlu pada level yang sama

## Form Dan Input
- semua input harus punya label yang terlihat
- placeholder bukan pengganti label
- helper text hanya dipakai jika membantu user mengambil keputusan
- error harus muncul dekat field yang bermasalah
- setelah submit gagal, fokus ke field pertama yang error
- semua input password harus punya show/hide toggle
- gunakan state loading, disabled, success, dan error yang jelas
- jangan gunakan istilah teknis di helper text form

## Copy Dan Tone
- gunakan bahasa yang singkat, jelas, dan langsung ke tujuan user
- hindari copy internal seperti penjelasan implementasi, alur backend, atau istilah engineering
- hindari badge atau label yang menonjolkan tahap pembangunan
- hindari paragraph yang menjelaskan cara kerja sistem jika user tidak perlu tahu
- untuk auth dan reset password, gunakan copy yang menenangkan, privat, dan to the point
- untuk admin, gunakan copy operasional yang jelas, bukan copy marketing

## Visual Quality
- jangan pakai emoji sebagai icon sistem
- pakai satu keluarga icon yang konsisten, seperti Lucide, untuk seluruh UI
- hindari hero section, testimonial, dan marketing card pada flow internal seperti login, reset password, console, atau admin
- untuk auth page, gunakan form card yang rapi dan terpercaya, bukan landing page dengan ornamen promosi
- untuk dashboard dan admin, gunakan card, badge, chart, tabs, dan table seperti komposisi demo dashboard yang sudah ada
- hindari layout template generik yang berisi banyak badge, statistik palsu, atau filler text
- gunakan ritme visual yang konsisten di seluruh halaman
- elemen interaktif harus jelas, cukup besar, dan punya feedback saat ditekan atau difokuskan

## Accessibility
- jaga kontras minimal 4.5:1 untuk teks normal
- semua kontrol interaktif harus bisa dipakai keyboard
- icon-only button harus punya label aksesibel
- jangan bergantung pada warna saja untuk menyampaikan status
- gunakan aria-live atau role alert untuk error form bila relevan
- hormati prefers-reduced-motion
- pastikan focus state selalu terlihat

## Motion Dan Feedback
- animasi micro-interaction idealnya 150-300ms
- gunakan motion untuk memberi makna, bukan dekorasi
- loading state harus jelas, tidak diam tanpa feedback
- gunakan skeleton atau progress indicator jika loading cukup lama
- hindari animasi yang mengubah layout secara kasar

## Tables, Admin Screens, Dan Dashboard
- semua tabel admin harus punya search, filter dropdown, view column persistence, dan pagination
- jika tabel menampilkan user, tampilkan avatar, username, dan email
- jika avatar kosong, gunakan fallback inisial yang konsisten
- chart harus punya label, tooltip, dan alternatif tabel bila perlu
- state kosong harus menjelaskan kondisi dan langkah lanjut
- table shell harus mengikuti gaya demo dashboard: header alat di atas, sticky header, border tipis, dan footer pagination yang rapi
- gunakan `@container/*` atau density responsif bila layout membantu dashboard terasa seperti produk matang, bukan form statis
- KPI card boleh memakai aksen visual ringan, tetapi tetap harus dibangun di atas token dan tetap terbaca di dark mode

## Review Checklist
Sebelum selesai, pastikan:
- UI tidak mengandung copy demo atau copy internal
- halaman terasa siap produksi saat dilihat pertama kali
- light mode dan dark mode sama-sama terbaca
- mobile dan desktop sama-sama nyaman dipakai
- semua action utama jelas dan satu langkah dari tujuan user
- browser test sudah dilakukan untuk flow yang terdampak
- tidak ada elemen dekoratif yang mengganggu tugas user

## Larangan Wajib
- jangan menulis copy seperti dokumentasi teknis di UI user-facing
- jangan meniru pola dashboard demo/template lama jika bertentangan dengan PRD
- jangan membuat halaman auth atau reset password terasa seperti marketing page
- jangan menambahkan warna, shadow, radius, atau font baru tanpa alasan design-system yang jelas
- jangan mengubah `src/app/globals.css` untuk kebutuhan spesifik satu layar tanpa revisi design system yang disengaja

## Prioritas Saat Ragu
1. Kejelasan tugas user.
2. Konsistensi dengan tokens `globals.css`.
3. Aksesibilitas dan kontras.
4. Kerapian visual dan hierarki.
5. Baru kemudian efek atau dekorasi.
