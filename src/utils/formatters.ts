/** Pemformat nilai dari backend jadi bentuk yang siap ditampilkan. */

const TANGGAL_FORMATTER = new Intl.DateTimeFormat("id-ID", {
  day: "2-digit",
  month: "long",
  year: "numeric",
});

/**
 * Ubah `created_at` dari backend jadi "18 Juli 2026".
 *
 * Bentuk pasti string tanggalnya ditentukan server, jadi kalau tidak bisa
 * diparse nilainya dikembalikan apa adanya -- lebih baik menampilkan string
 * mentah daripada "Invalid Date".
 */
export function formatTanggal(value: string | null | undefined): string {
  if (!value) return "";

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;

  return TANGGAL_FORMATTER.format(parsed);
}

const BULAN_FORMATTER = new Intl.DateTimeFormat("id-ID", {
  month: "long",
  year: "numeric",
});

/**
 * Ubah `tanggal_transaksi` jadi "Juli 2026", dipakai sebagai pemisah bulan di
 * daftar riwayat. Sama seperti formatTanggal: string yang tidak bisa diparse
 * dikembalikan apa adanya.
 */
export function formatBulanTahun(value: string | null | undefined): string {
  if (!value) return "";

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;

  return BULAN_FORMATTER.format(parsed);
}

const RIBUAN_FORMATTER = new Intl.NumberFormat("id-ID", {
  maximumFractionDigits: 0,
});

/** Angka bertitik tanpa awalan, mis. 12000 -> "12.000". */
export function formatRibuan(value: number | null | undefined): string {
  return RIBUAN_FORMATTER.format(value ?? 0);
}

/** Nominal rupiah siap tampil, mis. 12000 -> "Rp12.000". */
export function formatRupiah(value: number | null | undefined): string {
  return `Rp${formatRibuan(value)}`;
}

const WITA_FORMATTER = new Intl.DateTimeFormat("id-ID", {
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
  timeZone: "Asia/Makassar",
});

/** Ada penanda zona waktu di ujung string (mis. "Z" atau "+07:00"). */
const HAS_TIMEZONE_RE = /(?:Z|[+-]\d{2}:?\d{2})$/i;
const JAM_RE = /\d{2}:\d{2}(?::\d{2})?/;

/**
 * Jam transaksi dalam WITA, mis. "20:00:00 WITA".
 *
 * Kalau string dari server memuat zona waktu, waktunya dikonversi ke WITA.
 * Kalau tidak (mis. "2026-07-30 20:00:00"), angkanya diambil apa adanya --
 * mengonversinya malah menggeser jam yang sudah benar, karena zona asalnya
 * cuma bisa ditebak.
 */
export function formatJamWita(value: string | null | undefined): string {
  const raw = value?.trim();
  if (!raw) return "";

  if (HAS_TIMEZONE_RE.test(raw)) {
    const parsed = new Date(raw);
    if (!Number.isNaN(parsed.getTime())) {
      return `${WITA_FORMATTER.format(parsed)} WITA`;
    }
  }

  const jam = raw.match(JAM_RE)?.[0];
  if (!jam) return "";

  return `${jam.length === 5 ? `${jam}:00` : jam} WITA`;
}
