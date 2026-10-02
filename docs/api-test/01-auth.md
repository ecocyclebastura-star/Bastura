# Dokumen Uji API: Modul Autentikasi (Auth)

## Konteks Bersama Modul Auth
- **Base URL**: `{{base_url}}`
- **Header Auth**: `Authorization: Bearer {{token_variabel}}` (Digunakan pada /logout dan /refresh)
- **Variabel yang digunakan**: `user_email`, `user_password`, `user_token`, `refresh_token`
- Format respons sukses dan error mengikuti standar dari `00-overview.md`.
- Matriks akses: Login, Signup, Forgot, Reset dapat diakses tanpa token. Logout dan Refresh memerlukan Bearer token yang valid.

---

### [AUTH-POST-LOGIN] POST /api/v1/auth/login : Login Pengguna
- **Sumber**: `src/routes/auth-routes.ts`, `src/auth/global/login.ts`
- **Akses**: Publik
- **Deskripsi**: Autentikasi pengguna menggunakan email dan password untuk mendapatkan akses token.
- **Urutan pengecekan di server**: Validasi Body (email, password) -> Cari User di DB (Cek Aktif/Blokir) -> Validasi Password bcrypt -> Generate JWT.
- **Headers**: `Content-Type: application/json`
- **Body JSON**:
  - `email` (string, wajib): Email pengguna terdaftar.
  - `password` (string, wajib): Password pengguna.
- **Respons Sukses**:
  - `status`: 200, `code`: (Dinamic Success Code)
  - `data` field: `accessToken`, `refreshToken`, `name`, `email`, `role`, `id_users`.
- **Respons Error**:
  - 400 (`EMAIL_PASSWORD_REQUIRED`): Email dan Password harus diisi.
  - 401 (`EMAIL_NOT_FOUND`): Email belum terdaftar.
  - 401 (`EMAIL_PASSWORD_WRONG`): Email atau password salah.
  - 401 (`USER_NOT_ACTIVE`): Akun sudah tidak aktif/dihapus/diblokir.
- **Efek Samping**: Menambahkan data ke tabel `refresh_tokens`.
- **Skenario Uji**:
  - `AUTH-01`: [RAWAN-LOCKOUT] (Validasi) Body kosong (harus gagal 400).
  - `AUTH-02`: (Validasi) Password salah (harus gagal 401 `EMAIL_PASSWORD_WRONG`).
  - `AUTH-03`: (Validasi) Email tidak ada di database (harus gagal 401 `EMAIL_NOT_FOUND`).
  - `AUTH-04`: (Sukses) Login sebagai Super Admin. **(Simpan `accessToken` ke `superadmin_token`)**.
  - `AUTH-05`: (Sukses) Login sebagai Warga test. **(Simpan `accessToken` ke `user_token`, `refreshToken` ke `refresh_token`)**.
  - `AUTH-06`: (Sukses) Login sebagai Admin test. **(Simpan `accessToken` ke `admin_token`)**.

---

### [AUTH-POST-SIGNUP] POST /api/v1/auth/signup : Mendaftar Akun Baru
- **Sumber**: `src/routes/auth-routes.ts`, `src/auth/global/signup.ts`
- **Akses**: Publik
- **Deskripsi**: Mendaftarkan pengguna baru sebagai warga (role otomatis = 1).
- **Urutan pengecekan**: Validasi Body -> Validasi Format Password -> Cek Kesamaan Confirm Password -> Cek Ketersediaan Email -> Insert ke tabel `users`.
- **Headers**: `Content-Type: application/json`
- **Body JSON**:
  - `email` (string, wajib): Email valid
  - `password` (string, wajib): Minimal 8 karakter, mengandung angka.
  - `confirm_password` (string, wajib): Harus sama dengan `password`.
  - `name` (string, wajib): Nama lengkap.
  - `phone` (string, opsional): Nomor telepon.
- **Respons Sukses**: 200, mengembalikan payload registrasi.
- **Respons Error**:
  - 400 (`DATA_TYPE_INVALID`): Format tidak valid.
  - 400 (`PASSWORD_MIN_8_CHARACTER_AND_NUMBER`): Password kurang kuat.
  - 400 (`PASSWORD_MIN_8_CHARACTER`): Password terlalu pendek.
  - 400 (`PASSWORD_MISMATCH`): Kata sandi tidak cocok.
  - 409 (`EMAIL_ALREADY_REGISTERED`): Email sudah terdaftar.
- **Efek Samping**: Insert 1 baris ke `users` (role_id=1) dan inisialisasi saldo di `balance`.
- **Skenario Uji**:
  - `AUTH-07`: (Validasi) Mendaftar dengan password tanpa angka (400 `PASSWORD_MIN_8_CHARACTER_AND_NUMBER`).
  - `AUTH-08`: (Validasi) Mendaftar dengan `confirm_password` berbeda (400 `PASSWORD_MISMATCH`).
  - `AUTH-09`: (Validasi) Email sudah terdaftar sebelumnya (409 `EMAIL_ALREADY_REGISTERED`).
  - `AUTH-10`: (Sukses) Mendaftar menggunakan email dinamis `[TEST]_warga_{{timestamp}}@example.com`.

