# Dokumen Uji API: Modul Pengumuman (Announcements)

## Konteks Bersama Modul Announcements
- **Base URL**: `{{base_url}}` (contoh: `http://localhost:3000`)
- **Header Auth**: `Authorization: Bearer {{token}}`
- **Tipe Konten**: Semua request yang mengirim data text menggunakan `application/json`, kecuali **Create** (POST) menggunakan `multipart/form-data`.
- Daftar Endpoint Publik: Pengumuman bisa dilihat oleh semua (Warga/Admin), namun Create/Update/Delete khusus **Admin** atau **Super Admin**.

---

## 1. [ANC-GET-LIST] Lihat Daftar Pengumuman
- **Method**: `GET`
- **Endpoint**: `/api/v1/announcements`
- **Akses**: Semua Pengguna Login (User, Admin, Super Admin)
- **Query Params**:
  - `search` (opsional): Pencarian berdasarkan judul. (Contoh: `?search=libur`)
  - `category_id` (opsional): Filter berdasarkan kategori (UUID).
  - `page` (opsional): Halaman (default: 1).
  - `limit` (opsional): Jumlah data per halaman (default: 10).

**Contoh Response Sukses (200 OK):**
```json
{
  "status": "success",
  "message": "Data ditemukan",
  "code": "DATA_FOUND",
  "data": [
    {
      "id_announcements": "d5e931cc-a3b6-4de7-a8db-f5c57e86ed5d",
      "data": {
        "title": "Jadwal Pengangkutan Sampah Baru",
        "content": "Pengangkutan sampah akan dilakukan setiap hari Senin dan Kamis.",
        "image": "photo_1690000000.jpg",
        "category_id": "f0e2b10a-b6de-4e31-8bc6-b258380e922e",
        "created_at": "2026-10-03T02:00:00.000Z"
      }
    }
  ]
}
```

**Tabel Response Error:**
| HTTP Status | Error Code | Kondisi / Penjelasan |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Format parameter tidak valid (misal `category_id` bukan UUID valid atau `page` bukan angka). |
| 401 | `UNAUTHORIZED` | Token tidak valid, kedaluwarsa, atau tidak dikirim di header. |

---

## 2. [ANC-GET-CATEGORIES] Lihat Daftar Kategori Pengumuman
- **Method**: `GET`
- **Endpoint**: `/api/v1/announcements/announcement-categories`
- **Akses**: Semua Pengguna Login

**Contoh Response Sukses (200 OK):**
```json
{
  "status": "success",
  "message": "Data kategori ditemukan",
  "code": "DATA_FOUND",
  "data": [
    {
      "id_category": "f0e2b10a-b6de-4e31-8bc6-b258380e922e",
      "name": "Umum"
    },
    {
      "id_category": "c1a2b3c4-d5e6-7f8a-9b0c-1d2e3f4a5b6c",
      "name": "Penting"
    }
  ]
}
```

---

## 3. [ANC-POST-CREATE] Buat Pengumuman Baru
- **Method**: `POST`
- **Endpoint**: `/api/v1/announcements`
- **Akses**: Khusus **Admin** & **Super Admin**
- **Content-Type**: `multipart/form-data`

**Panduan Postman (tab Body -> form-data):**
Atur field berikut persis seperti tabel ini:
| Key | Type | Value (Bisa di-copy paste) |
|---|---|---|
| `title` | Text | `[TEST] Pengumuman API Baru` |
| `content` | Text | `{"p": "Isi dari pengumuman ini dalam bentuk JSON string."}` |
| `category_id` | Text | *(Masukkan UUID valid dari endpoint kategori)* |
| `image` | File | *(Pilih file gambar berformat .jpg atau .png)* |

**Contoh Response Sukses (201 Created):**
```json
{
  "status": "success",
  "message": "Pengumuman berhasil ditambahkan",
  "code": "ADD_ANC_SUCCESS",
  "data": {
    "id_announcements": "e9f0a2b1-c3d4-5e6f-7a8b-9c0d1e2f3a4b"
  }
}
```
*(Catat UUID di atas untuk menguji Edit dan Delete pada langkah selanjutnya)*

**Tabel Response Error:**
| HTTP Status | Error Code | Kondisi / Penjelasan |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Field `title` / `category_id` kosong atau salah format. |
| 403 | `FORBIDDEN` | Warga biasa mencoba membuat pengumuman (role tidak sesuai). |
| 413 | `FILE_TOO_LARGE` | Ukuran gambar yang diupload melebihi batas maksimal (contoh: > 2MB). |
| 415 | `INVALID_FILE_TYPE` | Format gambar selain JPG/PNG (misal PDF atau Word). |

---

## 4. [ANC-PATCH-EDIT] Edit Pengumuman
- **Method**: `PATCH`
- **Endpoint**: `/api/v1/announcements/:id` (Ganti `:id` dengan `id_announcements`)
- **Akses**: Khusus **Admin** & **Super Admin**
- **Content-Type**: `multipart/form-data` atau `application/json` (bergantung apakah mau update foto atau tidak)

**Panduan Postman (tab Body -> form-data ATAU raw JSON):**
*Contoh raw JSON jika tidak mengupdate foto:*
```json
{
  "title": "[UPDATE] Judul Pengumuman Diubah",
  "content": "{\"p\": \"Konten berhasil diperbarui.\"}"
}
```

**Contoh Response Sukses (200 OK):**
```json
{
  "status": "success",
  "message": "Pengumuman berhasil diubah",
  "code": "UPDATE_ANC_SUCCESS"
}
```

**Tabel Response Error:**
| HTTP Status | Error Code | Kondisi / Penjelasan |
|---|---|---|
| 400 | `VALIDATION_ERROR` | UUID format tidak valid. |
| 403 | `FORBIDDEN` | Bukan Admin / Super Admin. |
| 404 | `NOT_FOUND` | Pengumuman dengan ID tersebut tidak ditemukan di database. |

---

## 5. [ANC-DELETE-DEL] Hapus Pengumuman
- **Method**: `DELETE`
- **Endpoint**: `/api/v1/announcements/:id` (Ganti `:id` dengan `id_announcements`)
- **Akses**: Khusus **Admin** & **Super Admin**

**Contoh Response Sukses (200 OK):**
```json
{
  "status": "success",
  "message": "Pengumuman berhasil dihapus",
  "code": "DELETE_ANC_SUCCESS"
}
```

**Tabel Response Error:**
| HTTP Status | Error Code | Kondisi / Penjelasan |
|---|---|---|
| 403 | `FORBIDDEN` | Diakses oleh User biasa. |
| 404 | `NOT_FOUND` | Mencoba menghapus pengumuman yang sudah dihapus atau ID salah. |

---

## 6. [ANC-GET-PHOTO] Buka / Akses Foto Pengumuman
- **Method**: `GET`
- **Endpoint**: `/api/v1/announcements/photo/:filename` (Ganti `:filename` dengan nilai dari key `image` hasil get by id)
- **Akses**: Semua Pengguna Login

**Contoh Response Sukses (200 OK):**
*(Menampilkan file stream/gambar biner langsung ke browser atau Postman)*

**Tabel Response Error:**
| HTTP Status | Error Code | Kondisi / Penjelasan |
|---|---|---|
| 404 | `NOT_FOUND` | File gambar dengan nama tersebut tidak ada di folder storage server. |
