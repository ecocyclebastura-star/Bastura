# Dokumen Uji API: Modul Pengguna (Users / Profile)

## Konteks Bersama Modul Users
- **Base URL**: `{{base_url}}` (contoh: `http://localhost:3000`)
- **Header Auth**: `Authorization: Bearer {{token_variabel}}`
- **Tipe Konten**: Sebagian besar menggunakan `application/json`, kecuali upload avatar menggunakan `multipart/form-data`.
- Pengaturan blokir, promote, demote hanya bisa dilakukan oleh **Super Admin** (promote/demote) atau **Admin** (block/unblock).

---

## 1. [USER-GET-PROFILE] Lihat Profil Sendiri
- **Method**: `GET`
- **Endpoint**: `/api/v1/users/account/profile`
- **Akses**: Semua Pengguna Login (Warga, Admin, Super Admin)

**Contoh Response Sukses (200 OK):**
```json
{
  "status": "success",
  "message": "Data pengguna ditemukan",
  "code": "USER_FOUND",
  "data": {
    "id_users": "20000000-0000-0000-0000-000000000001",
    "name": "Budi Warga",
    "email": "warga1@example.com",
    "phone": "0811111111",
    "role_id": 1,
    "status_active": "active",
    "profile_img": null,
    "balance": 0
  }
}
```

**Tabel Response Error:**
| HTTP Status | Error Code | Kondisi / Penjelasan |
|---|---|---|
| 401 | `UNAUTHORIZED` | Token tidak dikirim, rusak, atau kedaluwarsa. |
| 404 | `USER_NOT_FOUND` | User sudah terhapus di database namun token masih valid. |

---

## 2. [USER-PATCH-PROFILE] Update Profil (Nama / Telepon)
- **Method**: `PATCH`
- **Endpoint**: `/api/v1/users/account/profile`
- **Akses**: Semua Pengguna Login

**Panduan Postman (tab Body -> raw -> JSON):**
```json
{
  "name": "Budi Warga Baru",
  "phone": "0899999999"
}
```
*(Catatan: Tidak bisa update `email` atau `password` lewat endpoint ini)*

**Contoh Response Sukses (200 OK):**
```json
{
  "status": "success",
  "message": "Profil berhasil diupdate",
  "code": "UPDATE_PROFILE_SUCCESS"
}
```

**Tabel Response Error:**
| HTTP Status | Error Code | Kondisi / Penjelasan |
|---|---|---|
| 400 | `REQUEST_INVALID` | Body format salah atau mengirim tipe data yang tidak sesuai. |

---

## 3. [USER-PATCH-CHANGEPASS] Ubah Kata Sandi
- **Method**: `PATCH`
- **Endpoint**: `/api/v1/users/account/profile/changepass`
- **Akses**: Semua Pengguna Login

**Panduan Postman (tab Body -> raw -> JSON):**
```json
{
  "old_password": "password123",
  "new_password": "PasswordBaru123!",
  "conf_password": "PasswordBaru123!"
}
```

**Contoh Response Sukses (200 OK):**
```json
{
  "status": "success",
  "message": "Kata sandi berhasil diubah",
  "code": "PASSWORD_CHANGE_SUCCESS"
}
```

**Tabel Response Error:**
| HTTP Status | Error Code | Kondisi / Penjelasan |
|---|---|---|
| 400 | `MISSING_FIELDS` | Ada parameter yang belum diisi. |
| 400 | `PASSWORD_MISMATCH` | Password baru dan konfirmasi password tidak sama. |
| 400 | `SAME_PASSWORD` | Password baru sama dengan password yang lama. |
| 401 | `INVALID_OLD_PASSWORD` | Password lama yang dimasukkan salah. |

---

## 4. [USER-GET-WARGA] Lihat Daftar Seluruh Warga
- **Method**: `GET`
- **Endpoint**: `/api/v1/users/account/warga`
- **Akses**: Khusus **Admin** & **Super Admin**

**Contoh Response Sukses (200 OK):**
```json
{
  "status": "success",
  "message": "Daftar warga berhasil diambil",
  "code": "WARGA_LIST_SUCCESS",
  "data": [
    {
      "id_users": "20000000-0000-0000-0000-000000000001",
      "name": "Budi Warga",
      "email": "warga1@example.com",
      "status_active": "active",
      "total_balance": 15000,
      "total_weight": 5
    }
  ]
}
```

**Tabel Response Error:**
| HTTP Status | Error Code | Kondisi / Penjelasan |
|---|---|---|
| 403 | `FORBIDDEN` | Warga biasa dilarang mengakses endpoint ini. |

---

## 5. [USER-PATCH-BLOCK] Blokir Warga
- **Method**: `PATCH`
- **Endpoint**: `/api/v1/users/account/warga/block/:id_user`
- **Akses**: Khusus **Admin** & **Super Admin**

