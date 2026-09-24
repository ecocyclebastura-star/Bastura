<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import AlertToast from "../../components/AlertToast.vue";
import AppIcon from "../../components/AppIcon.vue";
import BaseButton from "../../components/BaseButton.vue";
import BaseDialog from "../../components/BaseDialog.vue";
import EmptyState from "../../components/EmptyState.vue";
import FabButton from "../../components/FabButton.vue";
import FilterChips from "../../components/FilterChips.vue";
import SearchBar from "../../components/SearchBar.vue";
import SetoranInfoSheet from "../../components/SetoranInfoSheet.vue";
import SetoranCard from "../../components/cards/SetoranCard.vue";
import { resolveAuthError } from "../../constants/authErrors";
import { SETORAN_FILTERS, resolveSetoranStage } from "../../constants/setoran";
import { useSearchableList } from "../../composables/useSearchableList";
import { useToast } from "../../composables/useToast";
import { useSetoranStore } from "../../stores/setoranStore";
import type { Setoran } from "../../stores/setoranStore";

const router = useRouter();
const setoranStore = useSetoranStore();
const { toastMessage, toastVariant, showToast } = useToast();

const { searchTerm, items, loading, errorMessage, submit, clearSearch, reload } =
  useSearchableList<Setoran>((search) => setoranStore.list(search), {
    fallbackError: "Gagal memuat data setoran. Coba lagi sebentar lagi.",
  });

/* ================================ FILTER ================================ */

/**
 * Command-nya mengembalikan semua status sekaligus, jadi chip cukup menyaring
 * di sini tanpa bolak-balik ke backend. Pilihannya disimpan di store supaya
 * tetap sama waktu admin balik dari form.
 */
const activeFilter = computed({
  get: () => setoranStore.activeFilter,
  set: (value: string) => (setoranStore.activeFilter = value),
});

const visibleItems = computed(() =>
  activeFilter.value
    ? items.value.filter((item) => resolveSetoranStage(item.status) === activeFilter.value)
    : items.value,
);

const isSearching = computed(() => searchTerm.value.trim().length > 0);

const emptyCopy = computed(() => {
  if (isSearching.value) {
    return {
      title: "Setoran tidak ditemukan",
      message: "Coba periksa lagi ejaan nama warganya.",
    };
  }
  if (activeFilter.value === "proses") {
    return {
      title: "Tidak ada setoran yang diproses",
      message: "Semua setoran warga sudah selesai dibagikan hasilnya.",
    };
  }
  if (activeFilter.value === "selesai") {
    return {
      title: "Belum ada setoran selesai",
      message: "Setoran yang hasil penjualannya sudah dibagikan akan tampil di sini.",
    };
  }
  return {
    title: "Belum ada setoran",
    message: "Tekan tombol + untuk mencatat setoran sampah warga.",
  };
});

/* ================================ DETAIL ================================ */

const detailItem = ref<Setoran | null>(null);

/* ================================= HAPUS ================================= */

const deleteTarget = ref<Setoran | null>(null);
const deleting = ref(false);

function closeDeleteDialog() {
  if (!deleting.value) deleteTarget.value = null;
}

async function confirmDelete() {
  const target = deleteTarget.value;
  if (!target || deleting.value) return;

  deleting.value = true;
  try {
    await setoranStore.remove(target.id_setoran);
    items.value = items.value.filter((item) => item.id_setoran !== target.id_setoran);
    showToast("Perubahan berhasil disimpan.", "success");
  } catch (error) {
    showToast(resolveAuthError(error, "Perubahan gagal disimpan."), "error");
  } finally {
    deleting.value = false;
    deleteTarget.value = null;
  }
}

/* =============================== NAVIGASI =============================== */

function openEdit(item: Setoran) {
  router.push({ name: "admin-setoran-edit", params: { id: item.id_setoran } });
}

onMounted(() => {
  // Titipan dari form setoran atau alur bagi hasil.
  const flash = setoranStore.takeFlash();
  if (flash.message) showToast(flash.message, flash.variant);
});
</script>

<template>
  <main class="mx-auto flex w-full max-w-sm flex-col gap-4 px-6 pt-safe">
    <h1 class="pt-6 text-h4 font-extrabold text-neutral-900">Setoran</h1>

    <!-- Pintu masuk bagi hasil penjualan ke warga. -->
    <section class="rounded-2xl border border-primary-500 bg-primary-100 px-4 pt-5 pb-4">
      <div class="flex items-center gap-4">
        <span
          class="flex size-12 shrink-0 items-center justify-center rounded-xl border border-secondary-400 bg-primary-500 text-secondary-200"
          aria-hidden="true"
        >
          <AppIcon name="penarikan" class="size-10" />
        </span>
        <p class="text-body-reg text-neutral-900">
          Bagikan hasil penjualan sampah kepada warga berdasarkan dari setoran mereka.
        </p>
      </div>

      <BaseButton
        class="mx-auto mt-3 w-4/5 border border-primary-500"
        label="Mulai Pembagian"
        rounded="xl"
        :block="false"
        @click="router.push({ name: 'admin-setoran-bagi-hasil' })"
      />
    </section>

    <SearchBar
      v-model="searchTerm"
      placeholder="Cari nama warga"
      label="Cari nama warga"
      :loading="loading"
      @submit="submit"
      @clear="clearSearch"
    />

    <FilterChips v-model="activeFilter" :chips="SETORAN_FILTERS" />

    <div v-if="loading" class="flex flex-col gap-4" aria-hidden="true">
      <div
        v-for="n in 3"
        :key="n"
        class="h-36 animate-pulse rounded-2xl bg-neutral-200"
      />
    </div>

    <div
      v-else-if="errorMessage"
      class="rounded-2xl border border-red-200 bg-red-50 p-4"
      role="alert"
    >
      <p class="text-body-sm text-red-700">{{ errorMessage }}</p>
      <button
        type="button"
        class="mt-3 cursor-pointer rounded-full bg-red-600 px-4 py-2 text-body-sm font-bold text-white transition-colors duration-200 hover:bg-red-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
        @click="reload"
      >
        Coba Lagi
      </button>
    </div>

    <EmptyState
      v-else-if="visibleItems.length === 0"
      :title="emptyCopy.title"
      :message="emptyCopy.message"
    />

    <!-- pb-20 supaya kartu terakhir tidak tertutup tombol tambah. -->
    <div v-else class="flex flex-col gap-4 pb-20">
      <SetoranCard
        v-for="item in visibleItems"
        :key="item.id_setoran"
        :setoran="item"
        :busy="deleting && deleteTarget?.id_setoran === item.id_setoran"
        @detail="detailItem = item"
        @edit="openEdit(item)"
        @delete="deleteTarget = item"
      />
    </div>

    <FabButton
      label="Tambah setoran"
      @click="router.push({ name: 'admin-setoran-tambah' })"
    />

    <SetoranInfoSheet :setoran="detailItem" @close="detailItem = null" />

    <BaseDialog
      :open="deleteTarget !== null"
      title="Hapus Setoran Ini?"
      message="Data setoran ini akan dihapus dan tidak bisa dikembalikan. Pastikan data yang dipilih sudah sesuai."
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
  </main>
</template>
