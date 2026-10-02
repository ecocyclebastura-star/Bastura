# Dokumen Uji API: Modul Splitbills

## Konteks Bersama Modul Splitbills
- **Base URL**: `{{base_url}}`
- **Header Auth**: `Authorization: Bearer {{token_variabel}}`
- **Variabel yang digunakan**: `admin_token`
- Operasi Splitbills HANYA untuk Admin dan Super Admin (semua route dilindungi `adminOnly`).

---

### [SPB-GET-HISTORY] GET /api/v1/splitbills/history : Riwayat Splitbills
- **Sumber**: `getHistorySplitbillsController`
- **Akses**: Admin
- **Deskripsi**: Melihat data riwayat pembagian dana bank sampah (`split_bills` tabel).
- **Respons Sukses**: 200
- **Skenario Uji**:
  - `SPB-01`: (Sukses) Admin mengambil riwayat splitbills (200).

### [SPB-POST-INIT] POST /api/v1/splitbills/init : Inisialisasi/Kalkulasi Splitbills
- **Sumber**: `initSplitbillsController`
- **Akses**: Admin
- **Body JSON**:
  - `date_start` (tanggal ISO, wajib)
  - `date_end` (tanggal ISO, wajib)
- **Respons Sukses**: 200. Respons akan mengembalikan fee admin, jumlah bersih warga, dan array alokasi dana per user untuk di-review oleh admin.
- **Respons Error**: 400 (`Bad Request`), 404 (Tidak ada setoran).
- **Skenario Uji**:
  - `SPB-02`: (Validasi) Mengirim tanpa payload date_start (400).
  - `SPB-03`: (Validasi) Date start lebih besar dari date end (400).
  - `SPB-04`: (Aturan Bisnis) Melakukan init pada tanggal tanpa transaksi sama sekali (404/400).
  - `SPB-05`: (Sukses) Admin melakukan inisiasi splitbills dengan date_start `2026-07-01` dan date_end `2026-07-31` (Mencocokkan seed DB) (200). **(Tidak ada mutasi permanen, ini semacam dry run / kalkulasi awal)**.

### [SPB-POST-CONFIRM] POST /api/v1/splitbills/confirm : Konfirmasi Final Distribusi Dana
- **Sumber**: `confirmSplitbillsController`
- **Akses**: Admin
- **Body JSON**: Array object hasil kembalian dari endpoint `/init` atau list final distribusi. (Cek payload di controller: `warga_allocations`, `date_start`, `date_end`).
- **Respons Sukses**: 200. Memasukkan saldo final (`total_balance` pada tabel `balance`) dan mengubah data secara global.
- **Skenario Uji**:
  - `SPB-06`: (Validasi) Mengirim payload final kosong atau list warga kosong (400).
  - `SPB-07`: [DESTRUKTIF] (Sukses) Admin melakukan konfirmasi akhir splitbills (200). (Sebaiknya tidak dilakukan otomatis jika merusak state pengujian API yang butuh saldo tetap, jika tidak wajib jalankan).
