# Dokumen Uji API: Modul Edukasi (Education)

## Konteks Bersama Modul Education
- **Base URL**: `{{base_url}}` (contoh: `http://localhost:3000`)
- **Prefix Route**: `/api/v1/education` (di-mount di `index.ts`, rute didefinisikan di `edu-routes.ts`)
- **Header Auth**: `Authorization: Bearer {{token_variabel}}`
- **Tipe Konten**: Semua request data teks menggunakan `application/json`, sedangkan upload foto menggunakan `multipart/form-data`.
- **Middleware**: Seluruh rute hanya dilindungi `checkAccessToken` (wajib login). **Tidak ada** middleware `adminOnly`, sehingga semua endpoint (termasuk Create/Edit/Delete/Upload Foto/List Admin) bisa diakses oleh semua pengguna login (Warga, Admin, Super Admin).
- **Format error umum**: `{ "status": "error", "message": "...", "code": "..." }`

---

## 1. [EDU-GET-LIST] Lihat Daftar Edukasi
- **Method**: `GET`
- **Endpoint**: `/api/v1/education`
- **Akses**: Semua Pengguna Login

**Contoh Response Sukses (200 OK):**
```json
{
  "status": "success",
  "message": "Data ditemukan",
  "code": "DATA_FOUND",
  "data": [
    {
      "id_content": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
      "data": {
        "title": "Cara Memilah Sampah Plastik",
        "content": { "p": "Pisahkan botol PET dengan tutupnya." },
        "education_img": "edu-CaraMemilahSampahPl-1690000000.jpg",
        "created_at": "2026-10-03T02:00:00.000Z",
        "updated_at": null
      }
    }
  ]
}
```
*(Catatan: `content` bertipe JSONB (objek). Jika belum ada foto, `education_img` bernilai string `"undefined"`.)*

**Tabel Response Error:**
| HTTP Status | Error Code | Kondisi / Penjelasan |
|---|---|---|
| 401 | `TOKEN_INVALID` | Payload JWT tidak ada. |
| 401 | `UNAUTHORIZED` | Tidak menyertakan token atau token salah (middleware). |
| 404 | `USER_NOT_FOUND` | User pada token tidak ditemukan di database. |
| 404 | `DATA_NOT_FOUND` | Belum ada konten edukasi sama sekali. |

---

## 2. [EDU-POST-CREATE] Buat Edukasi Baru
- **Method**: `POST`
- **Endpoint**: `/api/v1/education`
- **Akses**: Semua Pengguna Login

**Panduan Postman (tab Body -> raw -> JSON):**
```json
{
  "title": "[TEST] Edukasi API Baru",
  "content": "{\"p\": \"Materi tentang daur ulang kardus bekas.\"}"
}
```
*(Catatan: `content` boleh berupa string JSON, objek JSON, atau teks biasa. Teks biasa akan dibungkus menjadi `{ "text": "..." }`. Server otomatis menambahkan `author_id` ke dalam content.)*

**Contoh Response Sukses (201 Created):**
```json
{
  "status": "success",
  "message": "Artikel edukasi berhasil ditambahkan.",
  "code": "ADD_EDU_SUCCESS",
  "data": {
    "id_content": "e2f1a3b4-5678-4abc-8ef0-1234567890ab"
  }
}
```
*(Simpan UUID `id_content` untuk menguji Upload Foto, Edit, dan Delete -> variabel `{{education_id}}`)*

**Tabel Response Error:**
| HTTP Status | Error Code | Kondisi / Penjelasan |
|---|---|---|
| 400 | `INVALID_TITLE` | Judul kosong atau lebih dari 200 karakter. |
| 400 | `INVALID_CONTENT` | `content` kosong/tidak dikirim. |
| 401 | `UNAUTHORIZED` | Token tidak valid / `sub` tidak ada di payload. |
| 500 | `INTERNAL_SERVER_ERROR` | Kegagalan server (dicatat ke `error_logs`). |

---

## 3. [EDU-POST-PHOTO] Upload Foto Edukasi
- **Method**: `POST`
- **Endpoint**: `/api/v1/education/photo/:id` (Ganti `:id` dengan `id_content`)
- **Akses**: Semua Pengguna Login
- **Content-Type**: `multipart/form-data`

**Panduan Postman (tab Body -> form-data):**
| Key | Type | Value |
|---|---|---|
| `image` | File | *(Pilih file gambar berformat JPG/PNG maksimal 2MB)* |

**Contoh Response Sukses (200 OK):**
```json
{
  "status": "success",
  "message": "Foto lampiran berhasil diperbarui.",
  "code": "UPLOAD_PHOTO_SUCCESS"
}
```
*(Foto lama otomatis dihapus dari server. Nama file baru berformat `edu-<judul>-<timestamp>.<ext>`.)*

