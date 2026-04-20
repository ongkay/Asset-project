# Milestone 9 Admin Home ASCII Mockup

Referensi visual mockup ini:
- `src/app/(main)/dashboard/default/page.tsx`
- `src/app/(main)/dashboard/default/_components/section-cards.tsx`
- `src/app/(main)/dashboard/default/_components/chart-area-interactive.tsx`
- `src/app/(main)/dashboard/crm/page.tsx`
- `src/app/(main)/dashboard/crm/_components/overview-cards.tsx`
- `src/app/(main)/dashboard/crm/_components/insight-cards.tsx`
- `src/app/(main)/dashboard/crm/_components/operational-cards.tsx`

Catatan:
- mockup ini hanya untuk area konten `admin home`
- tidak mencakup sidebar atau header shell
- komposisi utamanya mengikuti pola `overview cards` + `insight cards` + `operational cards`
- seluruh layout dibungkus satu outer box agar lebih mudah discan

```text
+------------------------------------------------------------------------------------------------------------------------------------------------+
|                                                                                                                                                |
| +---------------------------+ +---------------------------+ +---------------------------+ +----------------------------------------------------+ |
| | Total Member              | | Member Berlangganan       | | Total Asset               | | Total Transaksi Sukses                             | |
| | 1,284                     | | 842                       | | 1,932                     | | Rp 184.250.000                                     | |
| | +4.8% vs bulan lalu       | | +2.1% vs bulan lalu       | | +36 inventory bulan ini   | | +12.5% vs range sebelumnya                         | |
| +---------------------------+ +---------------------------+ +---------------------------+ +----------------------------------------------------+ |
|                                                                                                                                                |
| +--------------------------------------------------------------------------------------------------------------------------------------------+ |
| | Sales Trend                                                                                                                                | |
| | Total transaksi sukses dalam Rupiah                                                                                                        | |
| |                                                                                                                          [30 hari] [90 hari] | |
| |                                                                                                                                            | |
| | Rp 220M |                                                                                                                       __         | |
| | Rp 180M |                                                                                                           __         _/  \_      | |
| | Rp 140M |                                                                                              __         _/  \_     _/      \     | |
| | Rp 100M |                                                                                   __       _/  \_    __/      \___/         \    | |
| | Rp  60M |                                                                       __        _/  \_   _/     \___/                            | |
| | Rp  20M |                                                         __          __/  \__  __/      \_/                                    | |
| | Rp   0  +-------------------------------------------------------------------------------------------------------------------------------   | |
| |          01    04    07    10    13    16    19    22    25    28    30                                                                  | |
| +--------------------------------------------------------------------------------------------------------------------------------------------+ |
|                                                                                                                                                |
| +------------------------------------------------------------------+ +-----------------------------------------------------------------------+ |
| | Member Growth                                                    | | Live User                                                             | |
| | Member baru / aktif per bulan                                    | | Online <= 10 menit                                                    | |
| |                                                                  | |                                                                       | |
| | 1300 |                                                     /\    | | AV  naufal      member      20 detik lalu                            | |
| | 1100 |                                            /\      /  \   | | AV  azka        member      1 menit lalu                             | |
| |  900 |                                  /\       /  \____/    \  | | AV  dinda       member      2 menit lalu                             | |
| |  700 |                         /\      /  \_____/              \ | | AV  rafi        member      4 menit lalu                             | |
| |    0 +-------------------------------------------------------    | | AV  alvin       member      6 menit lalu                             | |
| |       Jan      Feb      Mar      Apr      Mei                     | | AV  iqbal       member      7 menit lalu                             | |
| |                                                                  | | Menampilkan 1-6 dari 43 user                                         | |
| | +35 member aktif sejak bulan lalu                                | |               [< Prev]  [Next >]                                     | |
| |                                                                  | |                                                                       | |
| |                                                                  | | 43 user online sekarang                                              | |
| +------------------------------------------------------------------+ +-----------------------------------------------------------------------+ |
|                                                                                                                                                |
| +------------------------------------------------------------------+ +-----------------------------------------------------------------------+ |
| | Transactions                                                     | | Subscription Composition                                              | |
| | Jumlah transaksi sukses per hari                                 | | Ringkasan subscription berjalan                                       | |
| |                                                                  | |                                                                       | |
| | 180 |                                                     ███    | |                   *********                                           | |
| | 140 |                                            ███    █████    | |               ****  Mixed  ****                                       | |
| | 100 |                                 ███   ███ █████ ███████    | |             ***               ***                                     | |
| |  60 |                        ███   █████ █████ █████ ███████     | |            ** Private 311   Share 274 **                             | |
| |   0 +-------------------------------------------------------     | |             ***               ***                                     | |
| |       01   05   10   15   20   25   30                           | |               *******************                                     | |
| |                                                                  | |                   Mixed 257                                           | |
| +------------------------------------------------------------------+ +-----------------------------------------------------------------------+ |
|                                                                                                                                                |
| +------------------------------------------------------------------+ +--------------------------------------+ +-----------------------------+ |
| | Revenue by Source                                                | | Asset Health                         | | Quick Operational Notes     | |
| |                                                                  | |                                      | |                             | |
| | payment_dummy   52%  #####################                       | | Available    1,204  ################ | | - mixed masih cukup tinggi | |
| | admin_manual    31%  #############                               | | Assigned       488  ########         | | - share relatif stabil     | |
| | cdkey           17%  #######                                     | | Disabled       143  ###              | | - live user sehat          | |
| |                                                                  | | Expired         97  ##               | | - cek processed backlog    | |
| +------------------------------------------------------------------+ +--------------------------------------+ +-----------------------------+ |
+------------------------------------------------------------------------------------------------------------------------------------------------+
```
