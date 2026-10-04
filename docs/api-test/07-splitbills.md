# Dokumen Uji API: Modul Splitbills (Bagi Hasil)

## Konteks Bersama Modul Splitbills
- **Base URL**: `{{base_url}}` (contoh: `http://localhost:3000`)
- **Header Auth**: `Authorization: Bearer {{token_variabel}}`
- **Tipe Konten**: Selalu `application/json`
- Operasi Splitbills HANYA dapat diakses oleh **Admin** dan **Super Admin** (semua route dilindungi middleware `adminOnly`).

---

## 1. [SPB-GET-HISTORY] Lihat Riwayat Splitbills
- **Method**: `GET`
- **Endpoint**: `/api/v1/splitbills/history`
- **Akses**: Khusus **Admin** & **Super Admin**

**Contoh Response Sukses (200 OK):**
```json
{
  "status": "success",
  "message": "Data histori splitbills berhasil diambil",
  "code": "GET_HISTORY_SUCCESS",
  "data": [
    {
      "id_sb": "f8a7c2b1-d3e4-5f6a-9b0c-1d2e3f4a5b6c",
      "total_sb": 850000,
      "date_start": "2026-07-01T00:00:00.000Z",
      "date_end": "2026-07-31T23:59:59.000Z",
      "status": "processed",
      "processed_at": "2026-08-01T10:00:00.000Z"
    }
  ]
}
```

---

## 2. [SPB-POST-INIT] Kalkulasi / Simulasi Splitbills (Dry Run)
- **Method**: `POST`
- **Endpoint**: `/api/v1/splitbills/init`
- **Akses**: Khusus **Admin** & **Super Admin**
- **Deskripsi**: Menghitung alokasi dana per warga beserta fee admin berdasarkan periode tanggal. **(Tidak mengubah saldo, hanya simulasi/review)**.

**Panduan Postman (tab Body -> raw -> JSON):**
```json
{
  "total_dana": 100000,
  "date_start": "2026-07-01",
  "date_end": "2026-07-31"
}
```

**Contoh Response Sukses (200 OK):**
```json
{
  "status": "success",
  "message": "Inisiasi splitbills berhasil",
  "code": "INIT_SPLITBILLS_SUCCESS",
  "data": {
    "total_dana": 100000,
    "fee_persen": "10.00",
    "dana_setelah_pajak": 90000,
    "jumlah_warga": 2,
    "date_start": "2026-07-01",
    "date_end": "2026-07-31",
    "alokasi_preview": [
      {
        "id_user": "20000000-4000-a000-0000-000000000001",
        "name": "Budi Warga",
        "email": "warga1@example.com",
        "total_weight": 15,
        "total_value": 35000,
        "estimasi_alokasi": 31500
      },
      {
        "id_user": "20000000-4000-a000-0000-000000000002",
        "name": "Siti Warga",
        "email": "warga2@example.com",
        "total_weight": 20,
        "total_value": 65000,
        "estimasi_alokasi": 58500
      }
    ]
  }
}
```

**Tabel Response Error:**
| HTTP Status | Error Code | Kondisi / Penjelasan |
|---|---|---|
| 400 | `MISSING_PARAMS` | `total_dana`, `date_start`, atau `date_end` kosong. |
| 400 | `INVALID_AMOUNT` | `total_dana` bukan angka positif. |
| 404 | `NO_WARGA_FOUND` | Tidak ada warga yang melakukan setoran dalam rentang tanggal tersebut. |
| 500 | `FEE_NOT_FOUND` | Konfigurasi pajak/fee belum tersedia di database (belum diset oleh superadmin). |

---

## 3. [SPB-POST-CONFIRM] Konfirmasi Distribusi Dana Warga (Final)
- **Method**: `POST`
- **Endpoint**: `/api/v1/splitbills/confirm`
- **Akses**: Khusus **Admin** & **Super Admin**
- **Deskripsi**: Menyetujui hasil kalkulasi dan benar-benar menambahkan dana ke saldo/dompet Warga.

**Panduan Postman (tab Body -> raw -> JSON):**
Gunakan output dari endpoint `/init` lalu kirimkan:
```json
{
  "total_dana": 100000,
  "date_start": "2026-07-01",
  "date_end": "2026-07-31",
  "fee_persen": "10.00",
  "alokasi": [
    {
      "id_user": "20000000-4000-a000-0000-000000000001",
      "final_amount": 31500
    },
    {
      "id_user": "20000000-4000-a000-0000-000000000002",
      "final_amount": 58500
    }
  ]
}
```

