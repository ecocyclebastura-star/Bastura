# Dokumen Uji API: Modul Pengguna (Users / Profile)

## Konteks Bersama Modul Users
- **Base URL**: `{{base_url}}`
- **Header Auth**: `Authorization: Bearer {{token_variabel}}`
- **Variabel yang digunakan**: `user_token`, `admin_token`, `superadmin_token`, `target_user_id` (Didapat dari endpoint signup di Setup)
- Format respons sukses dan error mengikuti standar.
- Pengaturan blokir, promote, demote hanya bisa dilakukan oleh Super Admin (promote/demote) atau Admin (block/unblock).

---

### [USER-GET-PROFILE] GET /api/v1/users/account/profile : Lihat Profil Sendiri
- **Sumber**: `src/routes/profile-routes.ts`, `src/controller/profile-controller/get-user.ts`
- **Akses**: Warga, Admin, Super Admin
- **Deskripsi**: Menampilkan data profil dari pemilik token yang sedang login.
- **Respons Sukses**: 200, `data` berisi detail pengguna.
- **Skenario Uji**:
  - `USER-01`: Mengakses profil tanpa Bearer token (401).
  - `USER-02`: Mengakses dengan token rusak (401).
  - `USER-03`: (Sukses) Mengakses profil dengan token Warga (200).

### [USER-PATCH-PROFILE] PATCH /api/v1/users/account/profile : Update Profil
- **Sumber**: `src/routes/profile-routes.ts`, `src/controller/profile-controller/update-user.ts`
- **Akses**: Semua Pengguna (Pemilik Akun)
- **Body JSON**: `name`, `phone` (opsional). Note: Tidak bisa update email/password lewat sini.
- **Respons Error**: 400 (`REQUEST_INVALID`), 404 (`USER_NOT_FOUND`).
- **Skenario Uji**:
  - `USER-04`: (Sukses) Update nama menjadi `[TEST] Nama Baru` (200).
  - `USER-05`: Update dengan payload yang salah (400).

### [USER-PATCH-CHANGEPASS] PATCH /api/v1/users/account/profile/changepass : Ubah Sandi
- **Sumber**: `src/controller/profile-controller/changepass.ts`
- **Akses**: Semua Pengguna
- **Body JSON**: `old_password`, `new_password`, `conf_password` (wajib).
- **Respons Error**: 400 (`MISSING_FIELDS`, `PASSWORD_MISMATCH`, `SAME_PASSWORD`), 401 (`INVALID_OLD_PASSWORD`).
- **Skenario Uji**:
  - `USER-06`: Password lama salah (401).
  - `USER-07`: Password baru dan konfirmasi berbeda (400).
  - `USER-08`: Password baru sama dengan lama (400).

### [USER-GET-WARGA] GET /api/v1/users/account/warga : List Semua Warga
- **Sumber**: `src/controller/users_data/get-warga-controller.ts`
- **Akses**: Admin, Super Admin (Guard: `adminOnly`)
- **Deskripsi**: Mengambil list user khusus warga. Menarik view `view_data_warga`.
- **Skenario Uji**:
  - `USER-09`: (Otorisasi) Diakses oleh Warga (403 Forbidden).
  - `USER-10`: (Sukses) Diakses oleh Admin (200). Pastikan struktur array ada data.

### [USER-PATCH-BLOCK] PATCH /api/v1/users/account/warga/block/:id_user : Blokir Warga
- **Sumber**: `src/controller/admin/block-users-controller.ts`
- **Akses**: Admin, Super Admin
- **Deskripsi**: Mengubah `status_active` warga menjadi `blocked`.
- **Path params**: `id_user` (UUID).
- **Respons Error**: 400 (`ID_NOT_FOUND`), 404 (`USER_NOT_FOUND`), 403 (`ACCESS_DENIED_UR_NOT_ADMIN`).
- **Skenario Uji**:
  - `USER-11`: [DESTRUKTIF] (Sukses) Blokir test user menggunakan token Admin. Pastikan ID menggunakan `target_user_id` dari setup. (200)
  - `USER-12`: (Otorisasi) Mengakses pakai token Warga (403).
  - `USER-13`: (Validasi) Memblokir UUID yang tidak ada di server (404).

