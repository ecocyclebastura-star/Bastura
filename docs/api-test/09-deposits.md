# Dokumen Uji API: Modul Setoran (Deposits)

## Konteks Bersama Modul Setoran
- **Base URL**: `{{base_url}}` (contoh: `http://localhost:3000`)
- **Header Auth**: `Authorization: Bearer {{token_variabel}}`
- **Tipe Konten**: Request body menggunakan `application/json`.
- Modul ini dikhususkan untuk **Admin** dan **Super Admin** untuk mencatat setoran sampah warga.
- Prasyarat data: Membutuhkan data *User* (Warga, role 1) dan *Waste Catalog* (id_waste). Karena skema database baru ditambahkan kolom `created_by` pada `deposit` dan `details` pada `audit_logs`, pastikan database telah berjalan dengan skema versi terbaru (hapus volume dan build ulang).

---

### [DEP-GET-LIST] GET /api/v1/deposits : getDepositsController
- **Sumber**: `bastura-api/src/routes/deposit-routes.ts` dan `bastura-api/src/controller/deposit-controller/get-deposit-controller.ts`
- **Akses**: admin / super admin
- **Status**: ada di kode (branch docs/update-api-deposits) / belum ada di build yang berjalan
- **Deskripsi**: Mendapatkan daftar semua setoran beserta pagination dan filter.
- **Urutan pengecekan di server**:
  1. Autentikasi JWT (`checkAccessToken`)
  2. Pengecekan role (`adminOnly`)
  3. Validasi status (opsional)
  4. Ambil dari database dengan limit dan offset
- **Headers, Path params, Query params, Body**:
  - Header: `Authorization` (wajib, Bearer)
  - Query param `page` (opsional, integer, default 1)
  - Query param `limit` (opsional, integer, maks 50, default 10)
  - Query param `search` (opsional, string pencarian nama warga)
  - Query param `status` (opsional, enum `processed`, `canceled`, `success`, `rejected`, `deleted`)
- **Respons sukses**: 200 OK
  ```json
  {
    "status": "success",
    "action": "list_deposits",
    "title": "Berhasil",
    "message": "Berhasil mengambil daftar setoran.",
    "code": "SUCCESS",
    "data": {
      "data": [
        {
          "id": "uuid-deposit",
          "user": { "id": "uuid-user", "name": "Budi" },
          "category": { "name": "Plastik", "catalog_name": "Botol PET" },
          "total_weight": "5.5",
          "status": "processed",
          "created_at": "2023-10-01T00:00:00.000Z"
        }
      ],
      "total": 1,
      "page": 1,
      "limit": 10
    }
  }
  ```
  | Field | Tipe | Null | Catatan |
  |---|---|---|---|
  | `data` | Array | No | Daftar setoran |
  | `total` | Number | No | Total baris di database |
- **Respons error**: 
  - 400 | `VALIDATION_ERROR` | Status tidak valid | `{ "status": "error", "message": "Status tidak valid." }`
  - 401 | `ERR_UNAUTHORIZED` | Tidak ada token | -
  - 403 | `ERR_FORBIDDEN` | Role Warga (1) mengakses | -
- **Efek samping**: Tidak ada
- **Prasyarat data, Variabel Postman**: -
- **Skenario uji**:
  - `DEP-GET-LIST-01` | Sukses ambil list (Admin) | GET /deposits | 200 OK | `status` == "success", `data.data` array
  - `DEP-GET-LIST-02` | Tanpa token | GET /deposits | 401 Unauthorized |
  - `DEP-GET-LIST-03` | Token user Warga | GET /deposits (User Token) | 403 Forbidden |
  - `DEP-GET-LIST-04` | Status tidak valid | GET /deposits?status=ngawur | 400 Bad Request |
  - `DEP-GET-LIST-05` | Filter status dan search | GET /deposits?search=test&status=processed | 200 OK |
- **Pembersihan**: -

---

### [DEP-GET-DETAIL] GET /api/v1/deposits/:id : getDepositDetailController
- **Sumber**: `bastura-api/src/routes/deposit-routes.ts` dan `bastura-api/src/controller/deposit-controller/get-deposit-controller.ts`
- **Akses**: admin / super admin
- **Status**: ada di kode (branch docs/update-api-deposits) / belum ada di build yang berjalan
- **Deskripsi**: Mendapatkan detail setoran spesifik berdasarkan ID deposit.
- **Urutan pengecekan di server**:
  1. Autentikasi JWT, Role check
  2. Validasi format UUID untuk `id`
  3. Query JOIN ke database
- **Headers, Path params, Query params, Body**:
  - Header: `Authorization` (wajib)
  - Path param `id` (wajib, string UUID valid)
