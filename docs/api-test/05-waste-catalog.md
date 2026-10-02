# Dokumen Uji API: Modul Katalog Sampah (Waste Catalog)

## Konteks Bersama Modul Catalog
- **Base URL**: `{{base_url}}`
- **Header Auth**: `Authorization: Bearer {{token_variabel}}`
- **Variabel yang digunakan**: `admin_token`, `user_token`, `waste_catalog_id`, `category_id_waste`
- Operasi manipulasi kategori dan sampah dibatasi untuk Admin ke atas.

---

### [CAT-GET-CATALOG] GET /api/v1/waste/catalog : Lihat Daftar Harga Sampah
- **Sumber**: `getCatalogController`
- **Akses**: Semua Login
- **Deskripsi**: Menampilkan semua jenis harga dan satuan sampah.
- **Respons Sukses**: 200 (`GET_CATALOG_SUCCESS`)
- **Skenario Uji**:
  - `CAT-01`: (Sukses) Dapatkan list katalog tanpa filter khusus (200).

### [CAT-GET-CATEGORIES] GET /api/v1/waste/admin/waste-categories : Lihat Kategori Sampah
- **Sumber**: `getCategoriesController`
- **Akses**: Khusus Admin & Super Admin
- **Respons Sukses**: 200 (`GET_CATEGORIES_SUCCESS`)
- **Skenario Uji**:
  - `CAT-02`: (Sukses) Dapatkan daftar kategori (200). **(Simpan salah satu ID kategori (angka) ke variabel `category_id_waste`)**.
  - `CAT-03`: (Otorisasi) Di akses warga biasa (403).

### [CAT-POST-CREATE] POST /api/v1/waste/admin/waste-types : Buat Jenis Sampah Baru
- **Sumber**: `addCatalogController`
- **Akses**: Khusus Admin
- **Body JSON**:
  - `name` (string, wajib, unik)
  - `category_id` (number, wajib)
  - `unit` (string, mis. kg, pcs)
  - `price` (number, harga bersih, >= 0)
- **Respons Sukses**: 201 (`ADD_CATALOG_SUCCESS`). Mengembalikan `id_waste`.
- **Respons Error**: 400 (`INVALID_NAME`, `INVALID_CATEGORY`, `INVALID_PRICE`, `CATEGORY_NOT_FOUND`, `NAME_ALREADY_EXISTS`).
- **Skenario Uji**:
  - `CAT-04`: (Validasi) Membuat dengan field `price` negatif (400).
  - `CAT-05`: (Validasi) Membuat dengan kategori yang tidak ada (999) (400).
  - `CAT-06`: [DESTRUKTIF] (Sukses) Admin membuat sampah jenis `[TEST] Kardus Tebal`. **Simpan id ke `waste_catalog_id`**.
  - `CAT-07`: (Konflik) Membuat sampah dengan nama duplikat `[TEST] Kardus Tebal` (400 `NAME_ALREADY_EXISTS`).

### [CAT-PATCH-EDIT] PATCH /api/v1/waste/admin/waste-types/:id : Edit Jenis Sampah
- **Sumber**: `editCatalogController`
- **Akses**: Khusus Admin
- **Skenario Uji**:
  - `CAT-08`: (Validasi) Menggunakan ID yang tidak valid (404).
  - `CAT-09`: [DESTRUKTIF] (Sukses) Mengubah `price` atau nama `waste_catalog_id` (200).

### [CAT-PATCH-PHOTO] PATCH /api/v1/waste/admin/waste-types/:id/photo : Upload Foto Katalog
- **Sumber**: `uploadCatalogImgController`
- **Akses**: Admin
- **Body (`multipart/form-data`)**: `image` (max 5MB).
- **Skenario Uji**:
  - `CAT-10`: [DESTRUKTIF] (Sukses) Upload gambar dummy untuk `waste_catalog_id` (200).

### [CAT-DELETE-DEL] DELETE /api/v1/waste/admin/waste-types/:id : Hapus Jenis Sampah
- **Sumber**: `deleteCatalogController`
- **Akses**: Admin
- **Skenario Uji**:
  - `CAT-11`: [DESTRUKTIF] (Sukses) Menghapus `waste_catalog_id` (200).

### [CAT-GET-PHOTO] GET /api/v1/waste/catalog/photo/:filename : Lihat Foto Katalog
- **Sumber**: `getCatalogPhotoController`
- **Akses**: Semua Login
- **Skenario Uji**:
  - `CAT-12`: (Sukses) Lihat foto katalog (200).
