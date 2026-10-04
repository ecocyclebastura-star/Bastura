# Rencana Implementasi Fitur Komisi Setoran

## 1. Ringkasan Tujuan dan Batasan
- **Tujuan**: Menambahkan fitur "Komisi Setoran" khusus SUPERADMIN untuk mengatur persentase komisi, melihat total keuntungan bulan berjalan, riwayat keuntungan bulan sebelumnya, dan detail per periode.
- **Batasan**: Hanya superadmin (dengan validasi diubah ke 403 jika akses ditolak). Nilai nominal dihitung dengan integer basis poin. Tabel akan di-reset karena masih di fase dev. Transaksi lama tidak berubah ketika persentase baru diterapkan.

## 2. Temuan Investigasi Lanjutan & Perbaikan Berdasarkan Koreksi
1. **VIEW (`04-view.sql`)**: 
   - `view_splitbills_detail` saat ini menggunakan *cross join lateral* untuk mengambil `fee` terbaru (`ORDER BY created_at DESC LIMIT 1`). Ini salah karena riwayat lama akan ikut berubah mengikuti fee yang baru.
   - **Perbaikan**: Hapus join tersebut. Ganti dengan mengambil snapshot dari `split_bills.fee_percent` dan `profit.amount_profit`. `dana_setelah_pajak` diambil dari `split_bills.total_sb - profit.amount_profit`.
   - **Pemakai View**: Belum ada endpoint di `bastura-api` yang memakai `view_splitbills_detail`. Ini view pelaporan murni.
2. **/CONFIRM Ganda**: 
   - Lewat penelusuran kode, tidak ada yang mencegah panggilan ganda `/confirm` dengan payload sama. Tiap panggil akan membuat `split_bills` baru dan saldo warga akan ganda. 
   - **Usulan Perbaikan**: Lakukan pengecekan pada kueri `UPDATE deposit ... RETURNING id_deposit`. Jika array yang dikembalikan kosong, tolak transaksi dengan 409 (karena setoran sudah tidak ada/diproses).
3. **Validasi Angka Pecahan**: 
   - `typeof number` meloloskan nilai desimal. Saat di-*insert* ke Postgres (tipe `BIGINT`), nilai tersebut menjadi gagal/dibulatkan paksa secara tak terduga.
   - **Perbaikan**: Gunakan `Number.isSafeInteger(total_dana)` pada payload `/init` dan `/confirm`.
4. **Auth 401 ke 403**:
   - Pemakai `superAdminOnly` saat ini hanya dua: `/promote/:id_user` dan `/demote/:id_user` (di `admin-routes.ts`). 
   - Mengubah 401 ke 403 sangat minim risiko bagi klien karena endpoint-endpoint tersebut memang khusus operasional superadmin.

## 3. Desain Data (Perubahan Skema di `01-schema.sql`)
1. **Tabel `fee`**:
   - Ubah `amount_fee` menjadi `NUMERIC(5,2)` dengan konstrain `CHECK (amount_fee >= 0 AND amount_fee <= 100)`.
   - Tambahkan kolom urutan agar tidak bergantung murni pada timestamp: `id_urutan SERIAL UNIQUE`.
2. **Tabel `split_bills`**:
   - Tambahkan kolom `fee_percent NUMERIC(5,2) NOT NULL` (sebagai *snapshot*).
3. **Tabel `profit`**:
   - Tambahkan kolom `id_sb UUID NOT NULL UNIQUE REFERENCES split_bills(id_sb) ON DELETE RESTRICT`. 
   - *(Kolom `fee_applied` tidak jadi ditambahkan ke profit karena sudah ada `fee_percent` di `split_bills`, sehingga menghindari redudansi)*.

## 4. Desain Endpoint (Prefix `/api/v1/komisi`)
- **GET /summary** (Auth: `superAdminOnly`)
  - Response: `current_fee_percentage`, `current_month_total_dana`, `current_month_profit`, `history` (array berisi `periode`, `total_dana`, `total_profit`, `percentage_label` ("Bervariasi" jika >1 segmen) dengan paginasi). Bulan kosong disembunyikan.
- **PUT /fee** (Auth: `superAdminOnly`)
  - Request: `{ "new_fee": 2.50, "old_fee": 2.00 }`.
  - Menggunakan transaksi `pg_advisory_xact_lock(hashtext('fee'))` untuk mencegah *race condition*, tolak 409 jika `old_fee` beda, insert baris baru (append-only), dan insert ke `audit_logs`.
