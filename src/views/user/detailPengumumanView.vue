<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import AppIcon from "../../components/AppIcon.vue";
import EmptyState from "../../components/EmptyState.vue";
import {
  categoryBadgeClass,
  resolveCategory,
} from "../../constants/announcementCategories";
import { resolveAuthError } from "../../constants/authErrors";
import { useContentStore } from "../../stores/contentStore";
import type { Announcement } from "../../stores/contentStore";
import { formatTanggal } from "../../utils/formatters";

const route = useRoute();
const router = useRouter();
const contentStore = useContentStore();

const announcement = ref<Announcement | null>(null);
const loading = ref(true);
const errorMessage = ref("");

const category = computed(() =>
  announcement.value ? resolveCategory(announcement.value) : "",
);

async function load() {
  loading.value = true;
  errorMessage.value = "";

  try {
    announcement.value = await contentStore.findAnnouncement(
      String(route.params.id),
    );
  } catch (error) {
    errorMessage.value = resolveAuthError(
      error,
      "Gagal memuat pengumuman. Coba lagi sebentar lagi.",
    );
  } finally {
    loading.value = false;
  }
}

onMounted(load);

/**
 * Halaman ini bisa dibuka dari dashboard maupun dari daftar pengumuman, jadi
 * tombol kembali mengikuti riwayat. Kalau tidak ada riwayat (misal aplikasinya
 * dibuka langsung di URL ini), jatuhkan ke daftar pengumuman.
 */
function goBack() {
  if (window.history.state?.back) {
    router.back();
    return;
  }
  router.push({ name: "user-pengumuman" });
}
</script>

<template>
  <main class="mx-auto flex w-full max-w-sm flex-col px-6 pt-safe">
    <header class="pt-6 pb-2">
      <button
        type="button"
        class="-ml-2 flex size-10 cursor-pointer items-center justify-center rounded-full text-neutral-900 transition-colors duration-200 hover:bg-neutral-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
        aria-label="Kembali"
        @click="goBack"
      >
        <svg
          class="size-7"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2.2"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <path d="M20 12H5" />
          <path d="m11 6-6 6 6 6" />
        </svg>
      </button>
    </header>

    <div v-if="loading" class="flex flex-col gap-3 pt-2" aria-hidden="true">
      <div class="h-6 w-24 animate-pulse rounded-full bg-neutral-200" />
      <div class="h-7 w-full animate-pulse rounded-lg bg-neutral-200" />
      <div class="h-7 w-2/3 animate-pulse rounded-lg bg-neutral-200" />
      <div class="mt-2 h-56 w-full animate-pulse rounded-2xl bg-neutral-200" />
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
      v-else-if="!announcement"
      title="Pengumuman tidak ditemukan"
      message="Mungkin sudah dihapus atau belum tersimpan di perangkat ini."
    />

    <article v-else class="pb-6">
      <span
        class="inline-block rounded-full px-2.5 py-0.5 text-body-tiny font-bold"
        :class="categoryBadgeClass(category)"
      >
        {{ category }}
      </span>

      <h1
        class="mt-2 text-h5 leading-tight font-extrabold text-neutral-900"
      >
        {{ announcement.title }}
      </h1>

      <div class="mt-3 flex items-center gap-2">
        <AppIcon name="account" class="size-7 text-neutral-900" />
        <p class="text-body-sm font-bold text-neutral-900">
          {{ announcement.content.author || "Admin" }}
        </p>
        <p class="text-body-sm text-neutral-500">
          {{ formatTanggal(announcement.created_at) }}
        </p>
      </div>

      <img
        v-if="announcement.image_base64 || announcement.image_url"
        :src="announcement.image_base64 ?? announcement.image_url ?? ''"
        :alt="announcement.title"
        class="mt-4 w-full rounded-2xl object-cover"
      />

      <!-- Teksnya satu blok dari backend; whitespace-pre-line dipakai supaya
           enter antar paragraf dari admin tetap kelihatan. -->
      <p
        class="mt-4 text-body-sm whitespace-pre-line text-justify text-neutral-800"
      >
        {{ announcement.content.text }}
      </p>
    </article>
  </main>
</template>
