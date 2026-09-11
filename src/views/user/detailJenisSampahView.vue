<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useRoute } from "vue-router";
import EmptyState from "../../components/EmptyState.vue";
import PageHeader from "../../components/PageHeader.vue";
import { resolveAuthError } from "../../constants/authErrors";
import {
  formatHargaSatuan,
  resolveWasteCategory,
} from "../../constants/wasteCatalog";
import { useWasteStore } from "../../stores/wasteStore";
import type { CatalogItem } from "../../stores/wasteStore";

const route = useRoute();
const wasteStore = useWasteStore();

const item = ref<CatalogItem | null>(null);
const loading = ref(true);
const errorMessage = ref("");

const displayName = computed(() => item.value?.name?.trim() || "Tanpa nama");
const image = computed(() => item.value?.image_base64 ?? "");

async function load() {
  loading.value = true;
  errorMessage.value = "";

  try {
    item.value = await wasteStore.findCatalogItem(String(route.params.id));
  } catch (error) {
    errorMessage.value = resolveAuthError(
      error,
      "Gagal memuat detail jenis sampah. Coba lagi sebentar lagi.",
    );
  } finally {
    loading.value = false;
  }
}

onMounted(load);
</script>

<template>
  <!-- min-h dikurangi 7rem, setinggi pb-28 di UserLayout, supaya kartu harga
       yang didorong mt-auto berhenti pas di atas bottom nav -- bukan
       ketutupan olehnya. -->
  <main
    class="mx-auto flex min-h-[calc(100dvh-7rem)] w-full max-w-sm flex-col px-6 pt-safe"
  >
    <PageHeader title="Detail" fallback="user-jenis-sampah" />

    <div v-if="loading" class="flex flex-col gap-3 pt-2" aria-hidden="true">
      <div class="aspect-16/9 w-full animate-pulse rounded-2xl bg-neutral-200" />
      <div class="h-7 w-2/3 animate-pulse rounded-lg bg-neutral-200" />
      <div class="h-5 w-24 animate-pulse rounded-lg bg-neutral-200" />
      <div class="mt-2 h-20 w-full animate-pulse rounded-lg bg-neutral-200" />
    </div>

    <div
      v-else-if="errorMessage"
      class="mt-2 rounded-2xl border border-red-200 bg-red-50 p-4"
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
      v-else-if="!item"
      title="Jenis sampah tidak ditemukan"
      message="Mungkin sudah dihapus atau belum tersimpan di perangkat ini."
    />

    <template v-else>
      <img
        v-if="image"
        :src="image"
        :alt="displayName"
        class="mt-4 aspect-16/9 w-full rounded-2xl object-cover"
      />
      <!-- Placeholder buat item yang belum punya gambar di server. -->
      <div
        v-else
        class="mt-4 aspect-16/9 w-full rounded-2xl bg-linear-to-br from-neutral-200 to-neutral-300"
        aria-hidden="true"
      />

      <h1 class="mt-4 text-h5 leading-tight font-extrabold text-neutral-900">
        {{ displayName }}
      </h1>
      <p class="text-body-reg text-neutral-500">
        {{ resolveWasteCategory(item.category_name) }}
      </p>

      <h2 class="mt-4 text-body-reg font-bold text-neutral-900">Deskripsi</h2>

      <p
        v-if="item.description"
        class="mt-1 text-body-sm whitespace-pre-line text-neutral-700"
      >
        {{ item.description }}
      </p>
      <p v-else class="mt-1 text-body-sm text-neutral-400">
        Deskripsi untuk jenis sampah ini belum tersedia.
      </p>

      <!-- mt-auto: kartu harga turun ke dasar layar waktu isinya masih
           pendek, sesuai desain. -->
      <div
        class="mt-auto -mx-6 rounded-t-3xl border-t border-neutral-200 bg-white px-6 py-4 shadow-[0_-4px_16px_-8px_rgba(28,28,26,0.25)]"
      >
        <div class="flex items-center justify-between gap-3">
          <p class="text-body-reg text-neutral-500">Estimasi harga</p>
          <p class="text-h5 font-extrabold text-neutral-900">
            {{ formatHargaSatuan(item.price, item.unit) }}
          </p>
        </div>
      </div>
    </template>
  </main>
</template>
