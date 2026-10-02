# Overview API Test: Proyek Bastura

Tujuan dari dokumen ini adalah untuk menyediakan referensi yang lengkap bagi pembuatan koleksi Postman, skrip pengujian (test scripts), dan alur pengujian otomatis (automated testing) pada API backend Bastura. Dokumen ini harus digunakan oleh Postman AI untuk membuat struktur folder, environment variables, dan skenario pengujian secara otomatis tanpa menulis *hardcode* token atau data rahasia.

## Tabel Variabel Environment
| Nama Variabel | Deskripsi | Contoh Nilai | Rahasia | Diisi Oleh |
| --- | --- | --- | --- | --- |
| `base_url` | Base URL server API | `https://enbee.tailf714eb.ts.net` | Tidak | Manual (Setup awal) |
| `user_email` | Email untuk akun testing Warga (role 1) | `testuser@example.com` | Tidak | Manual |
| `user_password` | Password akun testing Warga | `password123` | Ya | Manual |
| `admin_email` | Email untuk akun testing Admin (role 2) | `admin@example.com` | Tidak | Manual |
| `admin_password` | Password akun testing Admin | `admin123` | Ya | Manual |
| `superadmin_email` | Email akun testing Super Admin (role 3) | `superbastura@example.com` | Tidak | Manual |
| `superadmin_password` | Password akun testing Super Admin | `basturadmin123` | Ya | Manual |
| `user_token` | JWT Token dari hasil login Warga | `eyJhbG...` | Ya | Otomatis (Postman Script) |
| `admin_token` | JWT Token dari hasil login Admin | `eyJhbG...` | Ya | Otomatis (Postman Script) |
| `superadmin_token` | JWT Token dari hasil login Super Admin | `eyJhbG...` | Ya | Otomatis (Postman Script) |
| `refresh_token` | Token untuk endpoint refresh | `eyJhbG...` | Ya | Otomatis (Postman Script) |
| `target_user_id` | ID UUID Warga yang dibuat saat test | `00000000-0000-0000-0000-000000000000` | Tidak | Otomatis/Manual |
| `announcement_id` | ID Pengumuman untuk testing | `UUID-DUMMY` | Tidak | Otomatis (Postman Script) |
| `education_id` | ID Konten Edukasi untuk testing | `UUID-DUMMY` | Tidak | Otomatis (Postman Script) |
| `waste_catalog_id`| ID Katalog Sampah untuk testing | `10000000-0000-0000-0000-000000000001` | Tidak | Manual/Otomatis |

## Alur Autentikasi
1. Eksekusi endpoint `POST /api/v1/auth/login` menggunakan kredensial (email dan password) dari masing-masing role (Warga, Admin, Super Admin).
2. Dari respons sukses login, ambil nilai *access token* dan *refresh token*.
3. Simpan ke variabel environment yang relevan (misal `user_token`, `admin_token`).
4. Pada request yang membutuhkan autentikasi, gunakan header: `Authorization: Bearer {{nama_variabel_token}}`.
5. Masa berlaku token akses adalah 15 menit. Jika memungkinkan, simulasikan kedaluwarsa, jika tidak uji kedaluwarsa dilakukan manual.

## Format Respons Global

**Respons Sukses (200, 201)**
```json
{
  "code": "KODE_SUKSES",
  "status": "success",
  "action": "nama_aksi",
  "title": "Pesan singkat",
  "message": "Pesan panjang",
  "data": { ... }
}
```

**Respons Error (400, 401, 403, 404, 409, 413, 415, 500)**
```json
{
  "code": "KODE_ERROR",
  "status": "error",
  "action": "nama_aksi",
  "title": "Pesan singkat",
  "message": "Pesan error spesifik",
  "data": null
}
```

## Aturan Keamanan Data Test
- Server (`https://enbee.tailf714eb.ts.net`) mungkin berisi data nyata. Gunakan SELALU akun test.
- Buat entitas baru dengan prefix `[TEST]` pada skenario yang membuat data (mis. Nama: `[TEST] Pengumuman`).
- Untuk skenario berlabel `[DESTRUKTIF]` (Hapus, Promote, Demote, Blokir), HANYA targetkan data atau user yang baru saja dibuat oleh API test, jangan merubah data nyata.
- Skenario berlabel `[RAWAN-LOCKOUT]` seperti spam percobaan salah login harus dijalankan di urutan paling akhir atau dinonaktifkan di automated CI test.
- Gunakan folder `Cleanup` pada koleksi untuk membersihkan sampah test (menghapus data test).

