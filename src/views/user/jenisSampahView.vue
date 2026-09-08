<script setup lang="ts">
import { computed, ref } from "vue";
import { useRouter } from "vue-router";
import ContentListPage from "../../components/ContentListPage.vue";
import FilterChips from "../../components/FilterChips.vue";
import WasteTypeCard from "../../components/cards/WasteTypeCard.vue";
import {
  ALL_WASTE_CATEGORIES,
  WASTE_CATEGORY_CHIPS,
} from "../../constants/wasteCatalog";
import { useSearchableList } from "../../composables/useSearchableList";
import { useWasteStore } from "../../stores/wasteStore";
import type { CatalogItem } from "../../stores/wasteStore";

const router = useRouter();
const wasteStore = useWasteStore();

// Kata kuncinya sudah di-debounce di dalam useSearchableList, jadi mengetik
// cepat tetap cuma menghasilkan satu panggilan get_catalog_command.
const { searchTerm, items, loading, errorMessage, submit, clearSearch, reload } =
  useSearchableList<CatalogItem>(
    (search) => wasteStore.listCatalog({ search }),
    { fallbackError: "Gagal memuat katalog sampah. Coba lagi sebentar lagi." },
  );

/**
 * Command-nya sebenarnya bisa menyaring `category_id` sendiri, tapi filternya
 * tetap dikerjakan di frontend seperti halaman pengumuman: tiap panggilan ikut
 * memicu smart sync di backend, padahal datanya sudah ada di tangan.
 */
const activeCategory = ref<string>(ALL_WASTE_CATEGORIES);

const visibleItems = computed(() => {
  if (activeCategory.value === ALL_WASTE_CATEGORIES) return items.value;
  return items.value.filter(
    (item) => String(item.category_id ?? "") === activeCategory.value,
  );
});

const isFiltered = computed(
  () =>
    searchTerm.value.trim().length > 0 ||
    activeCategory.value !== ALL_WASTE_CATEGORIES,
);

function openDetail(id: string) {
  router.push({ name: "user-jenis-sampah-detail", params: { id } });
}
</script>

<template>
  <ContentListPage
    v-model:search="searchTerm"
    title="Jenis Sampah"
    search-placeholder="Besi, Botol..."
    search-label="Cari jenis sampah"
    :loading="loading"
    :error-message="errorMessage"
    :empty="visibleItems.length === 0"
    :filtered="isFiltered"
    empty-title="Belum ada jenis sampah"
    empty-message="Daftar jenis sampah belum tersedia untuk saat ini."
    empty-filtered-title="Jenis sampah tidak ditemukan"
    empty-filtered-message="Coba ubah kata kunci atau pilih kategori lain."
    list-class="grid grid-cols-2 items-stretch gap-3"
    @submit="submit"
    @clear="clearSearch"
    @retry="reload"
  >
    <template #filters>
      <FilterChips v-model="activeCategory" :chips="WASTE_CATEGORY_CHIPS" />
    </template>

    <WasteTypeCard
      v-for="item in visibleItems"
      :key="item.id_waste"
      :name="item.name"
      :price="item.price"
      :unit="item.unit"
      :image="item.image_base64 ?? ''"
      @open="openDetail(item.id_waste)"
    />
  </ContentListPage>
</template>