**Tabel Response Error:**
| HTTP Status | Error Code | Kondisi / Penjelasan |
|---|---|---|
| 400 | `VALIDATION_ERROR` | `:id` bukan UUID valid. |
| 400 | `IMAGE_REQUIRED` | Key `image` tidak ada atau bukan file. |
| 404 | `EDU_NOT_FOUND` | ID artikel edukasi tidak ditemukan. |
| 413 | `FILE_TOO_LARGE` | File melebihi batas 2MB. |
| 415 | `INVALID_FILE_TYPE` | MIME bukan JPG/PNG, atau magic bytes file tidak sesuai. |

---

## 4. [EDU-PATCH-EDIT] Edit Konten Edukasi
- **Method**: `PATCH`
- **Endpoint**: `/api/v1/education/:id` (Ganti `:id` dengan `id_content`)
- **Akses**: Semua Pengguna Login

**Panduan Postman (tab Body -> raw -> JSON):**
```json
{
  "title": "[UPDATE] Edukasi Daur Ulang",
  "content": "{\"p\": \"Konten sudah diupdate.\"}"
}
```
*(Catatan: `title` dan `content` bersifat opsional, kirim salah satu atau keduanya. `author_id` lama otomatis dipertahankan.)*

**Contoh Response Sukses (200 OK):**
```json
{
  "status": "success",
  "message": "Berhasil mengedit edukasi.",
  "code": "EDIT_EDU_SUCCESS"
}
```

**Tabel Response Error:**
| HTTP Status | Error Code | Kondisi / Penjelasan |
|---|---|---|
| 400 | `VALIDATION_ERROR` | `:id` bukan UUID valid. |
| 400 | `INVALID_TITLE` | `title` dikirim tetapi kosong atau lebih dari 200 karakter. |
| 404 | `EDU_NOT_FOUND` | ID artikel tidak ditemukan. |

---

## 5. [EDU-DELETE-DEL] Hapus Edukasi
- **Method**: `DELETE`
- **Endpoint**: `/api/v1/education/:id` (Ganti `:id` dengan `id_content`)
- **Akses**: Semua Pengguna Login

**Contoh Response Sukses (200 OK):**
```json
{
  "status": "success",
  "message": "Berhasil menghapus edukasi.",
  "code": "DELETE_EDU_SUCCESS"
}
```

**Tabel Response Error:**
| HTTP Status | Error Code | Kondisi / Penjelasan |
|---|---|---|
| 400 | `VALIDATION_ERROR` | `:id` bukan UUID valid. |
| 404 | `EDU_NOT_FOUND` | ID artikel tidak ditemukan atau sudah dihapus sebelumnya (uji idempotensi). |

---

## 6. [EDU-GET-ADMIN] Lihat Daftar / Detail Edukasi (Admin View)
- **Method**: `GET`
- **Endpoint**: `/api/v1/education/admin` (daftar) atau `/api/v1/education/admin?id={{education_id}}` (detail)
- **Akses**: Semua Pengguna Login (tidak ada middleware khusus admin)
- **Deskripsi**: Mengambil data dari database view `view_education`, diurutkan `created_at` terbaru.

**Contoh Response Sukses - Daftar (200 OK):**
```json
{
  "status": "success",
  "message": "Daftar edukasi berhasil ditemukan",
  "code": "GET_EDU_LIST_SUCCESS",
  "data": {
    "data": [
      {
        "id_content": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
        "title": "Judul Artikel",
        "created_at": "2026-10-03T02:00:00.000Z"
      }
    ]
  }
}
```

**Contoh Response Sukses - Detail dengan `?id=` (200 OK):**
```json
{
  "status": "success",
  "message": "Edukasi berhasil ditemukan",
  "code": "GET_EDU_SUCCESS",
  "data": {
    "data": {
      "id_content": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
      "title": "Judul Artikel",
      "created_at": "2026-10-03T02:00:00.000Z"
    }
  }
}
```
*(Catatan: struktur `data.data` bersarang. Field persis mengikuti kolom `view_education`.)*

**Tabel Response Error:**
| HTTP Status | Error Code | Kondisi / Penjelasan |
|---|---|---|
| 404 | `EDU_NOT_FOUND` | Query `?id=` tidak ditemukan. |
| 500 | `INTERNAL_SERVER_ERROR` | Kegagalan query. **Catatan**: `view_education` saat ini tidak ada di `init-scripts/04-view.sql`, sehingga endpoint ini akan 500 sampai view dibuat. |

---

## 7. [EDU-GET-PHOTO] Lihat Foto Edukasi (Stream)
- **Method**: `GET`
- **Endpoint**: `/api/v1/education/photo/:filename` (Ganti `:filename` dengan nilai `education_img` dari response list)
- **Akses**: Semua Pengguna Login

**Contoh Response Sukses (200 OK):**
*(Menampilkan file stream / gambar biner langsung ke Postman / browser)*

**Tabel Response Error:**
| HTTP Status | Error Code | Kondisi / Penjelasan |
|---|---|---|
| 400 | `INVALID_FILENAME` | Filename tidak diberikan. |
| 403 | `FORBIDDEN_PATH` | Path traversal terdeteksi. |
| 404 | `FILE_NOT_FOUND` | File gambar tidak ada di server storage. |