### [USER-PATCH-UNBLOCK] PATCH /api/v1/users/account/warga/unblock/:id_user : Buka Blokir Warga
- **Sumber**: `src/controller/admin/unblock-users-controller.ts`
- **Akses**: Admin, Super Admin
- **Skenario Uji**:
  - `USER-14`: (Sukses) Buka blokir `target_user_id` yang diblokir di `USER-11` (200).

### [USER-PATCH-PROMOTE] PATCH /api/v1/users/account/warga/promote/:id_user : Jadikan Admin
- **Sumber**: `src/controller/admin/promote-admin-controller.ts`
- **Akses**: HANYA Super Admin (`superAdminGuard`)
- **Respons Error**: 400 (`VALIDATION_ERROR`), 404 (`USER_NOT_FOUND`), 409 (`CONFLICT_ROLE`, `USER_BLOCKED`).
- **Efek Samping**: Ubah `role_id` ke 2, log di `audit_logs`.
- **Skenario Uji**:
  - `USER-15`: (Otorisasi) Admin mencoba promote warga (403 Forbidden).
  - `USER-16`: (Validasi) Promote target non-UUID `not-a-uuid` (400).
  - `USER-17`: (Konflik) Promote target yang sedang diblokir (Simulasikan ini atau abaikan jika state sulit dikontrol) (409).
  - `USER-18`: [DESTRUKTIF] (Sukses) Super Admin mem-promote `target_user_id` (200).
  - `USER-19`: (Konflik) Promote user yang sudah admin (409 `CONFLICT_ROLE`).

### [USER-PATCH-DEMOTE] PATCH /api/v1/users/account/warga/demote/:id_user : Cabut Admin
- **Sumber**: `src/controller/admin/demote-admin-controller.ts`
- **Akses**: HANYA Super Admin
- **Respons Error**: 409 (`CONFLICT_ROLE`), 403 (`FORBIDDEN_SELF_DEMOTE`).
- **Skenario Uji**:
  - `USER-20`: (Konflik) Demote user yang bukan admin (409).
  - `USER-21`: (Aturan Bisnis) Demote diri sendiri menggunakan Super Admin ID (403).
  - `USER-22`: [DESTRUKTIF] (Sukses) Super Admin men-demote kembali admin (bekas `target_user_id`) (200).

### [USER-PATCH-DEACTIVE] PATCH /api/v1/users/account/profile/deactive : Hapus Akun Sendiri
- **Sumber**: `delete-user.ts`
- **Akses**: Semua Login
- **Deskripsi**: Menonaktifkan akun sendiri.
- **Respons Sukses**: 200 (`DELETE_USER_SUCCESS`)
- **Skenario Uji**:
  - `USER-23`: [DESTRUKTIF] (Sukses) Hapus akun menggunakan token (200).

### [USER-POST-AVATAR] POST /api/v1/users/account/profile/avatar : Upload Avatar
- **Sumber**: `upload-add-profile-img.ts`
- **Akses**: Semua Login
- **Body (`multipart/form-data`)**: `image` (file, max 500KB)
- **Respons Sukses**: 200 (`UPDATE_USER_SUCCESS`)
- **Skenario Uji**:
  - `USER-24`: [DESTRUKTIF] (Sukses) Upload avatar 100KB (200).

### [USER-GET-AVATAR] GET /api/v1/users/account/profile/avatar/:filename : Get Avatar
- **Sumber**: `get-user-photo.ts`
- **Akses**: Semua Login
- **Skenario Uji**:
  - `USER-25`: (Sukses) Ambil foto (200).

### [USER-GET-CONTACT] GET /api/v1/users/account/contact-info : Get Admin Contact
- **Sumber**: `get-admin-contact.ts`
- **Akses**: Semua Login
- **Skenario Uji**:
  - `USER-26`: (Sukses) Ambil kontak admin (200).