- **Respons sukses**: 200 OK
  ```json
  {
    "status": "success",
    "action": "detail_deposit",
    "title": "Berhasil",
    "message": "Berhasil mengambil detail setoran.",
    "code": "SUCCESS",
    "data": {
      "id": "uuid-deposit",
      "user": { "id": "uuid-user", "name": "Budi", "phone": "081234" },
      "items": [
        { "id": "uuid-deposit", "category_id": "uuid-catalog", "category_name": "Plastik", "catalog_name": "Botol", "description": "Kotor", "weight_kg": "5.5" }
      ],
      "total_weight": "5.5",
      "status": "processed",
      "created_by": { "id": "uuid-admin", "name": "Admin Budi" },
      "created_at": "...",
      "updated_at": "..."
    }
  }
  ```
  | Field | Tipe | Null | Catatan |
  |---|---|---|---|
  | `data` | Object | No | Data detail |
- **Respons error**:
  - 400 | `VALIDATION_ERROR` | ID bukan UUID | `{ "message": "ID setoran wajib berupa UUID." }`
  - 404 | `NOT_FOUND` | ID deposit tidak ditemukan | `{ "message": "Setoran tidak ditemukan." }`
- **Efek samping**: Tidak ada
- **Prasyarat data, Variabel Postman**: Membaca `{{deposit_id}}` (disimpan dari langkah POST).
- **Skenario uji**:
  - `DEP-GET-DETAIL-01` | Sukses ambil detail | GET /deposits/{{deposit_id}} | 200 OK | `data.id` sama dengan parameter
  - `DEP-GET-DETAIL-02` | UUID format salah | GET /deposits/bukan-uuid | 400 Bad Request | `code` == "VALIDATION_ERROR"
  - `DEP-GET-DETAIL-03` | ID tidak ditemukan | GET /deposits/00000000-0000-0000-0000-000000000000 | 404 Not Found |
- **Pembersihan**: -

---

### [DEP-POST-ADD] POST /api/v1/deposits : addDepositController
- **Sumber**: `bastura-api/src/routes/deposit-routes.ts` dan `bastura-api/src/controller/deposit-controller/add-deposit-controller.ts`
- **Akses**: admin / super admin
- **Status**: ada di kode (branch docs/update-api-deposits) / belum ada di build yang berjalan
- **Deskripsi**: Menambahkan catatan setoran baru untuk seorang warga (status awal: 'processed').
- **Urutan pengecekan di server**:
  1. Auth & role check.
  2. Validasi body: `user_id` dan `category_id` valid UUID, `description` tidak kosong & <150 char, `weight_kg` number > 0 & <= 1000.
  3. Cek di DB apakah user ada & role-nya Warga (1).
  4. Cek di DB apakah catalog (`category_id`) ada & belum dihapus.
  5. Insert ke tabel `deposit`, insert ke tabel `audit_logs` (tipe `ADD_DEPOSIT`).
- **Headers, Path params, Query params, Body**:
  - Body: JSON
    - `user_id` (wajib, UUID)
    - `category_id` (wajib, UUID merujuk ke tabel waste_catalog)
    - `description` (wajib, String max 150)
    - `weight_kg` (wajib, Number > 0 dan <= 1000)
- **Respons sukses**: 201 Created
  ```json
  {
    "status": "success",
    "action": "add_deposit",
    "title": "Setoran berhasil ditambahkan.",
    "message": "Setoran berhasil ditambahkan.",
    "code": "SUCCESS",
    "data": { "id_deposit": "uuid-deposit-baru" }
  }
  ```
  | Field | Tipe | Null | Catatan |
  |---|---|---|---|
  | `id_deposit` | String | No | ID dari deposit yang baru dibuat |
- **Respons error**:
  - 400 | `VALIDATION_ERROR` | Format body salah, ID tidak valid, berat di luar batas, User bukan role Warga, kategori sampah hilang. |
  - 404 | `NOT_FOUND` | Warga tidak ditemukan. |
- **Efek samping**: Menambah row di tabel `deposit` dengan status 'processed' dan tabel `audit_logs`.
- **Prasyarat data, Variabel Postman**: Menggunakan `{{target_user_id}}` dan `{{waste_catalog_id}}`. Menyimpan `{{deposit_id}}` dari response sukses.
- **Skenario uji**:
  - `DEP-POST-ADD-01` | [TEST] Tambah sukses | POST /deposits | 201 Created | Simpan `deposit_id` ke variabel.
  - `DEP-POST-ADD-02` | `user_id` format salah | POST /deposits (user_id bukan UUID) | 400 Bad Request | `code` == "VALIDATION_ERROR"
  - `DEP-POST-ADD-03` | `weight_kg` negatif | POST /deposits (weight_kg: -5) | 400 Bad Request |
  - `DEP-POST-ADD-04` | `weight_kg` > 1000 | POST /deposits (weight_kg: 2000) | 400 Bad Request |
  - `DEP-POST-ADD-05` | Deskripsi kosong | POST /deposits (description: "") | 400 Bad Request |
  - `DEP-POST-ADD-06` | Warga tidak ditemukan | POST /deposits (user_id UUID sembarang) | 404 Not Found |
  - `DEP-POST-ADD-07` | User bukan Warga | POST /deposits (menggunakan user_id milik admin) | 400 Bad Request | `message` == "ID yang diberikan bukan warga."
