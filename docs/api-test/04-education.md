# Dokumen Uji API: Modul Edukasi (Education)

## Konteks Bersama Modul Education
- **Base URL**: `{{base_url}}` (contoh: `http://localhost:3000`)
- **Header Auth**: `Authorization: Bearer {{token_variabel}}`
- **Tipe Konten**: Semua request data teks menggunakan `application/json`, sedangkan upload foto menggunakan `multipart/form-data`.
- Daftar Endpoint Publik: Konten edukasi bisa diakses Warga. Namun fitur manajemen (Create, Update, Delete, Upload Foto) khusus **Admin** dan **Super Admin**.

---

## 1. [EDU-GET-LIST] Lihat Daftar Edukasi (Publik)
- **Method**: `GET`
- **Endpoint**: `/api/v1/education`
- **Akses**: Semua Pengguna Login

**Contoh Response Sukses (200 OK):**
```json
{
  "status": "success",
  "message": "Data edukasi ditemukan",
  "code": "DATA_FOUND",
  "data": [
    {
      "id_content": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
      "data": {
        "title": "Cara Memilah Sampah Plastik",
        "content": "{\"p\": \"Pisahkan botol PET dengan tutupnya.\"}",
        "image": "photo_1690000000.jpg",
        "created_at": "2026-10-03T02:00:00.000Z"
      }
    }
  ]
}
```

**Tabel Response Error:**
| HTTP Status | Error Code | Kondisi / Penjelasan |
|---|---|---|
| 401 | `UNAUTHORIZED` | Tidak menyertakan token atau token salah. |

---

## 2. [EDU-POST-CREATE] Buat Edukasi Baru
- **Method**: `POST`
- **Endpoint**: `/api/v1/education/admin/education`
- **Akses**: Khusus **Admin** & **Super Admin**

**Panduan Postman (tab Body -> raw -> JSON):**
```json
{
  "title": "[TEST] Edukasi API Baru",
  "content": "{\"p\": \"Materi tentang daur ulang kardus bekas.\"}"
}
```

**Contoh Response Sukses (201 Created):**
```json
{
  "status": "success",
  "message": "Konten edukasi berhasil ditambahkan",
  "code": "ADD_EDU_SUCCESS",
  "data": {
    "id_content": "e2f1g3h4-5678-9abc-def0-1234567890ab"
  }
}
```
*(Catat UUID di atas untuk menguji Upload Foto, Edit, dan Delete)*

**Tabel Response Error:**
| HTTP Status | Error Code | Kondisi / Penjelasan |
|---|---|---|
| 400 | `INVALID_TITLE` | Judul kosong atau lebih dari 200 karakter. |
| 400 | `INVALID_CONTENT` | Konten tidak valid atau kosong. |
| 403 | `FORBIDDEN` | Warga mencoba membuat edukasi. |

---

## 3. [EDU-PATCH-PHOTO] Upload Foto Edukasi
- **Method**: `PATCH`
- **Endpoint**: `/api/v1/education/admin/education/:id/photo` (Ganti `:id` dengan `id_content`)
- **Akses**: Khusus **Admin** & **Super Admin**
- **Content-Type**: `multipart/form-data`

**Panduan Postman (tab Body -> form-data):**
| Key | Type | Value |
|---|---|---|
| `image` | File | *(Pilih file gambar berformat JPG/PNG maksimal 2MB)* |

**Contoh Response Sukses (200 OK):**
```json
{
  "status": "success",
  "message": "Foto edukasi berhasil diupload",
  "code": "UPLOAD_PHOTO_SUCCESS"
}
```

**Tabel Response Error:**
| HTTP Status | Error Code | Kondisi / Penjelasan |
|---|---|---|
| 400 | `IMAGE_REQUIRED` | Key `image` tidak ada atau file kosong. |
| 404 | `EDU_NOT_FOUND` | ID artikel edukasi tidak ditemukan. |
| 413 | `FILE_TOO_LARGE` | File melebihi batas 2MB. |
| 415 | `INVALID_FILE_TYPE` | Format bukan JPG/PNG (misal PDF). |

---

## 4. [EDU-PATCH-EDIT] Edit Konten Edukasi
- **Method**: `PATCH`
- **Endpoint**: `/api/v1/education/admin/education/:id`
- **Akses**: Khusus **Admin** & **Super Admin**

**Panduan Postman (tab Body -> raw -> JSON):**
```json
{
  "title": "[UPDATE] Edukasi Daur Ulang",
  "content": "{\"p\": \"Konten sudah diupdate.\"}"
}
```

**Contoh Response Sukses (200 OK):**
```json
{
  "status": "success",
  "message": "Konten edukasi berhasil diperbarui",
  "code": "UPDATE_EDU_SUCCESS"
}
```

**Tabel Response Error:**
| HTTP Status | Error Code | Kondisi / Penjelasan |
|---|---|---|
| 404 | `EDU_NOT_FOUND` | ID artikel tidak valid atau sudah terhapus. |

---

## 5. [EDU-DELETE-DEL] Hapus Edukasi
- **Method**: `DELETE`
- **Endpoint**: `/api/v1/education/admin/education/:id`
- **Akses**: Khusus **Admin** & **Super Admin**

**Contoh Response Sukses (200 OK):**
```json
{
  "status": "success",
  "message": "Konten edukasi berhasil dihapus",
  "code": "DELETE_EDU_SUCCESS"
}
```

**Tabel Response Error:**
| HTTP Status | Error Code | Kondisi / Penjelasan |
|---|---|---|
| 404 | `EDU_NOT_FOUND` | ID artikel tidak valid atau sudah dihapus sebelumnya (uji idempotensi). |

---

## 6. [EDU-GET-ADMIN] Lihat Daftar Edukasi Khusus Admin
- **Method**: `GET`
- **Endpoint**: `/api/v1/education/admin/education`
- **Akses**: Khusus **Admin** & **Super Admin**
- **Deskripsi**: Biasanya mengembalikan detail yang lebih lengkap atau metadata khusus admin (bergantung pada implementasi view/query server).

**Contoh Response Sukses (200 OK):**
```json
{
  "status": "success",
  "message": "Data edukasi ditemukan",
  "code": "DATA_FOUND",
  "data": [
    {
      "id_content": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
      "title": "Judul Artikel",
      "created_at": "2026-10-03T02:00:00.000Z"
    }
  ]
}
```

---

## 7. [EDU-GET-PHOTO] Lihat Foto Edukasi (Stream)
- **Method**: `GET`
- **Endpoint**: `/api/v1/education/photo/:filename` (Ganti `:filename` dengan nama dari response list/create)
- **Akses**: Semua Pengguna Login

**Contoh Response Sukses (200 OK):**
*(Menampilkan file stream / gambar biner langsung ke Postman / browser)*

**Tabel Response Error:**
| HTTP Status | Error Code | Kondisi / Penjelasan |
|---|---|---|
| 404 | `NOT_FOUND` | File gambar tidak ada di server storage. |
