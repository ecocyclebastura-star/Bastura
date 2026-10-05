<script setup lang="ts">
import { computed, onMounted, ref, shallowRef, watch } from "vue";
import { useRouter } from "vue-router";
import AlertToast from "../../components/AlertToast.vue";
import BaseButton from "../../components/BaseButton.vue";
import BaseDialog from "../../components/BaseDialog.vue";
import ContentListPage from "../../components/ContentListPage.vue";
import FabButton from "../../components/FabButton.vue";
import FilterChips from "../../components/FilterChips.vue";
import AdminWasteTypeCard from "../../components/cards/AdminWasteTypeCard.vue";
import { resolveAuthError } from "../../constants/authErrors";
import {
  ALL_WASTE_CATEGORIES,
  buildWasteCategoryChips,
  mergeWasteCategories,
} from "../../constants/wasteCatalog";
import { useSearchableList } from "../../composables/useSearchableList";
import { useToast } from "../../composables/useToast";
import { useCatalogAdminStore } from "../../stores/catalogAdminStore";
import { useWasteStore } from "../../stores/wasteStore";
import type { CatalogItem } from "../../stores/wasteStore";

const router = useRouter();
const wasteStore = useWasteStore();
const store = useCatalogAdminStore();
const { toastMessage, toastVariant, showToast } = useToast();

const { searchTerm, items, loading, errorMessage, submit, clearSearch, reload } =
  useSearchableList<CatalogItem>(
    (search) => wasteStore.listCatalog({ search }),
    { fallbackError: "Gagal memuat katalog sampah. Coba lagi sebentar lagi." },
  );

// Filter kategori dikerjakan di sini, sama seperti halaman warga.
const activeCategory = ref<string>(ALL_WASTE_CATEGORIES);

/** Semua kategori yang pernah muncul di hasil command, id -> nama. */
const knownCategories = shallowRef<Map<number, string>>(new Map());
watch(items, (list) => {
  knownCategories.value = mergeWasteCategories(knownCategories.value, list);
});

const categoryChips = computed(() => buildWasteCategoryChips(knownCategories.value));

const visibleItems = computed(() => {
  if (activeCategory.value === ALL_WASTE_CATEGORIES) return items.value;
  return items.value.filter(
    (item) => String(item.category_id ?? "") === activeCategory.value,
  );
});

const isFiltered = computed(
  () => searchTerm.value.trim().length > 0 || activeCategory.value !== ALL_WASTE_CATEGORIES,
);

/* ================================= HAPUS ================================= */

const deleteTarget = ref<CatalogItem | null>(null);
const deleting = ref(false);

function closeDeleteDialog() {
  if (!deleting.value) deleteTarget.value = null;
}

async function confirmDelete() {
  const target = deleteTarget.value;
  if (!target || deleting.value) return;

  deleting.value = true;
  try {
    await store.remove(target.id_waste);
    items.value = items.value.filter((item) => item.id_waste !== target.id_waste);
    showToast("Perubahan berhasil disimpan.", "success");
  } catch (error) {
    showToast(resolveAuthError(error, "Perubahan gagal disimpan."), "error");
  } finally {
    deleting.value = false;
    deleteTarget.value = null;
  }
}

/* =============================== NAVIGASI =============================== */

function openDetail(item: CatalogItem) {
  router.push({ name: "admin-jenis-sampah-detail", params: { id: item.id_waste } });
}

function openEdit(item: CatalogItem) {
  router.push({ name: "admin-jenis-sampah-edit", params: { id: item.id_waste } });
}

onMounted(() => {
  // Titipan dari form Tambah/Edit.
  const flash = store.takeFlash();
  if (flash.message) showToast(flash.message, flash.variant);
});
</script>

<template>
  <ContentListPage
    v-model:search="searchTerm"
    title="Jenis Sampah"
    back-to="dashboard-admin"
    search-placeholder="Besi, Botol..."
    search-label="Cari jenis sampah"
    :loading="loading"
    :error-message="errorMessage"
    :empty="visibleItems.length === 0"
    :filtered="isFiltered"
    empty-title="Belum ada jenis sampah"
    empty-message="Tambahkan jenis sampah pertama lewat tombol tambah di bawah."
    empty-filtered-title="Jenis sampah tidak ditemukan"
    empty-filtered-message="Coba ubah kata kunci atau pilih kategori lain."
    list-class="grid grid-cols-2 items-stretch gap-3 pb-20"
    @submit="submit"
    @clear="clearSearch"
    @retry="reload"
  >
    <template #filters>
      <FilterChips v-model="activeCategory" :chips="categoryChips" />
    </template>

    <AdminWasteTypeCard
      v-for="item in visibleItems"
      :key="item.id_waste"
      :name="item.name"
      :price="item.price"
      :unit="item.unit"
      :image="item.image_base64 ?? ''"
      :busy="deleting && deleteTarget?.id_waste === item.id_waste"
      @open="openDetail(item)"
      @edit="openEdit(item)"
      @delete="deleteTarget = item"
    />
  </ContentListPage>

  <FabButton
    label="Tambah jenis sampah"
    @click="router.push({ name: 'admin-jenis-sampah-tambah' })"
  />

  <BaseDialog
    :open="deleteTarget !== null"
    title="Hapus Jenis Sampah Ini?"
    message="Data jenis sampah yang sudah dihapus tidak dapat dikembalikan. Pastikan Anda ingin menghapus data ini."
    dismissible
    @close="closeDeleteDialog"
  >
    <template #actions>
      <BaseButton
        class="flex-1"
        label="Batal"
        variant="warning"
        :block="false"
        :disabled="deleting"
        @click="closeDeleteDialog"
      />
      <BaseButton
        class="flex-1"
        label="Hapus"
        variant="accent"
        :block="false"
        :loading="deleting"
        @click="confirmDelete"
      />
    </template>
  </BaseDialog>

  <!-- Setelah BaseDialog: sama-sama z-50, toast harus tetap di atas. -->
  <AlertToast :message="toastMessage" :variant="toastVariant" />
</template>
