# Dokumen Uji API: Modul Pengumuman (Announcements)

## Konteks Bersama Modul Announcements
- **Base URL**: `{{base_url}}`
- **Header Auth**: `Authorization: Bearer {{token_variabel}}`
- **Variabel yang digunakan**: `admin_token`, `user_token`, `announcement_id`
- Daftar Endpoint Publik: Pengumuman bisa diakses User/Warga, namun Create/Update/Delete khusus Admin.

---

### [ANC-GET-LIST] GET /api/v1/announcements : Lihat Daftar Pengumuman
- **Sumber**: `src/routes/anc-routes.ts`, `getAncController`
- **Akses**: Semua Login (User, Admin, Super Admin)
- **Query Params**:
  - `search` (string, opsional): Kata kunci pencarian judul.
  - `category_id` (UUID, opsional): Filter kategori.
  - `page` (number, opsional, default: 1)
  - `limit` (number, opsional, default: 10)
- **Respons Sukses**: 200 (`DATA_FOUND`)
- **Respons Error**: 400 (`VALIDATION_ERROR` pada UUID kategori)
- **Skenario Uji**:
  - `ANC-01`: (Validasi) Query `page` bukan angka atau minus (bergantung handler, biasanya di-cast ke 1 jika fallback default).
  - `ANC-02`: (Sukses) Get seluruh data tanpa filter.
  - `ANC-03`: (Validasi) `category_id` dengan format `invalid-uuid` (400).

### [ANC-GET-CATEGORIES] GET /api/v1/announcements/announcement-categories : Kategori
- **Akses**: Semua Login
- **Skenario Uji**:
  - `ANC-04`: (Sukses) Request list kategori (200). Ambil salah satu `id_category` dan simpan untuk request pembuatan pengumuman di skenario `ANC-05`.

### [ANC-POST-CREATE] POST /api/v1/announcements : Buat Pengumuman Baru
- **Sumber**: `addAncController`
- **Akses**: Khusus Admin & Super Admin (`adminOnly`)
- **Body (`multipart/form-data`)**:
  - `title` (string, wajib)
  - `content` (json string, opsional)
  - `category_id` (UUID, wajib)
  - `image` (file JPG/PNG, opsional, max 2MB)
- **Respons Sukses**: 201 (`ADD_ANC_SUCCESS`). Mengembalikan `id_announcements`.
- **Respons Error**: 400 (`VALIDATION_ERROR`), 415 (`INVALID_FILE_TYPE`), 413 (`FILE_TOO_LARGE`).
- **Skenario Uji**:
  - `ANC-05`: (Otorisasi) Warga biasa mencoba membuat pengumuman (403).
  - `ANC-06`: (Validasi) Memasukkan file non-gambar (pdf) pada field `image` (415).
  - `ANC-07`: [DESTRUKTIF] (Sukses) Admin membuat pengumuman berjudul `[TEST] Pengumuman API`. **Simpan id ke `announcement_id`**.

### [ANC-PATCH-EDIT] PATCH /api/v1/announcements/:id : Edit Pengumuman
- **Sumber**: `editAncController`
- **Akses**: Admin & Super Admin
- **Path Params**: `id` (UUID)
- **Skenario Uji**:
  - `ANC-08`: (Validasi) Menggunakan ID yang tidak ada (404 `NOT_FOUND`).
  - `ANC-09`: (Validasi) Menggunakan ID tidak valid/bukan UUID (400).
  - `ANC-10`: [DESTRUKTIF] (Sukses) Mengubah `title` dari `announcement_id` (200).

### [ANC-DELETE-DEL] DELETE /api/v1/announcements/:id : Hapus Pengumuman
- **Sumber**: `deleteAncController`
- **Akses**: Admin & Super Admin
- **Skenario Uji**:
  - `ANC-11`: (Otorisasi) Warga mencoba menghapus pengumuman (403).
  - `ANC-12`: [DESTRUKTIF] (Sukses) Hapus `announcement_id` yang telah dibuat. (200).
  - `ANC-13`: (Idempotensi) Coba hapus lagi UUID yang sama (404).

### [ANC-GET-BY-ID] GET /api/v1/announcements/:id : Lihat Detail Pengumuman
- **Sumber**: `getAncByIdController`
- **Akses**: Semua Login
- **Skenario Uji**:
  - `ANC-14`: (Sukses) Lihat detail pengumuman spesifik (200).

### [ANC-GET-PHOTO] GET /api/v1/announcements/photo/:filename : Lihat Foto Pengumuman
- **Sumber**: `getAncPhotoController`
- **Akses**: Semua Login
- **Skenario Uji**:
  - `ANC-15`: (Sukses) Buka foto dummy1.png (200).