## Urutan Folder Collection yang Disarankan
1. **Setup**: Berisi proses Login untuk 3 role dan pendaftaran (`signup`) user dummy untuk bahan percobaan.
2. **Auth Module**: Fitur reset/forgot password dan refresh token.
3. **Users Module**: Operasi kelola pengguna, blokir, promote/demote (Ketergantungan: Setup).
4. **Waste Catalog**: Manajemen jenis dan kategori sampah (Ketergantungan: Setup).
5. **Transactions**: Setoran, penarikan, approval (Ketergantungan: Setup, Waste Catalog).
6. **Splitbills**: Distribusi fee (Ketergantungan: Setup, Transactions).
7. **Announcements**: Pengumuman (Ketergantungan: Setup).
8. **Education**: Edukasi (Ketergantungan: Setup).
9. **Updates**: Jadwal operasional (Ketergantungan: Setup).
10. **Cleanup**: Menghapus atau membersihkan data yang dibuat selama fase pengujian (Hapus user dummy, hapus katalog dummy).

## Matriks Akses Semua Endpoint
*(Tanda `v` berarti dapat diakses/sukses (2xx), Tanda `x` berarti ditolak (401/403))*

| Endpoint | Tanpa Token | User | Admin | Super Admin |
| --- | --- | --- | --- | --- |
| `/auth/login`, `signup`, `forgot`, `reset` | v | v | v | v |
| `/auth/logout`, `refresh` | x | v | v | v |
| `/users/account/profile` (Semua) | x | v | v | v |
| `/users/account/warga` (GET) | x | x | v | v |
| `/users/account/warga/block`, `unblock` | x | x | v | v |
| `/users/account/warga/promote`, `demote` | x | x | x | v |
| `/announcements` (GET) | x | v | v | v |
| `/announcements` (POST, PATCH, DELETE) | x | x | v | v |
| `/education` (GET) | x | v | v | v |
| `/education/admin/*` (POST, PATCH, DELETE) | x | x | v | v |
| `/waste/catalog` (GET) | x | v | v | v |
| `/waste/admin/*` (POST, PATCH, DELETE) | x | x | v | v |
| `/transaction/balance`, `transaction-log`, `withdrawal*` | x | v | x | x |
| `/transaction/*admin*` | x | x | v | v |
| `/splitbills/*` | x | x | v | v |
| `/updates` (GET) | x | v | v | v |
| `/updates/insert-jadwal`, `get-jadwal` | x | x | v | v |

## Snippet Bersama Postman
Gunakan skrip di tab **Tests** untuk mengotomatisasi pengecekan struktur umum (ditambahkan pada level folder atau root collection):
```javascript
// Cek status HTTP
pm.test("Status code is correct", function () {
    pm.expect(pm.response.code).to.be.oneOf([200, 201, 400, 401, 403, 404, 409, 413, 415, 500]);
});

// Cek body format sukses
if (pm.response.code === 200 || pm.response.code === 201) {
    pm.test("Sukses respons format standar", function () {
        var jsonData = pm.response.json();
        pm.expect(jsonData.status).to.eql("success");
        pm.expect(jsonData).to.have.property("code");
        pm.expect(jsonData).to.have.property("data");
    });
}
```

## Daftar Dokumen Modul
- `01-auth.md`: Endpoint seputar autentikasi.
- `02-users.md`: Profil, list warga, block/unblock, promote/demote.
- `03-announcements.md`: Kelola pengumuman.
- `04-education.md`: Kelola artikel edukasi.
- `05-waste-catalog.md`: Kelola harga dan kategori sampah.
- `06-transactions.md`: Tarik tunai, saldo, riwayat transaksi.
- `07-splitbills.md`: Proses alokasi splitbills.
- `08-updates.md`: Jadwal setoran.
