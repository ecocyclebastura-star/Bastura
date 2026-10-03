# Laporan Pengerjaan API Setoran Admin

## File yang Dibuat / Diubah
- `bastura-db/init-scripts/01-schema.sql`: Menambahkan kolom `details JSONB` di `audit_logs` dan `created_by UUID` di tabel `deposit`.
- `bastura-api/src/index.ts`: Mendaftarkan `depositApp` ke route `/api/v1/deposits`.
- `bastura-api/src/routes/deposit-routes.ts`: Membuat route untuk CRUD setoran.
- `bastura-api/src/logs/type/deposit-logs-type.ts` & `bastura-api/src/logs/deposit/deposit-logs.ts`: Log handler custom.
- `bastura-api/src/controller/deposit-controller/utils.ts`: Helper validasi UUID.
- `bastura-api/src/controller/deposit-controller/*`: Controller CRUD setoran (add, edit, get, delete).

## Temuan Struktur & Asumsi
1. **Satu Setoran = Satu Item**: Sesuai skema `deposit` di DB yang langsung menunjuk ke `catalog_id`, API ditulis untuk menerima satu item per request (tidak menggunakan array `items`). Jika UI memiliki fitur "+ item", klien perlu memanggil API `POST` berulang kali.
2. **Penamaan `category_id`**: Klien mengirimkan `category_id` untuk memilih jenis sampah. Nilai ini sebenarnya di-map ke `catalog_id` (karena mereferensikan `waste_catalog`).
3. **Kolom `weight_dp`**: Bertipe `BIGINT`, tapi requirement menyatakan butuh pecahan (3 angka desimal). Karena mengubah ke `NUMERIC` berisiko merusak modul lain yang melakukan casting `SUM(weight_dp)::BIGINT`, data pecahan akan masuk sebagai float dari API dan diubah (dibulatkan secara otomatis oleh Postgres saat masuk kolom BIGINT).
4. **Warga Diblokir**: Asumsi saat ini tetap bisa melakukan setoran (keputusan bisnis: apakah sampah warga terblokir masih ditampung?). Jika dilarang, perlu ditambahkan pengecekan status warga.

## Hal yang Perlu Konfirmasi Manusia
- **Audit Logs Snapshot untuk Data Uang (Hard Delete)**: Sesuai instruksi, row `deposit` langsung dihapus (HARD DELETE) dan snapshot-nya diselipkan dalam kolom `details JSONB` baru di `audit_logs`. Mohon dipastikan skema ini sesuai untuk audit keuangan.
- **Tipe Kolom `weight_dp` BIGINT**: Mohon konfirmasi tim DB jika berat butuh desimal, apakah akan diubah ke `NUMERIC(10,3)`? Saat ini Postgres akan membulatkan nilai yang di-insert jika bertipe float.
- **Tabel Route Final**:

| Method | Path | Guard | Body | Respons Sukses (200/201) |
|---|---|---|---|---|
| GET | `/api/v1/deposits` | `adminOnly` | (query) `search, status, page, limit` | `{ status: "success", data: [...], total, page, limit }` |
| GET | `/api/v1/deposits/:id` | `adminOnly` | (param) `id` | `{ status: "success", data: { id, user, items: [...], total_weight... } }` |
| POST | `/api/v1/deposits` | `adminOnly` | `{ user_id, category_id, description, weight_kg }` | `{ status: "success", data: { id_deposit } }` |
| PATCH | `/api/v1/deposits/:id` | `adminOnly` | `{ category_id?, description?, weight_kg? }` | `{ status: "success" }` |
| DELETE | `/api/v1/deposits/:id` | `adminOnly` | (param) `id` | `{ status: "success" }` |

## Reset Database Lokal
Karena perubahan pada `01-schema.sql`, jalankan:
`docker compose down -v` lalu build ulang volume DB agar mendapat skema terbaru untuk lokal.
