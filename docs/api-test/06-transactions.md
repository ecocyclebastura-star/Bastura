# Dokumen Uji API: Modul Transaksi (Transactions & Balance)

## Konteks Bersama Modul Transaksi
- **Base URL**: `{{base_url}}` (contoh: `http://localhost:3000`)
- **Header Auth**: `Authorization: Bearer {{token_variabel}}`
- **Tipe Konten**: Selalu `application/json`
- Operasi dibagi dua:
  - Khusus Warga: Lihat Saldo, History Pribadi, Tarik Dana, Batal Tarik
  - Khusus Admin/Super Admin: Lihat Histori Semua Warga, Verifikasi Tarik Dana

---

## 1. [TSC-GET-BAL] Lihat Saldo Diri Sendiri
- **Method**: `GET`
- **Endpoint**: `/api/v1/transaction/balance`
- **Akses**: Khusus **Warga**

**Contoh Response Sukses (200 OK):**
```json
{
  "status": "success",
  "message": "Cek saldo berhasil",
  "code": "SALDO_REALTIME",
  "data": {
    "total_balance": "500000"
  }
}
```
*(Catatan: PostgreSQL BIGINT dikembalikan sebagai String `"500000"` untuk mencegah overflow)*

**Tabel Response Error:**
| HTTP Status | Error Code | Kondisi / Penjelasan |
|---|---|---|
| 403 | `FORBIDDEN` | Admin atau Super Admin tidak diperbolehkan mengakses endpoint saldo warga. |

---

## 2. [TSC-GET-LOG] Lihat Riwayat Transaksi Sendiri
- **Method**: `GET`
- **Endpoint**: `/api/v1/transaction/transaction-log`
- **Akses**: Khusus **Warga**

**Contoh Response Sukses (200 OK):**
```json
{
  "status": "success",
  "message": "Log transaksi berhasil diambil",
  "code": "GET_TRANSACTION_LOG_SUCCESS",
  "data": [
    {
      "id_transaksi": "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
      "jenis_transaksi": "Penarikan Saldo",
      "deskripsi": "Saldo Dompet",
      "nominal": -10000,
      "status": "processed",
      "tanggal_transaksi": "2026-10-03T02:00:00.000Z"
    }
  ]
}
```

---

## 3. [TSC-POST-WD] Tarik Dana (Withdrawal)
- **Method**: `POST`
- **Endpoint**: `/api/v1/transaction/withdrawal`
- **Akses**: Khusus **Warga**

**Panduan Postman (tab Body -> raw -> JSON):**
```json
{
  "amount": 15000
}
```

**Contoh Response Sukses (200 OK):**
```json
{
  "status": "success",
  "message": "Penarikan berhasil diajukan",
  "code": "WITHDRAWAL_SUCCESS"
}
```

**Tabel Response Error:**
| HTTP Status | Error Code | Kondisi / Penjelasan |
|---|---|---|
| 400 | `INVALID_AMOUNT` | Amount 0, minus, atau bukan angka. |
| 400 | `INSUFFICIENT_BALANCE` | Saldo dompet tidak mencukupi untuk nominal penarikan tersebut. |
| 404 | `USER_NOT_FOUND` | User tidak ditemukan di sistem. |

---

## 4. [TSC-POST-CANCEL-WD] Batalkan Tarik Dana
- **Method**: `POST`
- **Endpoint**: `/api/v1/transaction/withdrawal/cancel`
- **Akses**: Khusus **Warga**

**Panduan Postman (tab Body -> raw -> JSON):**
```json
{
  "id_wd": "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d"
}
```

**Contoh Response Sukses (200 OK):**
```json
{
  "status": "success",
  "message": "Penarikan dibatalkan",
  "code": "CANCEL_WITHDRAWAL_SUCCESS"
}
```

---

## 5. [TSC-GET-ADMIN-LOG] Lihat Log Transaksi Semua Warga
- **Method**: `GET`
- **Endpoint**: `/api/v1/transaction/transaction-logs/admin`
- **Akses**: Khusus **Admin** & **Super Admin**

**Contoh Response Sukses (200 OK):**
```json
{
  "status": "success",
  "message": "Log transaksi berhasil diambil",
  "code": "GET_LOG_ADMIN_SUCCESS",
  "data": [
    {
      "id_transaksi": "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
      "id_user": "20000000-0000-0000-0000-000000000001",
      "name": "Budi Warga",
      "jenis_transaksi": "Penarikan Saldo",
      "nominal": -10000,
      "status": "processed"
    }
  ]
}
```

---

## 6. [TSC-GET-WD-ADMIN] Lihat Daftar Pengajuan Tarik Dana (WD)
- **Method**: `GET`
- **Endpoint**: `/api/v1/transaction/verify-withdrawal/admin`
- **Akses**: Khusus **Admin** & **Super Admin**

**Contoh Response Sukses (200 OK):**
```json
{
  "status": "success",
  "message": "Daftar pengajuan berhasil diambil",
  "code": "GET_WD_LIST_SUCCESS",
  "data": [
    {
      "id_transaksi": "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
      "name": "Budi Warga",
      "nominal": 15000,
      "status": "pending"
    }
  ]
}
```

---

## 7. [TSC-POST-WD-VERIFY] Verifikasi Pengajuan Tarik Dana
- **Method**: `POST`
- **Endpoint**: `/api/v1/transaction/verify-withdrawal/admin`
- **Akses**: Khusus **Admin** & **Super Admin**

**Panduan Postman (tab Body -> raw -> JSON):**
```json
{
  "id_tsc": "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
  "proccess_type": "success"
}
```
*(Nilai `proccess_type` dapat berupa `success` atau `rejected`)*

**Contoh Response Sukses (200 OK):**
```json
{
  "status": "success",
  "message": "Success",
  "code": "SUCCESS",
  "data": "WD_SUCCESS"
}
```

**Tabel Response Error:**
| HTTP Status | Error Code | Kondisi / Penjelasan |
|---|---|---|
| 400 | `BAD_REQUEST` | Field `id_tsc` atau `proccess_type` kosong/salah. |
| 403 | `FORBIDDEN` | Warga mencoba mengakses endpoint verifikasi Admin. |

---

## 8. [TSC-POST-USER-LOG] Lihat Log Spesifik Satu Warga
- **Method**: `POST`
- **Endpoint**: `/api/v1/transaction/transaction-logs/admin/user`
- **Akses**: Khusus **Admin** & **Super Admin**

**Panduan Postman (tab Body -> raw -> JSON):**
```json
{
  "user_id": "20000000-0000-0000-0000-000000000001"
}
```

**Contoh Response Sukses (200 OK):**
```json
{
  "status": "success",
  "message": "Log transaksi berhasil diambil",
  "code": "GET_USER_LOG_SUCCESS",
  "data": [
    {
      "id_transaksi": "a1b2c3d4...",
      "jenis_transaksi": "Penarikan Saldo",
      "status": "processed"
    }
  ]
}
```
