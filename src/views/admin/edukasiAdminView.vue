<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import AdminAnnouncementItem from "../../components/AdminAnnouncementItem.vue";
import AlertToast from "../../components/AlertToast.vue";
import BaseButton from "../../components/BaseButton.vue";
import BaseDialog from "../../components/BaseDialog.vue";
import EmptyState from "../../components/EmptyState.vue";
import FabButton from "../../components/FabButton.vue";
import PageHeader from "../../components/PageHeader.vue";
import { resolveAuthError } from "../../constants/authErrors";
import { useToast } from "../../composables/useToast";
import { educationAuthor, useEducationAdminStore } from "../../stores/educationAdminStore";
import type { Education } from "../../stores/contentStore";
import { formatTanggal } from "../../utils/formatters";

const router = useRouter();
const store = useEducationAdminStore();
const { toastMessage, toastVariant, showToast } = useToast();

const items = ref<Education[]>([]);
const loading = ref(true);
const errorMessage = ref("");

/** Kartu besar di atas: materi terbaru (daftar dari backend sudah urut terbaru). */
const featured = computed(() => items.value[0] ?? null);

const imageOf = (item: Education) => item.image_base64 ?? item.image_url ?? "";

async function load() {
  loading.value = true;
  errorMessage.value = "";

  try {
    items.value = await store.list();
  } catch (error) {
    errorMessage.value = resolveAuthError(
      error,
      "Gagal memuat materi edukasi. Coba lagi sebentar lagi.",
    );
  } finally {
    loading.value = false;
  }
}

/* ================================= HAPUS ================================= */

const deleteTarget = ref<Education | null>(null);
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

function openDetail(item: Education) {
  router.push({ name: "admin-edukasi-detail", params: { id: item.id } });
}

function openEdit(item: Education) {
  router.push({ name: "admin-edukasi-edit", params: { id: item.id } });
}

onMounted(() => {
  load();
  // Titipan dari form Tambah/Edit.
  const flash = store.takeFlash();
  if (flash.message) showToast(flash.message, flash.variant);
});
</script>

<template>
  <main class="mx-auto flex w-full max-w-sm flex-col gap-4 px-6 pt-safe">
    <PageHeader title="Edukasi Sampah" fallback="dashboard-admin" />

    <div v-if="loading" class="flex flex-col gap-4" aria-hidden="true">
      <div class="aspect-3/2 w-full animate-pulse rounded-2xl bg-neutral-200" />
      <div v-for="n in 3" :key="n" class="h-28 animate-pulse rounded-2xl bg-neutral-200" />
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
        @click="load"
      >
        Coba Lagi
      </button>
    </div>

    <EmptyState
      v-else-if="!featured"
      title="Belum ada materi edukasi"
      message="Tambahkan materi pertama lewat tombol tambah di bawah."
    />

    <template v-else>
      <!-- Sorotan: materi terbaru dengan judul di atas fotonya. -->
      <button
        type="button"
        class="relative aspect-3/2 w-full cursor-pointer overflow-hidden rounded-2xl bg-neutral-300 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
        @click="openDetail(featured)"
      >
        <img
          v-if="imageOf(featured)"
          :src="imageOf(featured)"
          alt=""
          class="absolute inset-0 size-full object-cover"
        />
        <span
          class="absolute inset-0 bg-linear-to-t from-neutral-900/80 via-neutral-900/20 to-transparent"
          aria-hidden="true"
        />
        <span
          class="absolute inset-x-5 bottom-5 line-clamp-3 text-body-md leading-snug font-extrabold text-white"
        >
          {{ featured.title }}
        </span>
      </button>

      <section class="pb-20">
        <h2
          class="border-b-2 border-neutral-300 pb-1 text-body-md font-extrabold text-neutral-900"
        >
          Untukmu
        </h2>

        <AdminAnnouncementItem
          v-for="item in items"
          :key="item.id"
          noun="edukasi"
          :title="item.title"
          :author="educationAuthor(item)"
          :date="formatTanggal(item.created_at)"
          :image="imageOf(item)"
          :busy="deleting && deleteTarget?.id === item.id"
          @open="openDetail(item)"
          @edit="openEdit(item)"
          @delete="deleteTarget = item"
        />
      </section>
    </template>
  </main>

  <FabButton label="Tambah edukasi" @click="router.push({ name: 'admin-edukasi-tambah' })" />

  <BaseDialog
    :open="deleteTarget !== null"
    title="Hapus Edukasi Ini?"
    message="Artikel edukasi yang sudah dihapus tidak dapat dikembalikan. Pastikan Anda ingin menghapus artikel ini."
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
