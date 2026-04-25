Browser Extension Asset Manager

**Tujuan:** Mengelola akses akun premium (TradingView, FXReplay, FXTester) melalui sistem injeksi cookie secara otomatis dan aman bagi pengguna terautentikasi.

---

## 1. Fitur Utama 1: Panel Popup Extension
Fitur ini mengatur tampilan antarmuka (UI) extension saat ikon di-klik, berdasarkan status akun dan versi aplikasi.

### **State 1: Unauthenticated (Belum Login)**
* **Kondisi:** User belum login di web apps (`http://localhost:3000`).
* **Tampilan:** Hanya menampilkan satu tombol **"Login"**.
* **Aksi:** Klik tombol akan membuka tab baru ke `http://localhost:3000/login`.

### **State 2: Authenticated & Active (Langganan Aktif)**
* **Kondisi:** User sudah login dan memiliki status langganan `active` atau `processed`.
* **Komponen UI:**
    * **Header:** Logo, Nama Extension, dan Sub-heading Versi.
    * **Refresh Icon:** Di pojok kanan. Menampilkan animasi *spinner* saat proses fetching data.
    * **Update Warning:** Muncul jika `current_version < latest_version` (tapi masih di atas versi minimum). Pesan: *"Versi terbaru tersedia, harap update untuk fitur optimal."*
    * **Info User:** Menampilkan Username, Email, Public ID, dan Avatar.
    * **Info Subscriber:**  Status: `Active` atau `Processed`.
        * Jika `Processed`: Tampilkan peringatan *"Pesanan sedang diproses oleh admin, mohon tunggu."*
    * **Detail Paket:** Nama Paket, Tanggal Kedaluwarsa, dan Countdown `d:h:m:s`.
* **Akses Asset (AccessKey):**
    * Tombol dinamis berdasarkan data server (contoh: TradingView, FXReplay, FXTester).
    * **Logika Klik:**
        1.  Hapus semua cookie pada domain target.
        2.  Ambil cookie baru dari server dan injeksi ke domain tersebut.
        3.  Redirect user ke URL tujuan (misal: `tradingview.com/chart`).
* **Logout:** Menghapus semua cookie domain sesuai aset langganan, otomatis logout dari web apps, dan kembali ke **State 1**.

### **State 3: Expired / No Subscription**
* **Kondisi:** Status langganan `expired`, `canceled`, atau `none`.
* **Tampilan:**
    * **Pesan:** *"Langganan telah berakhir. Segera beli paket baru untuk melanjutkan akses."*
    * **Tombol "Pilih Paket":** tampilkan card list paket yang tersedia, klik Direct ke `localhost:3000/paymentdummy?packageId=*`.
    * **Redeem CDKey:** Input field untuk kode cdkey. Jika sukses, otomatis pindah ke **State 2**.

### **State 4: Outdated Version (Wajib Update)**
* **Kondisi:** Versi extension berada di bawah `minimum_version` yang ditentukan server.
* **Tampilan:** Pesan blokir *"Versi ini sudah tidak didukung. Anda wajib melakukan upgrade."*
* **Aksi:** Tombol **"Download New Version"** yang untuk sementara mengarah ke link `github.com`.

---

## 2. Fitur Utama 2: Injected Web Asset (Automasi Domain)
Fitur ini berjalan secara otomatis di latar belakang (*background script/content script*) saat user membuka situs aset (TradingView, dll).

### **Workflow Automasi:**
1.  **Trigger:** User membuka atau me-refresh wen domain yang terdaftar di paket langganan user (TradingView/FXReplay/FXTester).
2.  **Throttle Check (5 Menit):** * Sistem mengecek kapan terakhir kali proses injeksi dilakukan.
    * Jika **kurang dari 5 menit**, fitur tidak berjalan (langsung buka web).
    * Jika **lebih dari 5 menit**, lanjut ke langkah berikutnya.
3.  **Loading Overlay:** Tampilkan *custom spinner* dan pesan *"Menyiapkan akses aset..."* pada halaman web tersebut.
4.  **Fetch Data:** GET ke `/api/ext/asset?platform=xxx`.
5.  **Handling Mix Type:**
    * Jika respon server memiliki tipe `share` dan `private`, munculkan popup pilihan.
    * **Timeout:** Jika dalam 10 detik user tidak memilih, sistem otomatis memilih tipe `private`.
6.  **Cookie Sync:**
    * Hapus cookie lama pada domain tersebut.
    * Injeksi cookie baru dari respon server.
7.  **Finalize:** Refresh halaman secara otomatis untuk menerapkan akses baru.

### **Heartbeat (Extension Tracks):**
* Selama user aktif di tab domain aset tersebut, extension akan mengirim sinyal ke server setiap **5 menit**.
* **Fungsi:** Mengecek validitas sesi dan mencatat histori aktivitas di tabel `extension_tracks`.

---

## 3. Ringkasan Teknis (Summary Table)

| Komponen          | Aturan Main                                                                                         |
| :---------------- | :-------------------------------------------------------------------------------------------------- |
| **Auth Base**     | `http://localhost:3000`                                                                             |
| **Storage**       | Menyimpan timestamp refresh terakhir (untuk cooldown 5 menit).                                      |
| **Cookie Logic**  | `Clear All` -> `Inject New` -> `Redirect/Reload`.                                                   |
| **Versi**         | Pembedaan antara *Optional Update* (State 2) dan *Mandatory Update* (State 4).                      |
| **Redirect Aset** | TradingView (`www.tradingview.com/chart`), FXReplay (`fxreplay.com`), FXTester (`forextester.com`). |

---
