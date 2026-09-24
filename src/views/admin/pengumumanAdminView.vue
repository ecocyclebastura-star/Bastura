<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import AdminAnnouncementItem from "../../components/AdminAnnouncementItem.vue";
import AlertToast from "../../components/AlertToast.vue";
import BaseButton from "../../components/BaseButton.vue";
import BaseDialog from "../../components/BaseDialog.vue";
import ContentListPage from "../../components/ContentListPage.vue";
import FabButton from "../../components/FabButton.vue";
import FilterChips from "../../components/FilterChips.vue";
import {
  ALL_CATEGORIES,
  ANNOUNCEMENT_CATEGORIES,
  resolveCategory,
} from "../../constants/announcementCategories";
import { resolveAuthError } from "../../constants/authErrors";
import { useSearchableList } from "../../composables/useSearchableList";
import { useToast } from "../../composables/useToast";
import { useAnnouncementAdminStore } from "../../stores/announcementAdminStore";
import type { Announcement } from "../../stores/contentStore";
import { formatTanggal } from "../../utils/formatters";

const router = useRouter();
const store = useAnnouncementAdminStore();
const { toastMessage, toastVariant, showToast } = useToast();

const { searchTerm, items, loading, errorMessage, submit, clearSearch, reload } =
  useSearchableList<Announcement>((search) => store.list(search), {
    fallbackError: "Gagal memuat pengumuman. Coba lagi sebentar lagi.",
  });

// Sama seperti halaman warga: kategori disaring di sini, datanya sudah ada.
const activeCategory = ref<string>(ALL_CATEGORIES);

const visibleItems = computed(() =>
  activeCategory.value === ALL_CATEGORIES
    ? items.value
    : items.value.filter((item) => resolveCategory(item) === activeCategory.value),
);

const isFiltered = computed(
  () => searchTerm.value.trim().length > 0 || activeCategory.value !== ALL_CATEGORIES,
);

/* ================================= HAPUS ================================= */

const deleteTarget = ref<Announcement | null>(null);
const deleting = ref(false);

function closeDeleteDialog() {
  if (!deleting.value) deleteTarget.value = null;
}

async function confirmDelete() {
  const target = deleteTarget.value;
  if (!target || deleting.value) return;

  deleting.value = true;
  try {
    await store.remove(target.id);
    items.value = items.value.filter((item) => item.id !== target.id);
    showToast("Perubahan berhasil disimpan.", "success");
  } catch (error) {
    showToast(resolveAuthError(error, "Perubahan gagal disimpan."), "error");
  } finally {
    deleting.value = false;
    deleteTarget.value = null;
  }
}

/* =============================== NAVIGASI =============================== */

function openDetail(item: Announcement) {
  router.push({ name: "admin-pengumuman-detail", params: { id: item.id } });
}

function openEdit(item: Announcement) {
  router.push({ name: "admin-pengumuman-edit", params: { id: item.id } });
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
    title="Pengumuman"
    back-to="dashboard-admin"
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
    list-class="flex flex-col pb-20"
    @submit="submit"
    @clear="clearSearch"
    @retry="reload"
  >
    <template #filters>
      <FilterChips v-model="activeCategory" :chips="ANNOUNCEMENT_CATEGORIES" />
    </template>

    <AdminAnnouncementItem
      v-for="item in visibleItems"
      :key="item.id"
      :title="item.title"
      :category="resolveCategory(item)"
      :author="item.content.author"
      :date="formatTanggal(item.created_at)"
      :image="item.image_base64 ?? item.image_url ?? ''"
      :busy="deleting && deleteTarget?.id === item.id"
      @open="openDetail(item)"
      @edit="openEdit(item)"
      @delete="deleteTarget = item"
    />
  </ContentListPage>

  <FabButton
    label="Tambah pengumuman"
    @click="router.push({ name: 'admin-pengumuman-tambah' })"
  />

  <BaseDialog
    :open="deleteTarget !== null"
    title="Hapus Pengumuman Ini?"
    message="Pengumuman yang sudah dihapus tidak dapat dikembalikan. Pastikan Anda ingin menghapus pengumuman ini."
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
