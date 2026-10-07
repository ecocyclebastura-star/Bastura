import { computed, ref, watch } from "vue";
import type { Ref } from "vue";
import {
  ALL_CATEGORIES,
  buildCategoryChips,
  isSameCategory,
  resolveCategory,
} from "../constants/announcementCategories";
import type { Announcement } from "../stores/contentStore";

/**
 * Chip kategori + penyaringan untuk halaman daftar pengumuman (warga & admin).
 *
 * Nama chip mengikuti kategori dari server, jadi selalu sama persis dengan
 * `category_name` pengumumannya:
 * - `serverNames`: daftar resmi dari `get_announcement_categories_command`.
 *   Cuma admin yang boleh memanggilnya, jadi warga tidak mengisinya.
 * - Sisanya dikumpulkan dari pengumuman yang pernah dimuat. Sengaja hanya
 *   ditambah, tidak pernah dikurangi, supaya chip tidak ikut hilang waktu
 *   hasil pencarian menyempit.
 */
export function useAnnouncementChips(
  items: Ref<Announcement[]>,
  serverNames?: Ref<string[]>,
) {
  const activeCategory = ref<string>(ALL_CATEGORIES);
  const seenNames = ref<string[]>([]);

  watch(
    items,
    (list) => {
      for (const item of list) {
        const name = resolveCategory(item);
        if (!seenNames.value.some((seen) => isSameCategory(seen, name))) {
          seenNames.value.push(name);
        }
      }
    },
    { immediate: true },
  );

  const chips = computed(() =>
    buildCategoryChips([...(serverNames?.value ?? []), ...seenNames.value]),
  );

  // Filter dikerjakan di sisi frontend: datanya sudah ada di tangan, jadi
  // ganti-ganti chip tidak perlu bolak-balik ke backend.
  const visibleItems = computed(() =>
    activeCategory.value === ALL_CATEGORIES
      ? items.value
      : items.value.filter((item) =>
          isSameCategory(resolveCategory(item), activeCategory.value),
        ),
  );

  return { activeCategory, chips, visibleItems };
}
