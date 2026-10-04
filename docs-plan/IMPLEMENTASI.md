# Rencana Implementasi: Fitur Scan Sampah AI

## 1. Ringkasan Tujuan dan Batasan
- **Tujuan**: Membangun fitur di backend (API) untuk menganalisa gambar menggunakan model AI SumoPod (`qwen3.6-flash`), lalu mengembalikan estimasi jenis dan kondisi sampah berdasarkan data dari database (diurutkan berdasarkan yang paling dominan di foto).
- **Batasan**:
  - Fitur ini HANYA memberikan **PERKIRAAN JENIS DAN HARGA PER KG**.
  - Harga selalu diambil dari database server apa adanya tanpa hitungan rentang atau pembulatan.
  - Implementasi 100% backend (TypeScript/Hono). Gambar tidak disimpan di server.
  - Wajib memasang autentikasi (`checkAccessToken`), validasi upload (maks ~5MB), dan pembatasan tipe file (JPG/PNG/WEBP).

## 2. Penyimpangan dari Rencana Lama (Sesuai UPDATE Terbaru)
- **KOLOM BERAT DIBATALKAN**: Tidak ada migrasi kolom `unit_weight_gram` ke tabel `waste_catalog` dan tidak ada seeding berat barang. Data berat/satuan tidak diperlukan lagi.
- **RENTANG HARGA DIBATALKAN**: Tidak ada lagi kalkulasi `estimate_min`, `estimate_max`, rentang +- 30%, ataupun pembulatan ke Rp 50. API langsung mengirimkan `price_per_kg` dari DB apa adanya.
- **HITUNGAN TOTAL DIBATALKAN**: AI tidak diminta untuk menghitung *count* atau menebak *weight*. Total harga tidak dikirimkan. 
- **ITEM DIURUTKAN**: AI mengurutkan array item dari yang paling dominan muncul pada foto. UI klien hanya akan mengambil `items[0]`.

## 3. Desain Respons & Status API
Respons adalah JSON terstruktur. 
- **Status Respons Backend (status)**:
  - `ok`: Ada minimal satu item bernilai (harga > 0). Item Rp 0 pada foto yang sama tidak dimasukkan (di-filter backend).
  - `not_accepted`: Semua item yang dikenali berharga Rp 0 (Pesan: "Tidak diterima", price_per_kg menjadi 0).
  - `not_in_catalog`: Gambar jelas tapi tak ada yang cocok (Pesan: "sampah ini tidak bernilai jual", `items` kosong).
  - `unclear_image`: Gambar tidak jelas (Pesan: "Gambar tidak menampilkan sampah dengan jelas, mohon ulang pengambilan gambar", `items` kosong).
- **Struktur Data JSON**:
  ```json
  {
    "status": "ok",
    "message": "Analisa gambar berhasil",
    "data": {
      "items": [
        {
          "catalog_id": "...",
          "name": "Kardus",
          "condition": "Kondisi kardus terlihat sedikit basah di bagian sudut",
          "price_per_kg": 500,
          "accepted": true,
          "confidence": 0.95
        }
      ],
      "disclaimer": "Harga bersifat perkiraan dan dapat berubah. Harga akhir ditentukan admin saat penimbangan."
    }
  }
  ```

## 4. Parameter Model & Prompting
- **Katalog AI**: Katalog yang dikirim ke AI (lewat System Prompt) HANYA berisi `id`, `name`, dan `description` (catatan pembeda). Harga per kg HIDE.
- **Instruksi JSON AI**: AI diinstruksikan mereturn murni JSON dengan format: 
  `{"status":..., "items":[{"catalog_id":<id>,"condition":"<1-3 kalimat>","confidence":0-1}], "note":""}`
- **Kondisi (Condition)**: Harus bahasa Indonesia, maksimal 1-3 kalimat (~200 karakter) mengenai kondisi fisik (kotor, bersih, warna, dll). Dilarang menyebutkan harga, berat, atau uang.

## 5. [PERLU KEPUTUSAN] Untuk UI & Produk:
- **Beberapa Item Dominan**: Jika foto berisi lebih dari satu jenis sampah, backend tetap mengembalikan semua item di dalam array `items`, namun UI saat ini hanya mendukung 1 "Jenis Sampah" (`items[0]`). Harap UI Developer siap jika butuh layout multiple items di masa depan.
- **Layar Status Error (not_accepted dkk)**: Desain UI hanya menunjukkan kondisi sukses. Jika *not_accepted*, usulannya "Jenis Sampah" diisi "Tidak dikenali", "Kondisi" diisi *message*, "Estimasi Harga" diisi "Rp 0/kg" (atau "-").
- **Layar Loading**: Respons AI memakan waktu 2-30 detik (karena menggunakan reasoning tokens pada `qwen3.6-flash`). Harus dipastikan ada indikator loading dan batas timeout (misal 60 detik) di sisi Klien.
- **Teks Wrap Nama**: Nama jenis di database sangat panjang (contoh: "Botol Kotor (Masih ada tutup dan bungkus)"). UI perlu memastikan text-wrap/truncate berfungsi.

## 6. Daftar Tugas (Updated)
- [x] 1. Batalkan perubahan `unit_weight_gram` di skema DB dan Seeder (Kembalikan ke asal).
- [ ] 2. Update model `bastura-api/src/model/catalog/get-catalog-for-ai.ts` agar tidak mengambil berat.
- [ ] 3. Update instruksi prompt AI di `bastura-api/src/ai/sumopod-client.ts`.
- [ ] 4. Refactor `bastura-api/src/controller/catalog/scan-ai-controller.ts` agar mengembalikan struktur baru (tanpa min-max, tanpa unit berat, urutkan dari dominan, status `not_accepted`).
- [ ] 5. Daftarkan dan sesuaikan dokumentasi di `docs/api-test/05-waste-catalog.md`.
