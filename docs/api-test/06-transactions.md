# Dokumen Uji API: Modul Transaksi (Transactions & Balance)

## Konteks Bersama Modul Transaksi
- **Base URL**: `{{base_url}}`
- **Header Auth**: `Authorization: Bearer {{token_variabel}}`
- **Variabel yang digunakan**: `admin_token`, `user_token`
- Operasi di `tsc-routes.ts`. Sebagian endpoint bersifat User-only (`userOnly`): penarikan dana dan saldo sendiri. Sebagian khusus Admin (`adminOnly`): logs dan validasi dana.

---

### [TSC-GET-BAL] GET /api/v1/transaction/balance : Lihat Saldo Warga
- **Sumber**: `getbalanceController`
- **Akses**: Khusus Warga (`userOnly`)
- **Deskripsi**: Menampilkan `total_balance` milik warga yang login.
- **Respons Sukses**: 200 (`SALDO_REALTIME`)
- **Skenario Uji**:
  - `TSC-01`: (Otorisasi) Diakses Admin atau Super Admin (403 Forbidden - Karena ada `userOnly` guard).
  - `TSC-02`: (Sukses) Diakses oleh Warga (200).

### [TSC-GET-LOG] GET /api/v1/transaction/transaction-log : Lihat Riwayat Warga
- **Sumber**: `getTransactionLogController`
- **Akses**: Khusus Warga (`userOnly`)
- **Respons Sukses**: 200 (`GET_TRANSACTION_LOG_SUCCESS`)
- **Skenario Uji**:
  - `TSC-03`: (Sukses) Warga melihat transaksi milik pribadinya (200).

### [TSC-POST-WD] POST /api/v1/transaction/withdrawal : Tarik Dana
- **Sumber**: `takeWithdrawalsController`
- **Akses**: Khusus Warga (`userOnly`)
- **Body JSON**: `amount` (number, wajib, harus positif)
- **Respons Sukses**: 200 (`WITHDRAWAL_SUCCESS`)
- **Respons Error**: 400 (`INVALID_AMOUNT`, `INSUFFICIENT_BALANCE`), 404 (`USER_NOT_FOUND`).
- **Efek Samping**: Menambahkan row ke `withdrawals` dan menunggu validasi.
- **Skenario Uji**:
  - `TSC-04`: (Validasi) Tarik tunai dengan jumlah melebihi saldo (`INSUFFICIENT_BALANCE` 400).
  - `TSC-05`: (Validasi) Jumlah tarikan 0 atau minus (`INVALID_AMOUNT` 400).
  - `TSC-06`: [DESTRUKTIF] (Sukses) Warga menarik saldo 10,000 asalkan saldo cukup (200). *(Pastikan user_token memiliki saldo di akunnya melalui seed/setup)*.

### [TSC-POST-CANCEL-WD] POST /api/v1/transaction/withdrawal/cancel : Batal Tarik
- **Sumber**: `cancelWithdrawalsController`
- **Akses**: Khusus Warga
- **Body JSON**: `id_wd` (UUID target)
- **Skenario Uji**:
  - `TSC-07`: [DESTRUKTIF] (Sukses) Membatalkan penarikan terakhir yang diajukan oleh Warga (200).

### [TSC-GET-ADMIN-LOG] GET /api/v1/transaction/transaction-logs/admin : Histori Global
- **Sumber**: `getLogsAdminTscController`
- **Akses**: Khusus Admin
- **Skenario Uji**:
  - `TSC-08`: (Otorisasi) Warga coba akses history admin (403).
  - `TSC-09`: (Sukses) Admin mengakses log (200).

### [TSC-GET-WD-ADMIN] GET /api/v1/transaction/verify-withdrawal/admin : List Request WD
- **Sumber**: `getVerifyWithdrawalController`
- **Akses**: Admin
- **Skenario Uji**:
  - `TSC-10`: (Sukses) Admin melihat list WD (200).

### [TSC-POST-WD-VERIFY] POST /api/v1/transaction/verify-withdrawal/admin : Verifikasi WD
- **Sumber**: `verifty_wd` (dari `verifty-wd-controller.ts`)
- **Akses**: Admin *(Namun rute global ini mungkin bocor ke Warga jika tidak ada `adminOnly` guard. Akan diuji)*.
- **Body JSON**: 
  - `id_wd` (wajib, ID penarikan)
  - `status` (enum `success` atau `rejected`)
- **Respons Sukses**: 200 (`SUCCESS`)
- **Skenario Uji**:
  - `TSC-11`: [DESTRUKTIF] (Otorisasi/Eksploitasi) Warga memverifikasi penarikan sendiri (Asersi gagal jika server menerima 200).
  - `TSC-12`: (Sukses) Admin memverifikasi penarikan.

### [TSC-POST-USER-LOG] POST /api/v1/transaction/transaction-logs/admin/user : Histori Log User (Admin)
- **Sumber**: `getTransactionLogsUserController`
- **Akses**: Admin
- **Body JSON**: `user_id`
- **Respons Sukses**: 200
- **Skenario Uji**:
  - `TSC-13`: (Sukses) Ambil log milik user_id spesifik (200).