- **GET /detail/:periode** (format `YYYY-MM`) (Auth: `superAdminOnly`)
  - Response: `periode`, `total_dana`, `total_profit`, dan `segments: [{percentage, total_fund, commission}]`. Total keuntungan = agregasi `SUM(profit.amount_profit)`, BUKAN hitung ulang.

## 5. Alur Perhitungan (Helper Tunggal)
- Dibuat fungsi helper `hitungKomisi(totalDana, feePercent)`:
  - Menggunakan aritmetika integer (Basis Poin). `feePercent * 100` untuk mendapat integer, lalu BigInt untuk perkalian, lalu `/ 10000`.
- **Patokan Waktu**: Perubahan komisi berlaku (Opsi 1) persis di momen transaksi `/confirm` dijalankan.
- **Periode Laporan**: Diambil dari `split_bills.processed_at` berstatus `completed`. Memakai zona waktu bisnis eksplisit (misal `Asia/Jakarta` via konfigurasi), dengan interval `[awal bulan, awal bulan berikutnya)`.

## 6. Penanganan Konflik `/INIT` vs `/CONFIRM` & Validasi Lanjutan
- **`fee_persen` Opsional**: Klien dapat mengirim `fee_persen` di body `/confirm` sesuai respons `/init`. (Saat ini OPSIONAL. Akan diubah menjadi WAJIB di fase berikutnya setelah frontend diupdate).
- **Validasi Nilai Klien**: Akan dinormalisasi ke *basis poin* dengan parser string ketat (terima "10", 10, "10.00", 2.5). Tolak angka negatif, >100, atau lebih dari 2 desimal dengan `400 INVALID_FEE_PERCENT`. Perbandingan dilakukan dalam bentuk *integer basis point* (tidak membandingkan *float*).
- **Pengecekan `FEE_CHANGED`**: Dilakukan **sebelum** verifikasi total alokasi, membandingkan fee klien dengan fee *snapshot* transaksi yang sedang berjalan (tidak membaca ulang DB). Jika berbeda, tolak dengan `409 FEE_CHANGED` sebelum operasi DB apapun dilakukan. Log penolakan via `tsc-logs`.
- **Tugas Frontend (Terpisah)**: Frontend harus mengirim `fee_persen` dari /init ke body /confirm. Jika menerima 409 FEE_CHANGED, beri info ke admin dan otomatis memuat ulang /init.

## 7. Daftar File yang Akan Diubah
- `01-schema.sql` (Tipe data NUMERIC, CHECK, relasi `profit`, SERIAL di `fee`).
- `02-seed.sql` (Data transaksi historis dengan `now() - interval`).
- `04-view.sql` (Ubah `view_splitbills_detail` hapus *cross join*).
- `auth-middleware.ts` (Ubah `superAdminOnly` -> 403).
- `fee-helper.ts` (Helper aritmetika BigInt `hitungKomisi`, helper DB `getCurrentFee(tx)`, dan parser/validator).
- `init-splitbills.ts` & `confirm-splitbills.ts` (Validasi `isSafeInteger`, pakai helper, cek `RETURNING` deposit, tangani `FEE_CHANGED`).
- `confirm-splitbills-controller.ts` (Terima body opsional `fee_persen`, normalisasi dan format error).
- `komisi-routes.ts`, `komisi-controller.ts`, `komisi-models.ts` (Endpoints komisi).
- `index.ts` (Registrasi router baru).
- `07-splitbills.md` (Update docs untuk /confirm field baru).
- `10-komisi.md` (Dokumentasi endpoints komisi).

## 8. Rencana Seed Dev dan Reset
- Data akun superadmin sudah ada. Seed `fee` 10 diubah ke NUMERIC.
- Tambahkan transaksi historis dengan `now() - interval` menggunakan 2 persentase (misal 5% dan 10%) beserta konsistensi saldo warga (manual).

## 9. Rencana Pengujian
- Uji deviasi Math.floor vs helper BigInt pada desimal khusus (contoh: 100000 dengan 0.29% harus 290).
- Uji `/confirm` ganda (dibuktikan dan dilaporkan terpisah, perbaikan dengan cek empty *RETURNING*).
- Uji PUT `/fee` serentak dan Optimistic Lock (409 jika beda).
- Uji *mismatch* fee antara `/init` dan `/confirm` (409 `FEE_CHANGED`), dan uji parsing valid "10", 10, "10.00".
- Verifikasi batas bulan berdasar zona waktu spesifik.

## 10. Checklist Tugas Lanjutan
- [ ] Implementasi backend fitur Komisi.
- [ ] Ubah `fee_persen` menjadi WAJIB di sisi backend, setelah UI Frontend diperbarui dan disebarkan ke klien.
