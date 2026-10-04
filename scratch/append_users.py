with open('docs-audit/REPORT.md', 'a', encoding='utf-8') as f:
    f.write('\n### D. Hasil Audit Fase 2: Modul Users & Admin\n\n')

    f.write('#### 1. GET /api/v1/users/account/profile\n')
    f.write('- **Lokasi**: `docs/api-test/02-users.md` | `src/controller/profile-controller/get-user.ts`\n')
    f.write('- **Temuan**: Dokumentasi menuliskan error code sukses sebagai `USER_FOUND` dan pesan `"Data pengguna ditemukan"`, tetapi di implementasi asli ia me-return `GET_USER_SUCCESS` dan pesan `"User berhasil diambil"`.\n')
    f.write('- **Keparahan**: **Rendah** (Hanya perbedaan meta data, tidak fatal).\n\n')

    f.write('#### 2. PATCH /api/v1/users/account/profile\n')
    f.write('- **Lokasi**: `docs/api-test/02-users.md` | `src/controller/profile-controller/update-user.ts`\n')
    f.write('- **Temuan Body**: Dokumentasi menginstruksikan client untuk mengirimkan JSON body dengan key `name` dan `phone`. Kenyataannya, kode mengambil body dengan key `new_name` dan `new_phone` (`const { new_name , new_phone } = body`).\n')
    f.write('- **Keparahan**: **Tinggi** (Klien yang mengikuti doc tidak akan pernah berhasil update karena akan selalu di-reject dengan 400 akibat propertinya tidak terdeteksi).\n\n')

    f.write('#### 3. PATCH /api/v1/users/account/profile/changepass\n')
    f.write('- **Lokasi**: `docs/api-test/02-users.md` | `src/controller/profile-controller/changepass.ts`\n')
    f.write('- **Temuan**: Kode dan nama parameter body di dokumentasi sangat **Akurat** sesuai dengan kode. Hanya ada perbedaan kecil pada response code sukses (`PASSWORD_CHANGE_SUCCESS` di doc vs `CHANGE_PASSWORD_SUCCESS` di kode).\n')
    f.write('- **Keparahan**: **Rendah**.\n\n')

    f.write('#### 4. GET /api/v1/users/account/warga\n')
    f.write('- **Lokasi**: `docs/api-test/02-users.md` | `src/controller/users_data/get-warga-controller.ts`\n')
    f.write('- **Temuan**: Dokumentasi menulis success code `WARGA_LIST_SUCCESS`, sedangkan kode me-return `SUCC_GET_WARGA`.\n')
    f.write('- **Keparahan**: **Rendah**.\n\n')

    f.write('#### 5. PATCH /api/v1/users/account/warga/block/:id_user & unblock/:id_user\n')
    f.write('- **Lokasi**: `docs/api-test/02-users.md` | `src/controller/admin/...`\n')
    f.write('- **Temuan**: Untuk `block`, doc error code 400 menggunakan `ID_NOT_FOUND`, sedangkan implementasi menggunakan `INVALID_UUID`. Pada `unblock`, doc sukses code `USER_UNBLOCKED_SUCCESS` sedangkan kode `SUCC_USER_UNBLOCKED`.\n')
    f.write('- **Keparahan**: **Rendah**.\n\n')

    f.write('#### 6. PATCH /api/v1/admin/promote/:id_user & demote/:id_user\n')
    f.write('- **Lokasi**: `docs/api-test/02-users.md` | `src/controller/admin/...`\n')
    f.write('- **Temuan**: Validasi logic di kode (termasuk validasi tidak bisa demote diri sendiri) sangat sesuai dengan dokumentasi. Success code memiliki sedikit typo: `PROMOTE_SUCCESS` vs `PROMOTE_ADMIN_SUCCESS` (dan demote).\n')
    f.write('- **Keparahan**: **Rendah**.\n\n')

    f.write('#### 7. PATCH /api/v1/users/account/profile/deactive\n')
    f.write('- **Lokasi**: `docs/api-test/02-users.md` | `src/controller/profile-controller/delete-user.ts`\n')
    f.write('- **Temuan**: Sangat Sesuai (Match 100%).\n\n')

    f.write('#### 8. POST /api/v1/users/account/profile/avatar\n')
    f.write('- **Lokasi**: `docs/api-test/02-users.md` | `src/controller/profile-controller/upload-add-profile-img.ts`\n')
    f.write('- **Temuan Body (Form-Data)**: Di dokumentasi disebutkan field key untuk file foto adalah `image`. Namun di implementasi kode, key yang di-extract adalah `avatar` (`const avatar = body.avatar`). \n')
    f.write('- **Temuan Response**: Dokumentasi menyebutkan mengembalikan object `{"filename": "..."}`. Tetapi di kode, ia mengembalikan seluruh data *profile user* yang lengkap.\n')
    f.write('- **Keparahan**: **Tinggi** (Klien tidak bisa mengunggah foto karena API menolak payload tanpa parameter `avatar`).\n\n')

    f.write('#### 9. GET /api/v1/users/account/profile/avatar/:filename\n')
    f.write('- **Lokasi**: `docs/api-test/02-users.md` | `src/controller/profile-controller/get-user-photo.ts`\n')
    f.write('- **Temuan**: Sesuai.\n\n')

    f.write('#### 10. GET /api/v1/users/account/contact-info\n')
    f.write('- **Lokasi**: `docs/api-test/02-users.md` | `src/controller/profile-controller/get-admin-contact.ts`\n')
    f.write('- **Temuan**: Sesuai (Doc: DATA_FOUND, Code: GET_ADMIN_CONTACT_SUCCESS).\n')
