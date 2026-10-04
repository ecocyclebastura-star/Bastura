# Dokumen Uji API: Modul Komisi (Fee Setoran)

## Konteks Bersama Modul Komisi
- **Base URL**: `{{base_url}}` (contoh: `http://localhost:3000`)
- **Header Auth**: `Authorization: Bearer {{token_variabel}}`
- **Tipe Konten**: Selalu `application/json`
- Seluruh endpoint Komisi HANYA dapat diakses oleh **Super Admin** (dilindungi middleware `superAdminOnly`).

---

## 1. [KOM-GET-SUMMARY] Ringkasan Komisi (Bulan Berjalan & Riwayat)
- **Method**: `GET`
- **Endpoint**: `/api/v1/komisi/summary?limit=12&offset=0`
- **Akses**: Khusus **Super Admin**
- **Deskripsi**: Menampilkan informasi total komisi admin bulan berjalan (dihitung *realtime* berdasar transaksi), fee saat ini, dan daftar riwayat per periode/bulan (hanya bulan yang ada transaksinya).

**Contoh Response Sukses (200 OK):**
```json
{
  "status": "success",
  "message": "Berhasil mengambil ringkasan komisi",
  "code": "KOMISI",
  "data": {
    "current_fee_percentage": "10.00",
    "current_month_total_dana": 150000,
    "current_month_profit": 15000,
    "history": [
      {
        "periode": "2026-07",
        "total_dana": 300000,
        "total_profit": 20000,
        "percentage_label": "Bervariasi"
      },
      {
        "periode": "2026-06",
        "total_dana": 150000,
        "total_profit": 15000,
        "percentage_label": "10.00%"
      }
    ]
  }
}
```

**Tabel Response Error (GET-SUMMARY):**
| HTTP Status | Error Code | Kondisi / Penjelasan |
|---|---|---|
| 401 | `TOKEN_INVALID` | Token tidak valid atau kedaluwarsa. |
| 403 | `FORBIDDEN` | Pengguna bukan Super Admin (hanya role 3 yang diizinkan). |
| 500 | *(Tidak ada)* | Kesalahan server internal saat kalkulasi summary. |

---

## 2. [KOM-GET-DETAIL] Rincian Komisi Berdasarkan Bulan
- **Method**: `GET`
- **Endpoint**: `/api/v1/komisi/detail/:periode` (contoh: `/api/v1/komisi/detail/2026-07`)
- **Akses**: Khusus **Super Admin**
- **Deskripsi**: Menampilkan rincian komisi dalam satu periode bulan, dipecah per persentase tarif. Berguna jika dalam satu bulan terjadi perubahan persentase sehingga komisi didapatkan dari berbagai tarif.

**Contoh Response Sukses (200 OK):**
```json
{
  "status": "success",
  "message": "Berhasil mengambil detail komisi",
  "code": "KOMISI",
  "data": {
    "periode": "2026-07",
    "total_dana": 300000,
    "total_profit": 20000,
    "segments": [
      {
        "percentage": "5.00",
        "total_fund": 200000,
        "commission": 10000
      },
      {
        "percentage": "10.00",
        "total_fund": 100000,
        "commission": 10000
      }
    ]
  }
}
```

---

**Tabel Response Error (GET-DETAIL):**
| HTTP Status | Error Code | Kondisi / Penjelasan |
|---|---|---|
| 400 | *(Tidak ada)* | Format periode salah (harus `YYYY-MM`). |
| 401 | `TOKEN_INVALID` | Token tidak valid atau kedaluwarsa. |
| 403 | `FORBIDDEN` | Pengguna bukan Super Admin (hanya role 3 yang diizinkan). |
| 500 | *(Tidak ada)* | Kesalahan server internal. |

**Kondisi Bulan Kosong:**
Jika tidak ada transaksi sama sekali pada periode yang diminta, endpoint ini akan tetap mengembalikan status `200 OK` dengan total 0 dan segments kosong:
```json
{
  "status": "success",
  "message": "Berhasil mengambil detail komisi",
  "code": "KOMISI",
  "data": {
    "periode": "2026-08",
    "total_dana": 0,
    "total_profit": 0,
    "segments": []
  }
}
```

