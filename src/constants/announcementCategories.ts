import type { Announcement } from "../stores/contentStore";

/** Nilai khusus buat chip "Semua": tidak menyaring apa pun. */
export const ALL_CATEGORIES = "";

/**
 * Daftar chip filter, urutannya mengikuti desain.
 *
 * CATATAN BACKEND: `AnnouncementContent` di Rust cuma punya `text`, `author`,
 * dan `important` -- belum ada field kategori. Jadi untuk sekarang cuma
 * "Penting" dan "Umum" yang benar-benar bisa terisi (lihat resolveCategory).
 * Begitu backend menambahkan `category` di dalam `content`, chip sisanya
 * langsung jalan tanpa perlu ubah apa-apa di sini.
 */
export const ANNOUNCEMENT_CATEGORIES = [
  { value: ALL_CATEGORIES, label: "Semua" },
  { value: "Penting", label: "Penting" },
  { value: "Kegiatan RT", label: "Kegiatan RT" },
  { value: "Bank Sampah", label: "Bank Sampah" },
  { value: "Umum", label: "Umum" },
] as const;

/**
 * Kategori satu pengumuman.
 *
 * `content.category` dipakai duluan kalau backend sudah mengirimnya; kalau
 * belum, flag `important` yang jadi penentu.
 */
export function resolveCategory(item: Announcement): string {
  const fromServer = item.content.category?.trim();
  if (fromServer) return fromServer;

  return item.content.important ? "Penting" : "Umum";
}

/** Warna badge per kategori; yang tidak terdaftar pakai warna netral hijau. */
const BADGE_CLASSES: Record<string, string> = {
  Penting: "bg-primary-500 text-white",
  "Kegiatan RT": "bg-primary-500 text-white",
  "Bank Sampah": "bg-primary-500 text-white",
  Umum: "bg-primary-300 text-primary-900",
};

export function categoryBadgeClass(category: string): string {
  return BADGE_CLASSES[category] ?? "bg-primary-500 text-white";
}
