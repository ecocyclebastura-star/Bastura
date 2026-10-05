# Dokumen Uji API: Modul Katalog Sampah (Waste Catalog)

## Konteks Bersama Modul Catalog
- **Base URL**: `{{base_url}}` (contoh: `http://localhost:3000`)
- **Header Auth**: `Authorization: Bearer {{token_variabel}}`
- **Tipe Konten**: Semua request body JSON menggunakan `application/json`, khusus foto pakai `multipart/form-data`.
- Akses baca katalog terbuka untuk publik/warga, namun fitur manajemen dan kategori khusus untuk **Admin** dan **Super Admin**.

---

## 1. [CAT-GET-CATALOG] Lihat Daftar Harga Sampah
- **Method**: `GET`
- **Endpoint**: `/api/v1/waste/catalog`
- **Akses**: Semua Pengguna Login (Warga, Admin, Super Admin)

**Contoh Response Sukses (200 OK):**
```json
{
  "status": "success",
  "message": "Data katalog sampah ditemukan",
  "code": "GET_CATALOG_SUCCESS",
  "data": [
    {
      "id_waste": "10000000-0000-0000-0000-000000000001",
      "name": "Botol Plastik PET",
      "category_id": 1,
      "unit": "kg",
      "price": 3000,
      "description": "Botol plastik bekas minuman",
      "catalog_img": "catalog-test.png"
    }
  ]
}
```

---

## 2. [CAT-GET-CATEGORIES] Lihat Kategori Sampah
- **Method**: `GET`
- **Endpoint**: `/api/v1/waste/catalog-categories`
- **Akses**: Semua Pengguna Login

**Contoh Response Sukses (200 OK):**
```json
{
  "status": "success",
  "message": "Data kategori berhasil diambil",
  "code": "GET_CATEGORIES_SUCCESS",
  "data": [
    {
      "id_waste_category": 1,
      "category_name": "Plastik",
      "ct_description": "Sampah plastik seperti botol dan kemasan"
    },
    {
      "id_waste_category": 2,
      "category_name": "Kertas",
      "ct_description": "Sampah kertas seperti kardus dan HVS bekas"
    }
  ]
}
```

---

## 3. [CAT-POST-CREATE] Buat Jenis Sampah Baru
- **Method**: `POST`
- **Endpoint**: `/api/v1/waste/catalog`
- **Akses**: Semua Pengguna Login

**Panduan Postman (tab Body -> raw -> JSON):**
```json
{
  "name": "[TEST] Kardus Tebal",
  "category_id": 2,
  "unit": "kg",
  "price": 2000,
  "description": "Kardus bekas elektronik yang tebal"
}
```
*(Catatan: `category_id` menggunakan tipe data Number, bukan UUID)*

**Contoh Response Sukses (201 Created):**
```json
{
  "status": "success",
  "message": "Jenis sampah berhasil ditambahkan",
  "code": "ADD_CATALOG_SUCCESS",
  "data": {
    "id_waste": "d2f3a4b5-c6d7-e8f9-a0b1-c2d3e4f5a6b7"
  }
}
```
*(Simpan UUID dari `id_waste` di atas untuk Edit, Upload, dan Delete)*

**Tabel Response Error:**
| HTTP Status | Error Code | Kondisi / Penjelasan |
|---|---|---|
| 400 | `INVALID_NAME` | Nama kosong. |
| 400 | `INVALID_CATEGORY` | `category_id` bukan angka atau kategori tidak ada di tabel. |
| 400 | `INVALID_PRICE` | `price` diisi minus atau bukan angka. |
| 400 | `NAME_ALREADY_EXISTS` | Nama sampah tersebut sudah digunakan sebelumnya (unik). |

---

## 4. [CAT-PATCH-EDIT] Edit Jenis Sampah
- **Method**: `PATCH`
- **Endpoint**: `/api/v1/waste/catalog/:id` (Ganti `:id` dengan `id_waste`)
- **Akses**: Semua Pengguna Login

**Panduan Postman (tab Body -> raw -> JSON):**
```json
{
  "price": 2500,
  "description": "Kardus tebal harga naik"
}
```

**Contoh Response Sukses (200 OK):**
```json
{
  "status": "success",
  "message": "Katalog sampah berhasil diperbarui",
  "code": "UPDATE_CATALOG_SUCCESS"
}
```

**Tabel Response Error:**
| HTTP Status | Error Code | Kondisi / Penjelasan |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Format UUID salah atau tipe data field ada yang invalid. |
| 404 | `CATALOG_NOT_FOUND` | ID tidak ditemukan. |

---

## 5. [CAT-PATCH-PHOTO] Upload Foto Katalog Sampah
- **Method**: `POST`
- **Endpoint**: `/api/v1/waste/catalog/photo/:id` (Ganti `:id` dengan `id_waste`)
- **Akses**: Semua Pengguna Login
- **Content-Type**: `multipart/form-data`