- **Pembersihan**: Membutuhkan eksekusi endpoint DELETE pada ID ini di folder Cleanup.

---

### [DEP-PATCH-EDIT] PATCH /api/v1/deposits/:id : editDepositController
- **Sumber**: `bastura-api/src/routes/deposit-routes.ts` dan `bastura-api/src/controller/deposit-controller/edit-deposit-controller.ts`
- **Akses**: admin / super admin
- **Status**: ada di kode (branch docs/update-api-deposits) / belum ada di build yang berjalan
- **Deskripsi**: Mengubah data setoran (kategori, deskripsi, berat). Hanya bisa mengubah jika status masih 'processed'.
- **Urutan pengecekan di server**:
  1. Auth & role check.
  2. Validasi parameter `id` UUID.
  3. Validasi dilarang mengubah `user_id`.
  4. Validasi body field lain (opsional).
  5. Pastikan deposit ada dan `dp_status == 'processed'`.
  6. Update DB `deposit` dan catat `EDIT_DEPOSIT` di `audit_logs`.
- **Headers, Path params, Query params, Body**:
  - Path param: `id` (wajib, UUID deposit)
  - Body: JSON
    - `category_id` (opsional, UUID)
    - `description` (opsional, String)
    - `weight_kg` (opsional, Number > 0 dan <= 1000)
    - `user_id` (TIDAK BOLEH dikirim)
- **Respons sukses**: 200 OK
  ```json
  {
    "status": "success",
    "action": "edit_deposit",
    "title": "Setoran berhasil diperbarui.",
    "code": "SUCCESS",
    "data": null
  }
  ```
- **Respons error**:
  - 400 | `VALIDATION_ERROR` | `user_id` dikirim, body format tidak sesuai batas. |
  - 404 | `NOT_FOUND` | Deposit tidak ditemukan. |
  - 409 | `CONFLICT` | Status deposit bukan 'processed'. |
- **Efek samping**: Memperbarui tabel `deposit` dan insert ke `audit_logs`.
- **Prasyarat data, Variabel Postman**: `{{deposit_id}}`
- **Skenario uji**:
  - `DEP-PATCH-EDIT-01` | [TEST] Sukses ubah berat | PATCH /deposits/{{deposit_id}} | 200 OK |
  - `DEP-PATCH-EDIT-02` | Ubah mengirim `user_id` | PATCH /deposits/{{deposit_id}} (dengan body `user_id`) | 400 Bad Request |
  - `DEP-PATCH-EDIT-03` | Deposit tidak ditemukan | PATCH /deposits/00000000-0000-0000-0000-000000000000 | 404 Not Found |
- **Pembersihan**: -

---

### [DEP-DEL-DELETE] DELETE /api/v1/deposits/:id : deleteDepositController
- **Sumber**: `bastura-api/src/routes/deposit-routes.ts` dan `bastura-api/src/controller/deposit-controller/delete-deposit-controller.ts`
- **Akses**: admin / super admin
- **Status**: ada di kode (branch docs/update-api-deposits) / belum ada di build yang berjalan
- **Deskripsi**: Menghapus catatan setoran secara permanen (Hard Delete) dengan syarat status masih 'processed'.
- **Urutan pengecekan di server**:
  1. Auth & role check.
  2. Validasi parameter `id` UUID.
  3. Cek DB jika deposit ada & status 'processed'.
  4. DELETE row dari tabel `deposit`.
  5. Catat `DELETE_DEPOSIT` dengan snapshot data dalam kolom `details` tabel `audit_logs`.
- **Headers, Path params, Query params, Body**:
  - Path param: `id` (wajib, UUID deposit)
- **Respons sukses**: 200 OK
  ```json
  {
    "status": "success",
    "action": "delete_deposit",
    "title": "Setoran berhasil dihapus.",
    "code": "SUCCESS",
    "data": null
  }
  ```
- **Respons error**:
  - 400 | `VALIDATION_ERROR` | Parameter UUID salah. |
  - 404 | `NOT_FOUND` | Deposit tidak ditemukan. |
  - 409 | `CONFLICT` | Status deposit bukan 'processed'. |
- **Efek samping**: [DESTRUKTIF] Hard delete pada tabel `deposit`, row bertambah di `audit_logs`.
- **Prasyarat data, Variabel Postman**: `{{deposit_id}}`
- **Skenario uji**:
  - `DEP-DEL-DELETE-01` | ID tidak ditemukan | DELETE /deposits/00000000-0000-0000-0000-000000000000 | 404 Not Found |
  - `DEP-DEL-DELETE-02` | [DESTRUKTIF] Sukses hapus | DELETE /deposits/{{deposit_id}} | 200 OK |
- **Pembersihan**: Data berhasil dihapus dan tidak perlu dibersihkan lagi.
