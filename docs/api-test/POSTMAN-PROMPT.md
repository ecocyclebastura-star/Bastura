# Prompt Siap Pakai untuk Postman AI

Salin prompt di bawah ini dan berikan ke Postman AI (Postbot) milikmu. Anda harus melakukannya bertahap.

---

### Tahap 1: Setup Workspace & Collection

**Berikan file `00-overview.md` ke Postbot, lalu berikan prompt ini:**
```text
Saya punya dokumen 00-overview.md yang mendefinisikan aturan global API Bastura. Tolong buatkan sebuah Collection Postman baru bernama "Bastura API Test".
1. Buat Environment Variables sesuai dengan "Tabel Variabel Environment" di dokumen. Jangan isi value kredensial nyata, kosongkan saja "current value"-nya, isi "initial value" dengan dummy.
2. Buat Collection-level script di tab Tests berisi Javascript `pm.test` standar yang ada di bagian "Snippet Bersama Postman".
3. Buat folder berurutan di dalam Collection: "Setup", "Auth", "Users", "Waste Catalog", "Transactions", "Splitbills", "Announcements", "Education", "Updates", dan "Cleanup".
```

---

### Tahap 2: Input Endpoint Tiap Modul (Ulangi untuk tiap file 01 sampai 08)

**Pilih salah satu file markdown modul (mis. `01-auth.md`), berikan ke Postbot, lalu berikan prompt ini:**

```text
Berdasarkan dokumen modul ini, tolong buatkan request untuk semua endpoint yang ada.
1. Masukkan request ini ke folder yang tepat di dalam collection "Bastura API Test".
2. Tambahkan test script Javascript di tab Tests untuk menyimpan token atau variabel ID spesifik dari respons API sesuai instruksi di skenario "Sukses" dokumen ini.
3. Untuk skenario Validasi atau Otorisasi yang error, jangan buat request terpisah secara harfiah jika jumlahnya terlalu banyak, namun pastikan script Tests-nya bisa me-validasi kalau request gagal sesuai dengan HTTP Code Error (400, 401, 403, dsb.) yang spesifik untuk endpoint ini.
4. Gunakan header Authorization Bearer {{nama_variabel_token}} yang sesuai dengan matriks akses role-nya.
5. Gunakan endpoint URL base {{base_url}}.
```

---

### Tahap 3: Pembersihan (Cleanup)

```text
Untuk folder "Cleanup", buatkan script yang me-loop endpoint delete (seperti DELETE pengumuman, edukasi, katalog sampah) memanggil {{announcement_id}}, {{education_id}} dan {{waste_catalog_id}} yang sebelumnya disimpan, serta menjalankan endpoint POST /api/v1/auth/logout.
```
