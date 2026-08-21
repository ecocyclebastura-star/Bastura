<script setup lang="ts">
import { computed } from "vue";
import ContentCard from "../../components/cards/ContentCard.vue";
import ContentListPage from "../../components/ContentListPage.vue";
import { useSearchableList } from "../../composables/useSearchableList";
import { useContentStore } from "../../stores/contentStore";
import type { Education } from "../../stores/contentStore";
import { formatTanggal } from "../../utils/formatters";

const contentStore = useContentStore();

const { searchTerm, items, loading, errorMessage, submit, clearSearch, reload } =
  useSearchableList<Education>(
    (search) => contentStore.listEducations({ search }),
    { fallbackError: "Gagal memuat materi edukasi. Coba lagi sebentar lagi." },
  );

const isSearching = computed(() => searchTerm.value.trim().length > 0);
</script>

<template>
  <ContentListPage
    v-model:search="searchTerm"
    title="Edukasi Sampah"
    search-placeholder="Cari materi edukasi"
    search-label="Cari materi edukasi"
    :loading="loading"
    :error-message="errorMessage"
    :empty="items.length === 0"
    :filtered="isSearching"
    empty-title="Belum ada materi edukasi"
    empty-message="Belum ada informasi terbaru untuk saat ini."
    empty-filtered-title="Materi tidak ditemukan"
    empty-filtered-message="Coba ubah kata kuncinya."
    list-class="flex flex-col gap-4"
    @submit="submit"
    @clear="clearSearch"
    @retry="reload"
  >
    <ContentCard
      v-for="item in items"
      :key="item.id"
      expanded
      :title="item.title"
      :date="formatTanggal(item.created_at)"
      :excerpt="item.content.text"
      :image="item.image_url ?? ''"
      :tags="item.content.tags"
    />
  </ContentListPage>
</template>
