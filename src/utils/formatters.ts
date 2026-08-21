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
