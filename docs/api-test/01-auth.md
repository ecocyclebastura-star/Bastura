# Dokumen Uji API: Modul Autentikasi (Auth)

## Konteks Bersama Modul Auth
- **Base URL**: `{{base_url}}` (contoh: `http://localhost:3000`)
- **Header Auth**: `Authorization: Bearer {{token_variabel}}` (Hanya untuk `/logout` dan `/refresh`)
- **Tipe Konten**: Selalu `application/json`

---

## 1. [AUTH-POST-LOGIN] Login Pengguna
- **Method**: `POST`
- **Endpoint**: `/api/v1/auth/login`
- **Akses**: Publik

**Panduan Postman (tab Body -> raw -> JSON):**
```json
{
  "email": "warga1@example.com",
  "password": "password123"
}
```

**Contoh Response Sukses (200 OK):**
```json
{
  "status": "success",
  "message": "Login Success ",
  "code": "LOGIN_SUCCESS",
  "data": {
    "user": {
      "id": "20000000-0000-0000-0000-000000000001",
      "name": "Budi Warga",
      "email": "warga1@example.com"
    },
    "tokens": {
      "access_token": "eyJhbG...",
      "refresh_token": "eyJhbG...",
      "token_type": "Bearer",
      "expires_in": 900
    }
  }
}
```

**Tabel Response Error:**
| HTTP Status | Error Code | Kondisi / Penjelasan |
|---|---|---|
| 400 | `EMAIL_PASSWORD_REQUIRED` | Body `email` atau `password` kosong. |
| 401 | `EMAIL_NOT_FOUND` | Email belum terdaftar di database. |
| 401 | `EMAIL_PASSWORD_WRONG` | Kombinasi email dan password salah. |
| 401 | `USER_NOT_ACTIVE` | Akun pengguna sedang diblokir atau tidak aktif. |

---

## 2. [AUTH-POST-SIGNUP] Mendaftar Akun Baru
- **Method**: `POST`
- **Endpoint**: `/api/v1/auth/signup`
- **Akses**: Publik

**Panduan Postman (tab Body -> raw -> JSON):**
```json
{
  "email": "wargabaru@example.com",
  "password": "Password123",
  "confirm_password": "Password123",
  "name": "Warga Baru",
  "phone": "08123456789"
}
```

**Contoh Response Sukses (201 Created / 200 OK):**
```json
{
  "status": "success",
  "message": "User berhasil mendaftar",
  "code": "SIGNUP_SUCCESS",
  "data": {
    "data": {
      "user": {
        "id": "20000000-0000-0000-0000-000000000002",
        "name": "Warga Baru",
        "email": "wargabaru@example.com"
      },
      "tokens": {
        "access_token": "eyJhbG...",
        "refresh_token": "eyJhbG...",
        "token_type": "Bearer",
        "expires_in": 900
      }
    }
  }
}
```

**Tabel Response Error:**
| HTTP Status | Error Code | Kondisi / Penjelasan |
|---|---|---|
| 400 | `DATA_TYPE_INVALID` | Field email, password, atau confirm_password kosong. |
| 400 | `PASSWORD_MIN_8_CHARACTER_AND_NUMBER` | Password tidak mengandung angka. |
| 400 | `PASSWORD_MIN_8_CHARACTER` | Password terlalu pendek. |
| 400 | `PASSWORD_MISMATCH` | `password` dan `confirm_password` berbeda. |
| 409 | `EMAIL_ALREADY_REGISTERED` | Email yang diinput sudah digunakan akun lain. |

---

## 3. [AUTH-POST-REFRESH] Perbarui Access Token
- **Method**: `POST`
- **Endpoint**: `/api/v1/auth/refresh`
- **Akses**: Membutuhkan `Authorization: Bearer {{token_lama}}`

**Panduan Postman (tab Body -> raw -> JSON):**
```json
{
  "refresh_token": "eyJhbG..."
}
```

**Contoh Response Sukses (200 OK):**
```json
{
  "status": "success",
  "message": "Token berhasil diperbarui",
  "code": "REFRESH_SUCCESS",
  "data": {
    "access_token": "eyJhbG_baru...",
    "expires_in": 3600
  }
}
```

**Tabel Response Error:**
| HTTP Status | Error Code | Kondisi / Penjelasan |
|---|---|---|
| 400 | `REFRESH_TOKEN_NOT_FOUND` | Token tidak ditemukan di database. |
| 401 | `UNAUTHORIZED` | Header Bearer tidak valid. |
| 403 | `TOKEN_REVOKED_SECURITY_ALERT` | Indikasi kecurangan (token yang sama dipakai berulang). |
| 403 | `REFRESH_TOKEN_INVALID_OR_EXPIRED` | Masa berlaku refresh token sudah habis. |

---

## 4. [AUTH-POST-LOGOUT] Keluar (Logout)
- **Method**: `POST`
- **Endpoint**: `/api/v1/auth/logout`
- **Akses**: Membutuhkan `Authorization: Bearer {{access_token}}`

**Panduan Postman (tab Body -> raw -> JSON):**
```json
{
  "refresh_token": "eyJhbG..."
}
```

**Contoh Response Sukses (200 OK):**
```json
{
  "status": "success",
  "message": "Logout successful",
  "code": "LOGOUT_SUCCESS",
  "data": null
}
```

**Tabel Response Error:**
| HTTP Status | Error Code | Kondisi / Penjelasan |
|---|---|---|
| 400 | `REFRESH_TOKEN_NOT_FOUND` | Body request tidak mengandung `refresh_token`. |
| 401 | `UNAUTHORIZED` | Header Bearer access token tidak valid. |

---

## 5. [AUTH-POST-FORGOT] Lupa Password
- **Method**: `POST`
- **Endpoint**: `/api/v1/auth/forgot-password`
- **Akses**: Publik

**Panduan Postman (tab Body -> raw -> JSON):**
```json
{
  "email": "warga1@example.com"
}
```

**Contoh Response Sukses (200 OK):**
```json
{
  "status": "success",
  "message": "Kode OTP berhasil dikirim ke email",
  "code": "OTP_SENT",
  "data": {
    "hash": "...",
    "expiresAt": 1718000000000
  }
}
```

**Tabel Response Error:**
| HTTP Status | Error Code | Kondisi / Penjelasan |
|---|---|---|
| 400 | `EMAIL_FORMAT_INVALID` | Format email salah. |

---

## 6. [AUTH-POST-RESET] Reset Password
- **Method**: `POST`
- **Endpoint**: `/api/v1/auth/reset-password`
- **Akses**: Publik

**Panduan Postman (tab Body -> raw -> JSON):**
```json
{
  "email": "warga1@example.com",
  "otp": "123456",
  "new_password": "PasswordBaru123",
  "hash": "...",
  "expiresAt": 1718000000000
}
```

**Contoh Response Sukses (200 OK):**
```json
{
  "status": "success",
  "message": "Password berhasil diubah",
  "code": "PASSWORD_RESET_SUCCESS"
}
```

**Tabel Response Error:**
| HTTP Status | Error Code | Kondisi / Penjelasan |
|---|---|---|
| 400 | `KODE_OTP_INCORRECT` | OTP salah atau tidak sesuai. |
| 400 | `OTP_EXPIRED` | OTP sudah melewati batas waktu. |
| 400 | `PASSWORD_MISMATCH` | Password baru dan konfirmasi berbeda. |
