/** Penerjemah nilai mentah katalog sampah jadi bentuk yang siap ditampilkan. */
import { formatRupiah } from "../utils/formatters";

/** Nilai khusus buat chip "Semua": tidak menyaring apa pun. */
export const ALL_WASTE_CATEGORIES = "";

/**
 * Nama kategori per `category_id`.
 *
 * MASIH PERLU DICOCOKKAN DENGAN BACKEND. Yang dikirim server cuma angka
 * `category_id` (lihat CatalogItemLocal di
 * src-tauri/src/models/waste_model.rs); nama kategorinya belum ada di
 * mana-mana -- tidak di tabel waste_catalog_cache, tidak juga di command-nya.
 * Angka 1-8 di bawah disusun mengikuti urutan chip pada mockup, jadi masih
 * tebakan. Kalau id aslinya beda, cukup betulkan angkanya di sini; sisa
 * halamannya ikut menyesuaikan sendiri.
 */
export const WASTE_CATEGORY_LABELS: Record<number, string> = {
  1: "Plastik PET",
  2: "Plastik Non-PET",
  3: "Plastik Lunak",
  4: "Kertas & Kardus",
  5: "Logam",
  6: "Kaca",
  7: "Elektronik",
  8: "Lainnya",
};

/**
 * Chip filter; `value`-nya berupa `category_id` dalam bentuk string, karena
 * FilterChips bekerja dengan string.
 */
export const WASTE_CATEGORY_CHIPS: { value: string; label: string }[] = [
  { value: ALL_WASTE_CATEGORIES, label: "Semua" },
  ...Object.entries(WASTE_CATEGORY_LABELS).map(([id, label]) => ({
    value: id,
    label,
  })),
];

/** Nama kategori satu item; id yang tidak dikenal masuk ke "Lainnya". */
export function resolveWasteCategory(id: number | null | undefined): string {
  if (id == null) return "Lainnya";
  return WASTE_CATEGORY_LABELS[id] ?? "Lainnya";
}

/**
 * Estimasi harga siap tampil, mis. "Rp1.500/kg".
 *
 * Harga yang belum diisi backend ditampilkan sebagai placeholder, bukan
 * "Rp0" -- gratis dan belum ada harganya itu dua hal yang berbeda.
 */
export function formatHargaSatuan(
  price: number | null | undefined,
  unit: string | null | undefined,
): string {
  if (price == null) return "Belum ada";
  return `${formatRupiah(price)}/${unit?.trim() || "kg"}`;
}