**Panduan Postman (tab Body -> form-data):**
| Key | Type | Value |
|---|---|---|
| `image` | File | *(Pilih file gambar JPG/PNG maksimal 5MB)* |

**Contoh Response Sukses (200 OK):**
```json
{
  "status": "success",
  "message": "Foto katalog berhasil diupload",
  "code": "UPLOAD_PHOTO_SUCCESS"
}
```

**Tabel Response Error:**
| HTTP Status | Error Code | Kondisi / Penjelasan |
|---|---|---|
| 404 | `CATALOG_NOT_FOUND` | Katalog sampah tidak ditemukan. |
| 413 | `FILE_TOO_LARGE` | Ukuran gambar melebihi 5MB. |

---

## 6. [CAT-DELETE-DEL] Hapus Jenis Sampah
- **Method**: `DELETE`
- **Endpoint**: `/api/v1/waste/catalog/:id`
- **Akses**: Semua Pengguna Login

**Contoh Response Sukses (200 OK):**
```json
{
  "status": "success",
  "message": "Jenis sampah berhasil dihapus",
  "code": "DELETE_CATALOG_SUCCESS"
}
```

**Tabel Response Error:**
| HTTP Status | Error Code | Kondisi / Penjelasan |
|---|---|---|
| 404 | `CATALOG_NOT_FOUND` | ID sampah tidak ditemukan atau sudah dihapus. |

---

## 7. [CAT-GET-PHOTO] Lihat Foto Katalog Sampah (Stream)
- **Method**: `GET`
- **Endpoint**: `/api/v1/waste/catalog/photo/:filename` (Ganti `:filename` dengan nama dari response katalog list)
- **Akses**: Semua Pengguna Login

**Contoh Response Sukses (200 OK):**
*(Menampilkan file stream / gambar biner ke Postman / browser)*

**Tabel Response Error:**
| HTTP Status | Error Code | Kondisi / Penjelasan |
|---|---|---|
| 404 | `NOT_FOUND` | Gambar tidak ditemukan di server. |

---

## 8. [CAT-POST-SCAN-AI] Scan Sampah Menggunakan AI
- **Method**: `POST`
- **Endpoint**: `/api/v1/waste/catalog/scan-ai`
- **Akses**: Semua Pengguna Login
- **Content-Type**: `multipart/form-data`

**Panduan Postman (tab Body -> form-data):**
| Key | Type | Value |
|---|---|---|
| `image` | File | *(Pilih file gambar sampah JPG/PNG/WEBP maksimal 5MB)* |

**Contoh Response Sukses (200 OK) - Item Dikenali:**
```json
{
  "status": "ok",
  "message": null,
  "items": [
    {
      "catalog_id": "10000000-0000-0000-0000-000000000001",
      "name": "Kardus",
      "condition": "Kondisi kardus terlihat sedikit basah di bagian sudut",
      "price_per_kg": 500,
      "accepted": true,
      "confidence": 0.95
    }
  ],
  "disclaimer": "Harga bersifat perkiraan dan dapat berubah. Harga akhir ditentukan admin saat penimbangan.",
  "remaining": 1,
  "limit": 2
}
```

**Tabel Status Response AI (Selalu 200 OK):**
| Status Field | Kondisi / Penjelasan |
|---|---|
| `ok` | AI berhasil mendeteksi minimal satu item bernilai (> Rp 0). |
| `not_accepted` | Semua item yang dikenali berharga Rp 0. |
| `not_in_catalog` | Gambar jelas tapi AI tidak mengenali sampah yang ada di katalog. |
| `unclear_image` | Gambar terlalu blur atau tidak terlihat seperti sampah. |

**Tabel Response Error System:**
| HTTP Status | Error Code | Kondisi / Penjelasan |
|---|---|---|
| 400 | `IMAGE_REQUIRED` | Form-data `image` kosong. |
| 400 | `INVALID_FILE_TYPE` | File bukan JPG/PNG/WEBP. |
| 400 | `FILE_TOO_LARGE` | Ukuran gambar melebihi 5MB. |
| 429 | `QUOTA_EXCEEDED` | Kuota scan harian Anda telah habis. (Terdapat `remaining` dan `limit` di `data`) |
| 500 | `INTERNAL_SERVER_ERROR` | Gagal memanggil AI SumoPod atau kegagalan internal lainnya. |

---

## 9. [CAT-GET-SCAN-QUOTA] Cek Sisa Kuota Scan AI
- **Method**: `GET`
- **Endpoint**: `/api/v1/waste/catalog/scan-ai/quota`
- **Akses**: Semua Pengguna Login

**Contoh Response Sukses (200 OK):**
```json
{
  "status": "success",
  "message": "Berhasil mengambil sisa kuota",
  "data": {
    "remaining": 2,
    "limit": 2
  }
}
```
*(Catatan: untuk superadmin, nilainya "unlimited")*
