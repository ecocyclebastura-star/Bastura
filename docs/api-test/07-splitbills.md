# Dokumen Uji API: Modul Splitbills (Bagi Hasil)

## Konteks Bersama Modul Splitbills
- **Base URL**: `{{base_url}}` (contoh: `http://localhost:3000`)
- **Header Auth**: `Authorization: Bearer {{token_variabel}}`
- **Tipe Konten**: Selalu `application/json`
- Operasi Splitbills HANYA dapat diakses oleh **Admin** dan **Super Admin** (semua route dilindungi middleware `adminOnly`).

---

## 1. [SPB-GET-HISTORY] Lihat Riwayat Splitbills
- **Method**: `GET`
- **Endpoint**: `/api/v1/splitbills/history`
- **Akses**: Khusus **Admin** & **Super Admin**

**Contoh Response Sukses (200 OK):**
```json
{
  "status": "success",
  "message": "Data histori splitbills berhasil diambil",
  "code": "GET_HISTORY_SUCCESS",
  "data": [
    {
      "id_sb": "f8a7c2b1-d3e4-5f6a-9b0c-1d2e3f4a5b6c",
      "total_sb": 850000,
      "date_start": "2026-07-01T00:00:00.000Z",
      "date_end": "2026-07-31T23:59:59.000Z",
      "status": "processed",
      "processed_at": "2026-08-01T10:00:00.000Z"
    }
  ]
}
```

---

## 2. [SPB-POST-INIT] Kalkulasi / Simulasi Splitbills (Dry Run)
- **Method**: `POST`
- **Endpoint**: `/api/v1/splitbills/init`
- **Akses**: Khusus **Admin** & **Super Admin**
- **Deskripsi**: Menghitung alokasi dana per warga beserta fee admin berdasarkan periode tanggal. **(Tidak mengubah saldo, hanya simulasi/review)**.

**Panduan Postman (tab Body -> raw -> JSON):**
```json
{
  "date_start": "2026-07-01",
  "date_end": "2026-07-31"
}
```

**Contoh Response Sukses (200 OK):**
```json
{
  "status": "success",
  "message": "Inisiasi splitbills berhasil",
  "code": "INIT_SPLITBILLS_SUCCESS",
  "data": {
    "total_gross": 100000,
    "fee_admin_percent": 10,
    "fee_admin_amount": 10000,
    "total_net": 90000,
    "warga_allocations": [
      {
        "id_user": "20000000-0000-0000-0000-000000000001",
        "name": "Budi Warga",
        "total_setoran": 35000,
        "final_amount": 31500
      },
      {
        "id_user": "20000000-0000-0000-0000-000000000002",
        "name": "Siti Warga",
        "total_setoran": 65000,
        "final_amount": 58500
      }
    ]
  }
}
```

**Tabel Response Error:**
| HTTP Status | Error Code | Kondisi / Penjelasan |
|---|---|---|
| 400 | `BAD_REQUEST` | Date start / Date end kosong atau Date start lebih besar dari Date end. |
| 404 | `NOT_FOUND` | Tidak ada setoran (deposit) dalam rentang tanggal tersebut. |

---

## 3. [SPB-POST-CONFIRM] Konfirmasi Distribusi Dana Warga (Final)
- **Method**: `POST`
- **Endpoint**: `/api/v1/splitbills/confirm`
- **Akses**: Khusus **Admin** & **Super Admin**
- **Deskripsi**: Menyetujui hasil kalkulasi dan benar-benar menambahkan dana ke saldo/dompet Warga.

**Panduan Postman (tab Body -> raw -> JSON):**
Gunakan output dari endpoint `/init` lalu kirimkan:
```json
{
  "date_start": "2026-07-01",
  "date_end": "2026-07-31",
  "total_gross": 100000,
  "fee_admin_amount": 10000,
  "total_net": 90000,
  "warga_allocations": [
    {
      "id_user": "20000000-0000-0000-0000-000000000001",
      "name": "Budi Warga",
      "total_setoran": 35000,
      "final_amount": 31500
    },
    {
      "id_user": "20000000-0000-0000-0000-000000000002",
      "name": "Siti Warga",
      "total_setoran": 65000,
      "final_amount": 58500
    }
  ]
}
```

**Contoh Response Sukses (200 OK):**
```json
{
  "status": "success",
  "message": "Distribusi dana splitbills berhasil dikonfirmasi dan ditransfer ke saldo warga",
  "code": "CONFIRM_SPLITBILLS_SUCCESS"
}
```

**Tabel Response Error:**
| HTTP Status | Error Code | Kondisi / Penjelasan |
|---|---|---|
| 400 | `BAD_REQUEST` | Array `warga_allocations` kosong atau payload tidak lengkap. |
