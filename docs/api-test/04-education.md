# Dokumen Uji API: Modul Edukasi (Education)

## Konteks Bersama Modul Education
- **Base URL**: `{{base_url}}`
- **Header Auth**: `Authorization: Bearer {{token_variabel}}`
- **Variabel yang digunakan**: `admin_token`, `user_token`, `education_id`
- Daftar Endpoint Publik: Konten edukasi bisa diakses Warga, namun fitur manajemen (CRUD) khusus Admin dan Super Admin.

---

### [EDU-GET-LIST] GET /api/v1/education : Lihat Daftar Edukasi
- **Sumber**: `getEduController`
- **Akses**: Semua Login
- **Deskripsi**: Menampilkan semua konten edukasi untuk sisi publik/Warga.
- **Respons Sukses**: 200 (`DATA_FOUND`)
- **Skenario Uji**:
  - `EDU-01`: (Otorisasi) Mengakses tanpa token (401).
  - `EDU-02`: (Sukses) Get seluruh data edukasi (200).

### [EDU-POST-CREATE] POST /api/v1/education/admin/education : Buat Edukasi Baru
- **Sumber**: `addEduController`
- **Akses**: Khusus Admin & Super Admin (`adminOnly`)
- **Body (`application/json`)**:
  - `title` (string, wajib, maks 200 karakter)
  - `content` (json object, wajib)
- **Respons Sukses**: 201 (`ADD_EDU_SUCCESS`). Mengembalikan `id_content`.
- **Respons Error**: 400 (`INVALID_TITLE`, `INVALID_CONTENT`).
- **Skenario Uji**:
  - `EDU-03`: (Validasi) Membuat artikel dengan field `title` kosong (400).
  - `EDU-04`: (Validasi) Membuat artikel dengan field `title` panjang (400).
  - `EDU-05`: [DESTRUKTIF] (Sukses) Admin membuat artikel edukasi `[TEST] Edukasi API`. **Simpan id ke `education_id`**.

### [EDU-PATCH-PHOTO] PATCH /api/v1/education/admin/education/:id/photo : Upload Foto Edukasi
- **Sumber**: `uploadEduImgController`
- **Akses**: Khusus Admin & Super Admin (`adminOnly`)
- **Body (`multipart/form-data`)**:
  - `image` (file JPG/PNG, wajib, max 2MB)
- **Respons Sukses**: 200 (`UPLOAD_PHOTO_SUCCESS`)
- **Respons Error**: 400 (`IMAGE_REQUIRED`), 415 (`INVALID_FILE_TYPE`), 413 (`FILE_TOO_LARGE`), 404 (`EDU_NOT_FOUND`).
- **Skenario Uji**:
  - `EDU-06`: (Validasi) Mengirim tanpa file (400).
  - `EDU-07`: (Validasi) File dummy `test.pdf` (415).
  - `EDU-08`: [DESTRUKTIF] (Sukses) Upload gambar dummy (test.png) ke `education_id` (200).

### [EDU-PATCH-EDIT] PATCH /api/v1/education/admin/education/:id : Edit Edukasi
- **Sumber**: `editEduController`
- **Akses**: Khusus Admin & Super Admin
- **Skenario Uji**:
  - `EDU-09`: [DESTRUKTIF] (Sukses) Mengubah `title` dari `education_id` menjadi `[TEST] Update Edukasi` (200).

### [EDU-DELETE-DEL] DELETE /api/v1/education/admin/education/:id : Hapus Edukasi
- **Sumber**: `deleteEduController`
- **Akses**: Admin & Super Admin
- **Skenario Uji**:
  - `EDU-10`: [DESTRUKTIF] (Sukses) Hapus `education_id` yang telah dibuat. (200).
  - `EDU-11`: (Validasi) Hapus ulang `education_id` (404).

### [EDU-GET-ADMIN] GET /api/v1/education/admin/education : List Edukasi (Admin)
- **Sumber**: `getAdminEduController`
- **Akses**: Khusus Admin
- **Skenario Uji**:
  - `EDU-12`: (Sukses) Get list edukasi di admin (200).

### [EDU-GET-PHOTO] GET /api/v1/education/photo/:filename : Lihat Foto Edukasi
- **Sumber**: `getEduPhotoController`
- **Akses**: Semua Login
- **Skenario Uji**:
  - `EDU-13`: (Sukses) Lihat file edukasi (200).
