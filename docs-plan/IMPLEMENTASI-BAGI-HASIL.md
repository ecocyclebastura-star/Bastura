# Rencana Implementasi Bagi Hasil per Deposit (Fitur Splitbills)

**Ringkasan:**  
Saat ini, proses konfirmasi splitbills hanya merekam total alokasi per warga tanpa memecahnya per setoran (deposit). Akibatnya, nilai uang setiap deposit tetap kosong (`NULL`), dan "Riwayat Setoran" di aplikasi hanya menampilkan nol/kosong. Tujuan fitur ini adalah membagi dana bersih (final_amount warga) secara proporsional ke semua setoran milik warga tersebut dalam periode yang bersangkutan menggunakan metode proporsi nilai terbesar (*largest remainder method*) untuk memastikan jumlah persis tanpa pembulatan yang hilang.

**Batasan:**
- Jangan mengubah modul komisi dan snapshot fee.
- Operasi database harus dalam satu transaksi ACID.
- Menggunakan `BIGINT` untuk semua perhitungan nilai uang demi keamanan.

---

### 1. Temuan Celah saat Ini (Fase Investigasi)
Berdasarkan pembacaan kode terkini, ditemukan celah-celah berikut:
- **Deposit non-alokasi ikut sukses**: Pada `confirm-splitbills.ts:131`, query memperbarui semua deposit yang statusnya 'processed' pada periode tersebut menjadi 'success', tanpa melihat daftar `id_user` yang ada di alokasi. Ini membuat warga yang sengaja di-drop dari alokasi tidak mendapat bayaran tapi depositnya ditutup.
- **Validasi baris balance**: Update tabel `balance` (`confirm-splitbills.ts:150`) dilakukan tanpa memeriksa jumlah baris terpengaruh (`row_count`). Jika warga tak punya saldo awal, update akan diabaikan tanpa error (uang hilang).
- **Konfirmasi Ganda cacat**: `confirm-splitbills.ts` baris 138 me-return `'DEPOSIT_NOT_FOUND'` **setelah** query `INSERT INTO split_bills`. Karena ini sekadar _return_ dan bukan _throw Error_, *library* postgres tidak akan melakukan *rollback*. Akibatnya, setiap klik ganda akan membuat record "hantu" di `split_bills`.

---

### 2. Perubahan Skema (`01-schema.sql` dan `04-view.sql`)
- **Tabel `deposit`**:
  - `amount_sb` diubah dari `INT` menjadi `BIGINT`.
  - Tambahkan `id_sb UUID REFERENCES split_bills(id_sb) ON DELETE RESTRICT`.
  - Tambahkan pengecekan: `CONSTRAINT cek_amount_sb CHECK (amount_sb IS NULL OR amount_sb >= 0)`.
- **View**: Periksa `view_riwayat_transaksi`. Casting dan tipe `nominal` pada bagian UNION harus konsisten (BIGINT).

---

### 3. Desain Algoritma (di modul terpisah: misal `bagi-deposit.ts`)
Fungsi murni untuk perhitungan:
- **Input**: `finalAmount` (integer) dan kumpulan deposit: `[{ id_deposit, created_at, weight_dp, price }]`.
- **Perhitungan**: 
  - `nilai_kontribusi = (weight_dp * 100) * price` (dihitung memakai operasi bilangan bulat, misalnya dengan BigInt agar bebas error pecahan).
  - Total `V` = jumlah semua nilai_kontribusi dari setoran milik user tersebut.
  - Untuk setiap deposit `i`, hitung alokasi proporsional: 
    - `floor_i = Math.floor((nilai_kontribusi_i * finalAmount) / V)` (menggunakan pembagian bulat BigInt).
    - `sisa_i = (nilai_kontribusi_i * finalAmount) % V`.
  - Kurangi `finalAmount` dengan jumlah `floor_i` dari semua deposit untuk mendapatkan sisa akhir `R`.
  - Urutkan deposit berdasarkan `sisa_i` terbesar. Jika seri, urutkan berdasarkan `created_at` terlama.
  - Tambahkan 1 ke `floor_i` untuk `R` deposit teratas.
  - Jika `V == 0` (semua setoran harganya nol), bagi rata, sisa berikan ke deposit paling lama.
- **Output**: Array/Map yang memetakan `id_deposit` ke `final_amount_deposit`. Verifikasi ketat bahwa total hasil == `finalAmount`. Lempar error jika meleset (yang otomatis men-*trigger* rollback).

