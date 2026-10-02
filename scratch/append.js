
const fs = require("fs");

const appendAuth = `
### [AUTH-POST-FORGOT] POST /api/v1/auth/forgot-password : Lupa Password
- **Sumber**: \`src/routes/auth-routes.ts\`, \`forgotpass.ts\`
- **Akses**: Publik
- **Deskripsi**: Mengirimkan email OTP untuk mereset password.
- **Urutan pengecekan di server**: Validasi Email -> Kirim via Resend -> Simpan OTP (PERLU DIKONFIRMASI: Penyimpanan OTP via API eksternal?).
- **Headers**: \`Content-Type: application/json\`
- **Body JSON**: \`email\` (string, wajib)
- **Respons Sukses**: 200 (OTP Terkirim)
- **Respons Error**: 400 (\`VALIDATION_ERROR\`)
- **Efek Samping**: Mengirim email OTP melalui layanan Resend.
- **Skenario Uji**:
  - \`AUTH-17\`: (Validasi) Email kosong (400).
  - \`AUTH-18\`: (Validasi) Mengirim ke email yang tidak terdaftar (404/400).

### [AUTH-POST-RESET] POST /api/v1/auth/reset-password : Reset Password
- **Sumber**: \`src/routes/auth-routes.ts\`, \`resetpass.ts\`
- **Akses**: Publik
- **Deskripsi**: Mereset password menggunakan kode OTP.
- **Headers**: \`Content-Type: application/json\`
- **Body JSON**: \`email\`, \`otp\`, \`new_password\`, \`confirm_password\`.
- **Respons Sukses**: 200 (\`PASSWORD_RESET_SUCCESS\`)
- **Respons Error**: 400 (\`DATA_INCOMPLETE\`, \`OTP_EXPIRED\`, \`KODE_OTP_INCORRECT\`)
- **Skenario Uji**:
  - \`AUTH-19\`: (Validasi) Kode OTP sembarangan (400 \`KODE_OTP_INCORRECT\`).
`;
fs.appendFileSync("./docs/api-test/01-auth.md", appendAuth);

const appendUsers = `
### [USER-PATCH-DEACTIVE] PATCH /api/v1/users/account/profile/deactive : Hapus Akun Sendiri
- **Sumber**: \`delete-user.ts\`
- **Akses**: Semua Login
- **Deskripsi**: Menonaktifkan akun sendiri.
- **Respons Sukses**: 200 (\`DELETE_USER_SUCCESS\`)
- **Respons Error**: 401 (\`TOKEN_INVALID\`), 404 (\`USER_NOT_FOUND\`)
- **Skenario Uji**:
  - \`USER-23\`: [DESTRUKTIF] (Sukses) Hapus akun menggunakan token (200).

### [USER-POST-AVATAR] POST /api/v1/users/account/profile/avatar : Upload Avatar
- **Sumber**: \`upload-add-profile-img.ts\`
- **Akses**: Semua Login
- **Body (`multipart/form-data`)**: \`image\` (file, max 500KB)
- **Respons Sukses**: 200 (\`UPDATE_USER_SUCCESS\`)
- **Respons Error**: 400 (\`INVALID_FILE_TYPE\`, \`INVALID_FILE_SIZE\`)
- **Skenario Uji**:
  - \`USER-24\`: [DESTRUKTIF] (Sukses) Upload avatar 100KB (200).

### [USER-GET-AVATAR] GET /api/v1/users/account/profile/avatar/:filename : Get Avatar
- **Sumber**: \`get-user-photo.ts\`
- **Akses**: Semua Login
- **Skenario Uji**:
  - \`USER-25\`: (Sukses) Ambil foto (200).

### [USER-GET-CONTACT] GET /api/v1/users/account/contact-info : Get Admin Contact
- **Sumber**: \`get-admin-contact.ts\`
- **Akses**: Semua Login
- **Skenario Uji**:
  - \`USER-26\`: (Sukses) Ambil kontak admin (200).
`;
fs.appendFileSync("./docs/api-test/02-users.md", appendUsers);

const appendAnc = `
### [ANC-GET-BY-ID] GET /api/v1/announcements/:id : Lihat Detail Pengumuman
- **Sumber**: \`getAncByIdController\`
- **Akses**: Semua Login
- **Path Params**: \`id\` (UUID)
- **Respons Sukses**: 200 (\`ANC_FOUND\`)
- **Skenario Uji**:
  - \`ANC-14\`: (Sukses) Lihat detail pengumuman spesifik (200).

### [ANC-GET-PHOTO] GET /api/v1/announcements/photo/:filename : Lihat Foto Pengumuman
- **Sumber**: \`getAncPhotoController\`
- **Akses**: Semua Login
- **Path Params**: \`filename\`
- **Skenario Uji**:
  - \`ANC-15\`: (Sukses) Buka foto dummy1.png (200).
`;
fs.appendFileSync("./docs/api-test/03-announcements.md", appendAnc);

const appendEdu = `
### [EDU-GET-ADMIN] GET /api/v1/education/admin/education : List Edukasi (Admin)
- **Sumber**: \`getAdminEduController\`
- **Akses**: Khusus Admin
- **Skenario Uji**:
  - \`EDU-12\`: (Sukses) Get list edukasi di admin (200).

### [EDU-GET-PHOTO] GET /api/v1/education/photo/:filename : Lihat Foto Edukasi
- **Sumber**: \`getEduPhotoController\`
- **Akses**: Semua Login
- **Skenario Uji**:
  - \`EDU-13\`: (Sukses) Lihat file edukasi (200).
`;
fs.appendFileSync("./docs/api-test/04-education.md", appendEdu);

const appendCat = `
### [CAT-GET-PHOTO] GET /api/v1/waste/catalog/photo/:filename : Lihat Foto Katalog
- **Sumber**: \`getCatalogPhotoController\`
- **Akses**: Semua Login
- **Skenario Uji**:
  - \`CAT-12\`: (Sukses) Lihat foto katalog (200).
`;
fs.appendFileSync("./docs/api-test/05-waste-catalog.md", appendCat);

const appendTsc = `
### [TSC-POST-USER-LOG] POST /api/v1/transaction/transaction-logs/admin/user : Histori Log User (Admin)
- **Sumber**: \`getTransactionLogsUserController\`
- **Akses**: Admin
- **Body JSON**: \`user_id\`
- **Respons Sukses**: 200
- **Skenario Uji**:
  - \`TSC-13\`: (Sukses) Ambil log milik user_id spesifik (200).
`;
fs.appendFileSync("./docs/api-test/06-transactions.md", appendTsc);

console.log("Appended missing endpoints.");

