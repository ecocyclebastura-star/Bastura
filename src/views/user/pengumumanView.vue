<script setup lang="ts">
import { computed, ref } from "vue";
import { useRouter } from "vue-router";
import AnnouncementListItem from "../../components/AnnouncementListItem.vue";
import ContentListPage from "../../components/ContentListPage.vue";
import FilterChips from "../../components/FilterChips.vue";
import {
  ALL_CATEGORIES,
  ANNOUNCEMENT_CATEGORIES,
  resolveCategory,
} from "../../constants/announcementCategories";
import { useSearchableList } from "../../composables/useSearchableList";
import { useContentStore } from "../../stores/contentStore";
import type { Announcement } from "../../stores/contentStore";
import { formatTanggal } from "../../utils/formatters";

const router = useRouter();
const contentStore = useContentStore();

// Kata kuncinya sudah di-debounce di dalam useSearchableList, jadi mengetik
// cepat tetap cuma menghasilkan satu panggilan get_announcements_command.
const { searchTerm, items, loading, errorMessage, submit, clearSearch, reload } =
  useSearchableList<Announcement>(
    (search) => contentStore.listAnnouncements({ search }),
    { fallbackError: "Gagal memuat pengumuman. Coba lagi sebentar lagi." },
  );

// Filter kategori sengaja dikerjakan di sisi frontend: datanya sudah ada di
// tangan, jadi ganti-ganti chip tidak perlu bolak-balik ke backend.
const activeCategory = ref<string>(ALL_CATEGORIES);

const visibleItems = computed(() => {
  if (activeCategory.value === ALL_CATEGORIES) return items.value;
  return items.value.filter(
    (item) => resolveCategory(item) === activeCategory.value,
  );
});

const isFiltered = computed(
  () =>
    searchTerm.value.trim().length > 0 || activeCategory.value !== ALL_CATEGORIES,
);

function openDetail(id: string) {
  router.push({ name: "user-pengumuman-detail", params: { id } });
}
</script>

<template>
  <ContentListPage
    v-model:search="searchTerm"
    title="Pengumuman"
    search-placeholder="Cari pengumuman..."
    search-label="Cari pengumuman"
    :loading="loading"
    :error-message="errorMessage"
    :empty="visibleItems.length === 0"
    :filtered="isFiltered"
    empty-title="Belum ada pengumuman"
    empty-message="Belum ada informasi terbaru untuk saat ini."
    empty-filtered-title="Pengumuman tidak ditemukan"
    empty-filtered-message="Coba ubah kata kunci atau pilih kategori lain."
    @submit="submit"
    @clear="clearSearch"
    @retry="reload"
  >
    <template #filters>
      <FilterChips v-model="activeCategory" :chips="ANNOUNCEMENT_CATEGORIES" />
    </template>

    <AnnouncementListItem
      v-for="item in visibleItems"
      :key="item.id"
      :title="item.title"
      :category="resolveCategory(item)"
      :author="item.content.author"
      :date="formatTanggal(item.created_at)"
      :image="item.image_base64 ?? item.image_url ?? ''"
      @open="openDetail(item.id)"
    />
  </ContentListPage>
</template>