---

### 4. Alur Baru `confirm-splitbills.ts`
1. Validasi awal (sudah ada).
2. **Kunci Deposit (FOR UPDATE)**:
   - Ambil deposit berstatus `'processed'` yang tanggalnya masuk dalam periode **hanya untuk `id_user` yang berada di dalam daftar alokasi**.
   - Sertakan harga dari `waste_catalog` (dengan `JOIN`).
   - Tolak dengan `throw new Error('NO_DEPOSIT_FOR_USER')` (untuk memicu rollback) jika ada warga di `alokasi` yang tidak memiliki deposit. Penolakan ini sekaligus melindungi dari masalah *double-click* atau *race condition*.
3. **Pembagian per Warga**:
   - Kelompokkan deposit yang ditarik per `id_user`.
   - Gunakan fungsi pembagian (poin 3) untuk memecah `final_amount` ke tiap `id_deposit`.
4. **Transaksi Database Massal**:
   - `INSERT INTO split_bills`.
   - `INSERT INTO sb_allocations`.
   - `UPDATE deposit SET amount_sb = ?, id_sb = ?, dp_status = 'success'`. Validasi *affected rows* harus sama persis dengan kandidat deposit yang dikunci.
   - `UPDATE balance`. Wajib validasi bahwa setiap perintah memperbarui tepat 1 baris, jika tidak `throw new Error('BALANCE_NOT_FOUND')`.
   - `INSERT INTO profit` (seperti saat ini).
5. Tambahkan `jumlah_deposit_dibagikan` ke `ConfirmSplitbillsResult`.

---

### 5. Rencana Log & Audit
- Tetap panggil `tsclog()` dengan `sendtscResponse`.
- Panggil `INSERT INTO audit_logs (actor_id, target_id, action_type, details)`:
  - `actor_id`: ID Admin.
  - `target_id`: ID Splitbills baru (`id_sb`).
  - `action_type`: `'CONFIRM_SPLITBILLS'`.
  - `details`: `{ "jumlah_warga": X, "jumlah_deposit": Y, "total_dana": Z }`.

---

### 6. Rencana Pengujian
1. Unit testing algoritma terbesar sisa pada 10.000 kasus acak.
2. Integrasi: Verifikasi `deposit.amount_sb` total per warga sama persis dengan `sb_allocations.final_amount` menggunakan *query* SQL yang mengembalikan 0 baris pelanggaran.
3. Tes manual /confirm ganda (harus gagal 100% dan tidak meninggalkan orphan di `split_bills`).
4. Uji tampilan riwayat: karena nilai default adalah `NULL`, riwayat deposit sebelum confirm harus dirender secara terencana (lihat bagian Keputusan).

---

### 7. File yang Akan Diubah
1. `bastura-db/init-scripts/01-schema.sql` (tabel deposit)
2. `bastura-api/src/model/splitbills/bagi-deposit.ts` (file baru)
3. `bastura-api/src/model/splitbills/confirm-splitbills.ts`
4. `bastura-api/src/controller/splitbills/confirm-splitbills-controller.ts`

---

### [PERLU KEPUTUSAN]
Mohon Anda jawab poin-poin berikut sebelum lanjut ke implementasi kode:

- [ ] **Nasib Deposit Non-Alokasi:** Jika ada warga "Andi" yang stor sampah tapi tidak dimasukkan ke daftar alokasi oleh Admin, haruskah deposit Andi tetap `'processed'` dan menunggu di splitbills bulan depan? (Sistem saat ini otomatis menjadikannya `'success'` namun Andi tidak dibayar sama sekali). Saya merencanakan agar itu DIBIARKAN `'processed'`. Apakah setuju?
- [ ] **Penambahan Warga Fiktif:** Jika Admin memasukkan warga yang tidak punya transaksi apa pun di bulan tersebut ke daftar alokasi, rancangan saya akan menolak (*rollback*) seluruh proses `/confirm` (demi keamanan sistem). Apakah setuju?
- [ ] **UI Riwayat Deposit:** Sebelum /confirm dilakukan, `amount_sb` akan bernilai `NULL`. Jika nominal masih `NULL`, bagaimana UI seharusnya menampilkannya? Apakah tampil Rp0, string kosong, atau "Menunggu Pembagian"? (Keputusan ini penting walau implementasi frontend bukan tugas kali ini, agar desain *backend* relevan).