**Contoh Response Sukses (200 OK):**
```json
{
  "status": "success",
  "message": "Dana berhasil dibagikan kepada seluruh warga",
  "code": "CONFIRM_SUCCESS",
  "data": {
    "id_sb": "50000000-0000-4000-8000-000000000001",
    "total_sb": 50000,
    "fee_persen": "10.00",
    "fee_amount": 5000,
    "dana_setelah_pajak": 45000,
    "date_start": "2026-07-01",
    "date_end": "2026-07-31",
    "jumlah_warga": 2,
    "jumlah_deposit_dibagikan": 3,
    "total_didistribusikan": 45000,
    "processed_by": "40000000-0000-4000-8000-000000000001",
    "processed_at": "2026-10-04T12:00:00.000Z"
  }
}
```

**Tabel Response Error:**
| HTTP Status | Error Code | Kondisi / Penjelasan |
|---|---|---|
| 400 | `MISSING_PARAMS` | Payload tidak lengkap (`total_dana`, `date_start`, `date_end`, `alokasi` wajib ada). |
| 400 | `INVALID_FORMAT` | Field `alokasi` bukan berupa array. |
| 400 | `INVALID_AMOUNT` | `total_dana` atau `final_amount` pada alokasi bukan angka positif. |
| 400 | `INVALID_FEE_PERCENT` | Field `fee_persen` (opsional) diisi tetapi formatnya tidak valid (harus desimal maksimal 2 angka). |
| 400 | `NO_ALLOCATIONS` | Daftar `alokasi` kosong (wajib minimal 1 warga). |
| 400 | `ADMIN_IN_ALLOCATION` | Terdapat ID admin di dalam daftar alokasi (admin tidak boleh menerima dana splitbills). |
| 400 | `INVALID_USER_IN_ALLOCATION` | Terdapat ID warga yang tidak valid atau tidak terdaftar. |
| 400 | `REMAINING_NOT_ZERO` | Total final alokasi warga tidak sama persis dengan sisa dana setelah pajak. (Harus pas). |
| 400 | `NO_DEPOSIT_FOR_USER` | Terdapat warga di daftar alokasi yang tidak memiliki setoran pada periode tersebut. |
| 400 | `BALANCE_NOT_FOUND` | Gagal menyalurkan ke saldo warga (akun tidak ada/terhapus saat diproses). |
| 409 | `FEE_CHANGED` | Jika `fee_persen` dikirim dan berbeda dengan persentase tarif admin di database saat ini, server akan menolak. |
| 409 | `DEPOSIT_NOT_FOUND` | Jika konfirmasi ditekan saat dana sudah dikonfirmasi (tidak ada lagi deposit yang berstatus processed untuk periode tersebut). |
| 500 | `FEE_NOT_FOUND` | Konfigurasi pajak/fee belum diset. |

---

## Catatan Khusus Frontend (Alur Splitbills)
1. **Kalkulasi**: Panggil endpoint `/init` untuk mendapatkan estimasi awal pembagian dana beserta nilai `fee_persen` yang berlaku saat ini.
2. **Persetujuan**: Simpan nilai `fee_persen` dari respons `/init`. Saat admin menekan tombol "Konfirmasi", sertakan `fee_persen` tersebut di dalam *body* request ke `/confirm`. Field ini bersifat opsional secara API, tetapi direkomendasikan agar ada perlindungan *optimistic locking*.
3. **Konflik Perubahan Tarif**: Jika sementara admin mereviu data, ternyata Super Admin mengubah tarif komisi, maka `/confirm` akan merespons dengan status `409` dan error code `FEE_CHANGED`. 
4. **Penanganan Konflik**: Jika mendapat error `FEE_CHANGED`, tampilkan notifikasi kepada admin (contoh: "Tarif komisi telah diperbarui oleh sistem, kalkulasi sedang disesuaikan..."), lalu secara otomatis panggil ulang endpoint `/init` untuk mendapatkan estimasi dengan tarif yang baru, dan minta admin meninjau ulang sebelum mengonfirmasi lagi.
5. **Format Fee**: Tipe `fee_persen` pada respons adalah `string` berformat desimal maksimal 2 angka di belakang koma (contoh: `"10.00"`, `"7.50"`, `"0.00"`). Rentangnya adalah 0 sampai 100.
6. **Snapshot**: Saat /confirm berhasil, persentase fee dan nominal komisi akan dicatat secara permanen di database sebagai *snapshot*. Perubahan persentase komisi di masa depan tidak akan memengaruhi transaksi splitbills yang sudah berstatus *completed*.
