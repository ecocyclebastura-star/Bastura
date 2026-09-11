/** Penerjemah nilai mentah katalog sampah jadi bentuk yang siap ditampilkan. */
import { formatRupiah } from "../utils/formatters";
import type { CatalogItem } from "../stores/wasteStore";

/** Nilai khusus buat chip "Semua": tidak menyaring apa pun. */
export const ALL_WASTE_CATEGORIES = "";

/** Nama kategori satu item; yang belum diberi nama oleh server masuk ke "Lainnya". */
export function resolveWasteCategory(name: string | null | undefined): string {
  return name?.trim() || "Lainnya";
}

/**
 * Tambahkan kategori dari `items` ke daftar yang sudah dikenal, tanpa
 * mengubah `known`.
 *
 * Nama kategorinya sekarang dikirim server lewat `category_name`, jadi daftar
 * chip disusun dari katalog itu sendiri, bukan daftar tetap di sini. Hasilnya
 * sengaja dikumpulkan dari tiap pemanggilan, bukan cuma hasil terakhir: kalau
 * tidak, chip yang sedang aktif bisa hilang begitu kata kuncinya tidak cocok
 * dengan kategori itu.
 */
export function mergeWasteCategories(
  known: ReadonlyMap<number, string>,
  items: readonly CatalogItem[],
): Map<number, string> {
  const merged = new Map(known);
  for (const item of items) {
    if (item.category_id == null) continue;
    merged.set(item.category_id, resolveWasteCategory(item.category_name));
  }
  return merged;
}

/**
 * Chip filter; `value`-nya berupa `category_id` dalam bentuk string, karena
 * FilterChips bekerja dengan string. Diurutkan per id supaya posisi chip
 * tidak berpindah-pindah waktu kategori baru ikut terkumpul.
 */
export function buildWasteCategoryChips(
  categories: ReadonlyMap<number, string>,
): { value: string; label: string }[] {
  return [
    { value: ALL_WASTE_CATEGORIES, label: "Semua" },
    ...[...categories]
      .sort(([a], [b]) => a - b)
      .map(([id, label]) => ({ value: String(id), label })),
  ];
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
