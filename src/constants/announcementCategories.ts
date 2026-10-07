import type { FilterChip } from "../components/FilterChips.vue";
import type { Announcement } from "../stores/contentStore";

/** Nilai khusus buat chip "Semua": tidak menyaring apa pun. */
export const ALL_CATEGORIES = "";

/**
 * Kategori satu pengumuman.
 *
 * `category_name` dari server dipakai duluan; pengumuman lama yang belum
 * punya kategori jatuh ke flag `important`.
 */
export function resolveCategory(item: Announcement): string {
  const fromServer = item.category_name?.trim();
  if (fromServer) return fromServer;

  return item.content.important ? "Penting" : "Umum";
}

/** Nama kategori dibandingkan tanpa peduli besar-kecil huruf & spasi tepi. */
function categoryKey(name: string): string {
  return name.trim().toLowerCase();
}

export function isSameCategory(a: string, b: string): boolean {
  return categoryKey(a) === categoryKey(b);
}

/**
 * Chip filter dari nama-nama kategori, diawali chip "Semua". Nama kembar
 * (beda huruf besar-kecil sekalipun) cuma muncul sekali, mengikuti urutan
 * kemunculan pertamanya.
 */
export function buildCategoryChips(names: Iterable<string>): FilterChip[] {
  const chips: FilterChip[] = [{ value: ALL_CATEGORIES, label: "Semua" }];
  const seen = new Set<string>();

  for (const name of names) {
    const label = name.trim();
    const key = categoryKey(label);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    chips.push({ value: label, label });
  }
  return chips;
}

/** Warna badge per kategori; yang tidak terdaftar pakai warna netral hijau. */
const BADGE_CLASSES: Record<string, string> = {
  umum: "bg-primary-300 text-primary-900",
};

export function categoryBadgeClass(category: string): string {
  return BADGE_CLASSES[categoryKey(category)] ?? "bg-primary-500 text-white";
}
