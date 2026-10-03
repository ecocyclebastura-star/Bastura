# Dokumen Uji API: Modul Updates (Jadwal Setoran & Log Sinkronisasi)

## Konteks Bersama Modul Updates
- **Base URL**: `{{base_url}}` (contoh: `http://localhost:3000`)
- **Header Auth**: `Authorization: Bearer {{token_variabel}}`
- **Tipe Konten**: `application/json`
- Operasi pembuatan dan akses jadwal saat ini dibatasi untuk **Admin**. Warga dapat mengakses endpoint logs.

---

## 1. [UPD-GET-LOG] Lihat Log Sinkronisasi Sistem
- **Method**: `GET`
- **Endpoint**: `/api/v1/updates`
- **Akses**: Semua Pengguna Login

**Contoh Response Sukses (200 OK):**
```json
{
  "status": "success",
  "message": "Data ditemukan",
  "code": "DATA_FOUND",
  "data": {
    "profile_up": "2026-10-03T02:00:00.000Z",
    "transaction_up": "2026-10-03T02:00:00.000Z",
    "announcements_up": "2026-10-03T02:00:00.000Z",
    "education_up": "2026-10-03T02:00:00.000Z",
    "simba_up": "2026-10-03T02:00:00.000Z",
    "catalog_up": "2026-10-03T02:00:00.000Z"
  }
}
```

---

## 2. [UPD-GET-JADWAL] Lihat Jadwal Setoran
- **Method**: `GET`
- **Endpoint**: `/api/v1/updates/get-jadwal`
- **Akses**: Khusus **Admin** & **Super Admin** (berdasarkan middleware saat ini)

**Contoh Response Sukses (200 OK):**
```json
{
  "status": "success",
  "message": "Data jadwal ditemukan",
  "code": "SUCC_OPENING_SCH_FOUND",
  "data": [
    {
      "id": 1,
      "setor_time": "2026-10-15T08:00:00.000Z"
    }
  ]
}
```

**Tabel Response Error:**
| HTTP Status | Error Code | Kondisi / Penjelasan |
|---|---|---|
| 403 | `FORBIDDEN` | Warga mencoba mengakses jadwal. |
| 404 | `SUCC_OPENING_SCH_NOT_FOUND` | Belum ada jadwal setoran di database. |

---

## 3. [UPD-POST-JADWAL] Buat Jadwal Setoran Baru
- **Method**: `POST`
- **Endpoint**: `/api/v1/updates/insert-jadwal`
- **Akses**: Khusus **Admin** & **Super Admin**

**Panduan Postman (tab Body -> raw -> JSON):**
```json
{
  "time": "2026-10-15T08:00:00.000Z"
}
```

**Contoh Response Sukses (200 OK):**
```json
{
  "status": "success",
  "message": "Jadwal berhasil ditambahkan",
  "code": "INSERT_SCH_SUCCESS"
}
```

**Tabel Response Error:**
| HTTP Status | Error Code | Kondisi / Penjelasan |
|---|---|---|
| 400 | `BAD_REQUEST` | Field `time` tidak dikirim atau bukan format string/tanggal valid. |
| 403 | `FORBIDDEN` | Warga mencoba menambahkan jadwal. |