**Contoh Response Sukses (200 OK):**
```json
{
  "status": "success",
  "message": "Pengguna berhasil diblokir",
  "code": "USER_BLOCKED_SUCCESS"
}
```

**Tabel Response Error:**
| HTTP Status | Error Code | Kondisi / Penjelasan |
|---|---|---|
| 400 | `ID_NOT_FOUND` | Format UUID salah atau id tidak dikirim. |
| 403 | `ACCESS_DENIED_UR_NOT_ADMIN` | Dijalankan oleh role Warga. |
| 404 | `USER_NOT_FOUND` | ID Pengguna yang ingin diblokir tidak ada. |

---

## 6. [USER-PATCH-UNBLOCK] Buka Blokir Warga
- **Method**: `PATCH`
- **Endpoint**: `/api/v1/users/account/warga/unblock/:id_user`
- **Akses**: Khusus **Admin** & **Super Admin**

**Contoh Response Sukses (200 OK):**
```json
{
  "status": "success",
  "message": "Blokir pengguna berhasil dibuka",
  "code": "USER_UNBLOCKED_SUCCESS"
}
```

---

## 7. [USER-PATCH-PROMOTE] Jadikan Admin (Promote)
- **Method**: `PATCH`
- **Endpoint**: `/api/v1/users/account/warga/promote/:id_user`
- **Akses**: Khusus **Super Admin**

**Contoh Response Sukses (200 OK):**
```json
{
  "status": "success",
  "message": "Pengguna berhasil di-promote menjadi Admin",
  "code": "PROMOTE_SUCCESS"
}
```

**Tabel Response Error:**
| HTTP Status | Error Code | Kondisi / Penjelasan |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Format ID bukan UUID. |
| 403 | `FORBIDDEN` | Endpoint ini dijalankan oleh Admin atau Warga (Hanya Super Admin yang bisa). |
| 409 | `CONFLICT_ROLE` | Pengguna tersebut sudah menjadi Admin. |
| 409 | `USER_BLOCKED` | Pengguna berstatus diblokir, tidak bisa di-promote. |

---

## 8. [USER-PATCH-DEMOTE] Cabut Admin (Demote)
- **Method**: `PATCH`
- **Endpoint**: `/api/v1/users/account/warga/demote/:id_user`
- **Akses**: Khusus **Super Admin**

**Contoh Response Sukses (200 OK):**
```json
{
  "status": "success",
  "message": "Pengguna berhasil di-demote menjadi Warga",
  "code": "DEMOTE_SUCCESS"
}
```

**Tabel Response Error:**
| HTTP Status | Error Code | Kondisi / Penjelasan |
|---|---|---|
| 403 | `FORBIDDEN_SELF_DEMOTE` | Super Admin mencoba men-demote akunnya sendiri. |
| 409 | `CONFLICT_ROLE` | Pengguna tersebut sudah memiliki role Warga (bukan Admin). |

---

## 9. [USER-PATCH-DEACTIVE] Nonaktifkan Akun Sendiri
- **Method**: `PATCH`
- **Endpoint**: `/api/v1/users/account/profile/deactive`
- **Akses**: Semua Pengguna Login

**Contoh Response Sukses (200 OK):**
```json
{
  "status": "success",
  "message": "Akun berhasil dinonaktifkan",
  "code": "DELETE_USER_SUCCESS"
}
```

---

## 10. [USER-POST-AVATAR] Upload Foto Profil
- **Method**: `POST`
- **Endpoint**: `/api/v1/users/account/profile/avatar`
- **Akses**: Semua Pengguna Login
- **Content-Type**: `multipart/form-data`

**Panduan Postman (tab Body -> form-data):**
| Key | Type | Value |
|---|---|---|
| `image` | File | *(Pilih file gambar, Max 500KB)* |

**Contoh Response Sukses (200 OK):**
```json
{
  "status": "success",
  "message": "Foto profil berhasil diupload",
  "code": "UPDATE_USER_SUCCESS",
  "data": {
    "filename": "photo_1690000000.png"
  }
}
```

---

## 11. [USER-GET-AVATAR] Lihat Foto Profil (File Stream)
- **Method**: `GET`
- **Endpoint**: `/api/v1/users/account/profile/avatar/:filename`
- **Akses**: Semua Pengguna Login

**Contoh Response Sukses (200 OK):**
*(Menampilkan gambar secara langsung / binari)*

---

## 12. [USER-GET-CONTACT] Lihat Kontak Admin
- **Method**: `GET`
- **Endpoint**: `/api/v1/users/account/contact-info`
- **Akses**: Semua Pengguna Login

**Contoh Response Sukses (200 OK):**
```json
{
  "status": "success",
  "message": "Data kontak admin ditemukan",
  "code": "DATA_FOUND",
  "data": {
    "phone": "08123456789",
    "email": "admin@bastura.id",
    "whatsapp": "628123456789"
  }
}
```
