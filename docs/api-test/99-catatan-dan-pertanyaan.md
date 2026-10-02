# Catatan, Temuan, dan Pertanyaan untuk Pengembang

File ini **TIDAK** untuk diberikan ke Postman AI. File ini adalah laporan untuk manusia (pengembang/System Analyst) terkait temuan selama inventarisasi API.

### 1. Hal yang Perlu Dikonfirmasi (Ambiguitas di Kode)
- **[AUTH-POST-REFRESH]**: Endpoint `POST /api/v1/auth/refresh` diletakkan di belakang middleware `checkAccessToken`. Lazimnya, refresh token endpoint tidak meminta Access Token (yang biasanya sudah kedaluwarsa) untuk me-refresh. Jika access token sudah kedaluwarsa, permintaan ke rute ini akan ditolak 401 oleh middleware `checkAccessToken` sebelum sempat masuk ke handler `refreshToken`. **Rekomendasi**: Ubah middleware di rute ini atau pastikan frontend memanggil refresh TEPAT SEBELUM access token mati (bukan setelah mati).
- **[TSC-POST-WD-VERIFY]**: Endpoint `POST /api/v1/transaction/verify-withdrawal/admin` (di `tsc-routes.ts:28`) hanya memakai rute handler `verifty_wd`, dan TIDAK ada argumen middleware `adminOnly` layaknya rute GET-nya di baris ke-27. Meskipun path-nya berbunyi `/admin`, tanpa guard khusus, Warga yang login kemungkinan besar dapat memanggil POST ini.
- **[UPD-GET-JADWAL]**: Endpoint `/updates/get-jadwal` di set `adminOnly`. Warga biasa tidak bisa melihat kapan bank sampah buka. Apakah ini *intended*?
- **[USER-PATCH-BLOCK]**: Fitur Unblock dan Block mereturn kode dengan format `sendAuthResponse` (Mis. `ERR_UNAUTHORIZED`), bukan log standar Profile, padahal ini ada di modul User. Hal ini tidak fatal tapi memunculkan inkonsistensi struktur log di klien.

### 2. Temuan Bug & Inkonsistensi Tersembunyi
- Payload Demote mem-passing body error dengan `ID tidak valid` ketika input dari route adalah `req.param('id_user')`. Ini tidak masalah, cuma struktur error code nya memakai standar yang berbeda dengan profil (menggunakan `VALIDATION_ERROR` seperti di Announcements, bukan `REQUEST_INVALID`).
- Endpoint Upload Photo (Catalog, Edukasi, Profile) me-return URL/nama file.

### 3. Matriks Keputusan Tes Otomatis
1. Apakah tes harus dijalankan di environment terisolasi? **Ya**. Karena beberapa skenario berlabel `[DESTRUKTIF]` akan mendelete data atau mengganti role.
2. Endpoint Logout tidak boleh dites di tengah jalan, wajib di `Cleanup`.
3. Skenario Lockout (bruteforce) harus dijaga ketat agar akun Admin/Super Admin tidak terblokir sungguhan saat testing berjalan.
