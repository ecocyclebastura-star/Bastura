<script setup lang="ts">
import { computed, ref } from "vue";
import { useRouter } from "vue-router";
import ContentListPage from "../../components/ContentListPage.vue";
import FilterChips from "../../components/FilterChips.vue";
import WasteTypeCard from "../../components/cards/WasteTypeCard.vue";
import {
  ALL_WASTE_CATEGORIES,
  WASTE_CATEGORIES,
  WASTE_TYPES,
} from "../../constants/wasteTypes";

const router = useRouter();

/**
 * Datanya masih dari constants/wasteTypes.ts, jadi pencarian & filternya
 * dikerjakan di sini tanpa debounce -- tidak ada command yang perlu direm.
 * Kalau nanti sudah ada command-nya, halaman ini tinggal ikut pola
 * pengumumanView: useSearchableList buat kata kunci, chip tetap di frontend.
 */
const searchTerm = ref("");
const activeCategory = ref<string>(ALL_WASTE_CATEGORIES);

const visibleItems = computed(() => {
  const keyword = searchTerm.value.trim().toLowerCase();

  return WASTE_TYPES.filter((item) => {
    const cocokKategori =
      activeCategory.value === ALL_WASTE_CATEGORIES ||
      item.category === activeCategory.value;

    const cocokKata =
      !keyword ||
      item.name.toLowerCase().includes(keyword) ||
      item.category.toLowerCase().includes(keyword);

    return cocokKategori && cocokKata;
  });
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
    :empty="visibleItems.length === 0"
    :filtered="isFiltered"
    empty-title="Belum ada jenis sampah"
    empty-message="Daftar jenis sampah belum tersedia untuk saat ini."
    empty-filtered-title="Jenis sampah tidak ditemukan"
    empty-filtered-message="Coba ubah kata kunci atau pilih kategori lain."
    list-class="grid grid-cols-2 items-stretch gap-3"
  >
    <template #filters>
      <FilterChips v-model="activeCategory" :chips="WASTE_CATEGORIES" />
    </template>

    <WasteTypeCard
      v-for="item in visibleItems"
      :key="item.id"
      :name="item.name"
      :price-per-kg="item.price_per_kg"
      :image="item.image_base64 ?? item.image_url ?? ''"
      @open="openDetail(item.id)"
    />
  </ContentListPage>
</template>