---

## 3. [KOM-PUT-FEE] Ubah Persentase Komisi
- **Method**: `PUT`
- **Endpoint**: `/api/v1/komisi/fee`
- **Akses**: Khusus **Super Admin**
- **Deskripsi**: Mengubah persentase tarif yang akan dipotong pada saat konfirmasi splitbills ke depannya. Menggunakan mekanisme penguncian *optimistic lock* dengan mengirim *old_fee*. Perubahan HANYA berlaku untuk transaksi splitbills ke depan, tidak berlaku surut.

**Panduan Postman (tab Body -> raw -> JSON):**
```json
{
  "new_fee": "7.50",
  "old_fee": "10.00"
}
```
*Catatan: Validasi menolak angka negatif atau yang bukan angka. Maksimal 2 angka di belakang koma (rentang 0-100).*

**Contoh Response Sukses (200 OK):**
```json
{
  "status": "success",
  "message": "Berhasil memperbarui persentase komisi",
  "code": "KOMISI",
  "message": null
}
```
*(Catatan: karena parameter ke-7 pada code dikirim `null`, respons balasan memiliki field message bernilai null atau string bawaan framework).*

**Tabel Response Error:**
| HTTP Status | Error Code | Kondisi / Penjelasan |
|---|---|---|
| 400 | *(Tidak ada)* | Body `new_fee` atau `old_fee` kosong, atau format angka tidak sesuai (maksimal 2 desimal, 0-100). |
| 401 | `TOKEN_INVALID` | Token tidak valid. |
| 403 | `FORBIDDEN` | Pengguna bukan Super Admin (role bukan 3). |
| 409 | `OLD_FEE_MISMATCH` | `old_fee` yang dikirim berbeda dengan nilai DB saat ini (Sistem menolak untuk mencegah *race condition*). UI perlu dimuat ulang. |

---

## Catatan Tambahan (Business Rules & Perilaku)

1. **Perhitungan Komisi (Pajak)**
   - Nominal komisi per transaksi (dana admin) dihitung menggunakan aritmetika integer basis poin dan dibulatkan **KE BAWAH** (floor) ke satuan rupiah terdekat untuk setiap transaksi.
   - Total keuntungan komisi (profit) pada suatu periode adalah **JUMLAH** nominal komisi yang tersimpan per transaksi. Karena pembulatan ke bawah dilakukan per transaksi, total profit bisa berbeda beberapa rupiah dari hitungan kotor (`total_dana_periode x persentase`).

2. **Snapshot Tarif**
   - Persentase fee dan nominal tiap transaksi disimpan sebagai **snapshot** permanen di database. 
   - Mengubah persentase fee hanya memengaruhi perhitungan transaksi splitbills selanjutnya. Transaksi yang lalu tetap menggunakan tarif lama.

3. **Batas Waktu dan Zona Waktu**
   - Batas penentuan bulan (periode) didasarkan pada zona waktu bisnis **Asia/Jakarta**.
   - Kolom acuan untuk menentukan transaksi masuk di periode mana adalah kolom waktu penyelesaian transaksi (`processed_at`) saat statusnya `completed`.

4. **Terminologi**
   - Di dalam *source code* dan *database*, istilah yang digunakan adalah **"pajak"**, **"fee"**, atau **"profit"**. Namun untuk antarmuka pengguna (UI) dan dokumentasi, istilah konsisten yang dipakai adalah **"komisi"**.

5. **Paginasi dan Penanganan Bulan Kosong pada Riwayat**
   - Endpoint `/summary` menampilkan riwayat bulanan hanya untuk **bulan yang memiliki transaksi (`completed`)**. Bulan yang tidak ada transaksinya akan disembunyikan dari daftar `history` dan tidak dihitung ke dalam paginasi `limit/offset`.
   - Khusus untuk **Bulan Berjalan** (`current_month_total_dana`), datanya selalu ditampilkan di ringkasan (di bagian atas respons), meskipun totalnya nol.
