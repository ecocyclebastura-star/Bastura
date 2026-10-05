/**
 * Aturan tampilan & hitungan halaman Setoran dan Bagi Hasil Setoran.
 *
 * Status setoran dibaca lewat pola yang sama dengan transaksi
 * (constants/transactions.ts), jadi ejaan server apa pun ("diproses",
 * "pending", "selesai", "approved") tetap jatuh ke kelompok yang benar.
 */
import { resolveStatusKey } from "./transactions";

/* ================================ STATUS ================================ */

/**
 * Setoran cuma punya dua keadaan di desain: masih menunggu hasil penjualan
 * ("proses"), atau hasilnya sudah dibagikan ke saldo warga ("selesai").
 */
export type SetoranStage = "proses" | "selesai";

export function resolveSetoranStage(status: string | null | undefined): SetoranStage {
  return resolveStatusKey(status) === "disetujui" ? "selesai" : "proses";
}

/** Badge di kartu setoran; "Selesai" sengaja pill hijau penuh sesuai desain. */
export const SETORAN_BADGES: Record<SetoranStage, { label: string; badgeClass: string }> = {
  proses: {
    label: "Diproses",
    badgeClass: "border-blue-500 bg-blue-50 text-blue-600",
  },
  selesai: {
    label: "Selesai",
    badgeClass: "border-primary-500 bg-primary-500 text-white",
  },
};

/** Chip filter halaman Setoran; "" berarti semua. */
export const SETORAN_FILTERS = [
  { value: "", label: "Semua" },
  { value: "proses", label: "Proses" },
  { value: "selesai", label: "Selesai" },
] as const;

/* ================================ BERAT ================================= */

const BERAT_FORMATTER = new Intl.NumberFormat("id-ID", {
  maximumFractionDigits: 2,
});

/** Berat siap tampil, mis. 1.5 -> "1,5kg". Spasi mengikuti gaya tiap desain. */
export function formatBerat(value: number | null | undefined, spaced = false): string {
  return `${BERAT_FORMATTER.format(value ?? 0)}${spaced ? " " : ""}kg`;
}

/**
 * Baca isian berat dari keyboard. Koma dan titik sama-sama dianggap pemisah
 * desimal, karena keyboard HP berbahasa Indonesia kerap cuma menyediakan koma.
 * Hasilnya NaN kalau isiannya bukan angka.
 */
export function parseBerat(value: string): number {
  const normalized = value.trim().replace(",", ".");
  if (!/^\d+(\.\d+)?$/.test(normalized)) return Number.NaN;
  return Number(normalized);
}

/* ================================ SATUAN ================================ */

/**
 * Total gabungan setoran, mis. "12 unit". Sampah per kg dan per buah (pc)
 * ikut terjumlah jadi satu angka -- server pun menjumlahkannya begitu -- jadi
 * total ditulis "unit". Rincian kg/pc-nya kelihatan di detail tiap setoran.
 */
export function formatTotalUnit(value: number | null | undefined, spaced = true): string {
  return `${BERAT_FORMATTER.format(value ?? 0)}${spaced ? " " : ""}unit`;
}

/**
 * Satuan item katalog. Sebagian sampah dihitung per buah ("pc"), mis. jerigen;
 * sisanya per kg. Backend menandainya lewat `unit` di katalog maupun di detail
 * setoran; nilai kosong atau tak dikenal dianggap kg.
 */
export type SetoranUnit = "kg" | "pc";

export function normalizeUnit(unit: string | null | undefined): SetoranUnit {
  const value = unit?.trim().toLowerCase();
  return value === "pc" || value === "pcs" ? "pc" : "kg";
}

/**
 * Baca bagian jumlah dari deskripsi transaksi setoran, mis. "4.00kg",
 * "2,5 kg", "3 pc", atau "3pc". Backend menulis ulang deskripsi item per buah
 * jadi berakhiran "pc" (apply_pc_formatting_to_transactions & split bill),
 * jadi satuannya cukup dibaca dari akhiran itu. Nilai NaN kalau tidak terbaca.
 */
export function parseJumlahSetoran(text: string | null | undefined): {
  value: number;
  unit: SetoranUnit;
} {
  const raw = text?.trim() ?? "";
  const match = raw.match(/^([\d.,]+)\s*(kg|pcs?)?$/i);
  if (!match) return { value: Number.NaN, unit: "kg" };
  return { value: parseBerat(match[1]), unit: normalizeUnit(match[2]) };
}

/** Jumlah per satuan siap tampil, mis. 1.5 kg -> "1,5kg", 3 pc -> "3pc". */
export function formatJumlah(value: number, unit: SetoranUnit, spaced = false): string {
  if (unit === "kg") return formatBerat(value, spaced);
  return `${BERAT_FORMATTER.format(value)}${spaced ? " " : ""}pc`;
}

/* ============================== BAGI HASIL ============================== */

/**
 * Pecah `total` rupiah jadi bagian bulat yang sebanding dengan `weights`.
 *
 * Pakai metode sisa terbesar: tiap bagian dibulatkan ke bawah dulu, lalu
 * sisa rupiahnya dibagikan satu-satu ke bagian dengan pecahan terbesar.
 * Hasilnya selalu berjumlah persis `total` -- tidak ada rupiah yang hilang
 * atau berlebih gara-gara pembulatan. Kalau semua bobotnya nol, dibagi rata.
 */
export function splitProportional(total: number, weights: readonly number[]): number[] {
  if (weights.length === 0) return [];

  const amount = Math.max(0, Math.floor(total));
  const sum = weights.reduce((acc, weight) => acc + Math.max(0, weight), 0);
  const shares = weights.map((weight) =>
    sum > 0 ? (amount * Math.max(0, weight)) / sum : amount / weights.length,
  );

  const result = shares.map(Math.floor);
  let remainder = amount - result.reduce((acc, value) => acc + value, 0);

  const byFraction = shares
    .map((share, index) => ({ index, fraction: share - Math.floor(share) }))
    .sort((a, b) => b.fraction - a.fraction);

  for (let i = 0; remainder > 0; i = (i + 1) % byFraction.length, remainder--) {
    result[byFraction[i].index] += 1;
  }

  return result;
}

/** Langkah tombol +/- di kartu alokasi warga. */
export const ALOKASI_STEP = 1_000;
