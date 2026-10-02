# Dokumen Uji API: Modul Updates (Jadwal & Log)

## Konteks Bersama Modul Updates
- **Base URL**: `{{base_url}}`
- **Header Auth**: `Authorization: Bearer {{token_variabel}}`
- **Variabel yang digunakan**: `admin_token`, `user_token`
- Operasi pembuatan jadwal khusus Admin, Warga hanya bisa melihat.

---

### [UPD-GET-LOG] GET /api/v1/updates : Update System Logs (Simba)
- **Sumber**: `getUpdateController`
- **Akses**: Semua Login
- **Deskripsi**: Mengambil log kapan terakhir masing-masing entitas diperbarui di tabel `update_logs`.
- **Skenario Uji**:
  - `UPD-01`: (Sukses) Ambil logs (200).
  - `UPD-02`: (Otorisasi) Tanpa token (401).

### [UPD-GET-JADWAL] GET /api/v1/updates/get-jadwal : Lihat Jadwal Setoran
- **Sumber**: `getOpeningSchController`
- **Akses**: Semua Login (Meskipun rutenya dilabeli `adminOnly` pada index, deskripsi ini akan divalidasi apakah warga bisa akses. Wait, rute `updateApp.get('/get-jadwal',adminOnly, getOpeningSchController)` mengindikasikan hanya Admin).
- **Respons Error**: 404 (`SUCC_OPENING_SCH_NOT_FOUND`) jika jadwal kosong.
- **Skenario Uji**:
  - `UPD-03`: (Otorisasi) Warga biasa coba ambil jadwal (403).
  - `UPD-04`: (Sukses) Admin cek jadwal setoran (200/404 tergantung seed).

### [UPD-POST-JADWAL] POST /api/v1/updates/insert-jadwal : Buat Jadwal Setoran
- **Sumber**: `insert_setoran_controller`
- **Akses**: Khusus Admin & Super Admin
- **Body JSON**: `setor_time` (String tanggal ISO).
- **Skenario Uji**:
  - `UPD-05`: (Otorisasi) Warga biasa (403).
  - `UPD-06`: (Validasi) Tidak ada payload `time` (400).
  - `UPD-07`: [DESTRUKTIF] (Sukses) Admin input jadwal setoran (200).