---

### [AUTH-POST-REFRESH] POST /api/v1/auth/refresh : Perbarui Token Akses
- **Sumber**: `src/routes/auth-routes.ts`, `src/auth/global/tk-refresh.ts`
- **Akses**: Membutuhkan Access Token (Bearer) lama atau Refresh Token via Body (Asumsi implementasi Hono memerlukan `checkAccessToken` middleware meskipun ini adalah endpoint refresh). *PERLU DIKONFIRMASI: Mengapa perlu checkAccessToken (access token) untuk me-refresh token?*
- **Deskripsi**: Menukar refresh token yang valid dengan access token baru.
- **Headers**: `Authorization: Bearer {{user_token}}`
- **Body JSON**: `refresh_token` (string, wajib).
- **Respons Sukses**: 200, mendapatkan token baru.
- **Respons Error**:
  - 400 (`REFRESH_TOKEN_NOT_FOUND`): Token tidak ada di DB.
  - 403 (`TOKEN_REVOKED_SECURITY_ALERT`): Aktivitas mencurigakan (Reuse detection).
  - 403 (`REFRESH_TOKEN_INVALID_OR_EXPIRED`): Expired.
  - 404 (`USER_NOT_FOUND`): User tidak ada.
- **Skenario Uji**:
  - `AUTH-11`: Tanpa token Bearer di header (401).
  - `AUTH-12`: (Sukses) Refresh token berhasil, dengan payload JSON valid.
  - `AUTH-13`: (Validasi) Payload JSON `refresh_token` sembarangan (403 `REFRESH_TOKEN_INVALID_OR_EXPIRED` atau 400).

---

### [AUTH-POST-LOGOUT] POST /api/v1/auth/logout : Keluar
- **Sumber**: `src/routes/auth-routes.ts`, `src/auth/global/logout.ts`
- **Akses**: Membutuhkan Token (Bearer)
- **Deskripsi**: Mengakhiri sesi pengguna dengan menghapus refresh token.
- **Headers**: `Authorization: Bearer {{user_token}}`
- **Body JSON**: `refresh_token` (string, wajib).
- **Respons Sukses**: 200.
- **Respons Error**: 400 (`REFRESH_TOKEN_NOT_FOUND`), 500 (`INTERNAL_SERVER_ERROR`).
- **Efek Samping**: Data terhapus dari tabel `refresh_tokens`.
- **Skenario Uji**:
  - `AUTH-14`: (Validasi) Logout dengan JWT yang sudah tidak valid (401).
  - `AUTH-15`: (Validasi) Logout tanpa mengirimkan refresh token (400).
  - `AUTH-16`: (Sukses) Logout (Harus dilakukan pada akhir eksekusi Postman / Cleanup).

---
*(Endpoint `/forgot-password` dan `/reset-password` hanya butuh pengujian Validasi Input standar (400) dan pengujian mock karena membutuhkan email OTP eksternal (Resend) yang tidak bisa otomatis pada Postman)*.

### [AUTH-POST-FORGOT] POST /api/v1/auth/forgot-password : Lupa Password
- **Sumber**: `src/routes/auth-routes.ts`, `forgotpass.ts`
- **Akses**: Publik
- **Deskripsi**: Mengirimkan email OTP untuk mereset password.
- **Urutan pengecekan di server**: Validasi Email -> Kirim via Resend -> Simpan OTP.
- **Headers**: `Content-Type: application/json`
- **Body JSON**: `email` (string, wajib)
- **Respons Sukses**: 200 (OTP Terkirim)
- **Respons Error**: 400 (`VALIDATION_ERROR`)
- **Efek Samping**: Mengirim email OTP melalui layanan Resend.
- **Skenario Uji**:
  - `AUTH-17`: (Validasi) Email kosong (400).

### [AUTH-POST-RESET] POST /api/v1/auth/reset-password : Reset Password
- **Sumber**: `src/routes/auth-routes.ts`, `resetpass.ts`
- **Akses**: Publik
- **Deskripsi**: Mereset password menggunakan kode OTP.
- **Headers**: `Content-Type: application/json`
- **Body JSON**: `email`, `otp`, `new_password`, `confirm_password`.
- **Respons Sukses**: 200 (`PASSWORD_RESET_SUCCESS`)
- **Respons Error**: 400 (`DATA_INCOMPLETE`, `OTP_EXPIRED`, `KODE_OTP_INCORRECT`)
- **Skenario Uji**:
  - `AUTH-18`: (Validasi) Kode OTP sembarangan (400 `KODE_OTP_INCORRECT`).
