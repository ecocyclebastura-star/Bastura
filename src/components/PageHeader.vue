<script setup lang="ts">
import { useRouter } from "vue-router";

const props = withDefaults(
  defineProps<{
    /** Judul di tengah header. Kosong = cuma tombol kembali. */
    title?: string;
    /** Rute tujuan kalau tidak ada riwayat, mis. saat halaman dibuka via URL. */
    fallback?: string;
  }>(),
  { title: "", fallback: "dashboard-user" },
);

const router = useRouter();

function goBack() {
  if (window.history.state?.back) {
    router.back();
    return;
  }
  router.push({ name: props.fallback });
}
</script>

<template>
  <!-- Tombol dilepas dari alur (absolute) supaya judulnya benar-benar di
       tengah halaman, bukan di tengah sisa ruang setelah tombol. -->
  <header class="relative flex items-center justify-center pt-6 pb-1">
    <button
      type="button"
      class="absolute left-0 flex size-10 cursor-pointer items-center justify-center rounded-full text-neutral-900 transition-colors duration-200 hover:bg-neutral-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
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
        <path d="M20 12H4" />
        <path d="m10 6-6 6 6 6" />
      </svg>
    </button>

    <h1 v-if="title" class="text-h5 font-extrabold text-neutral-900">
      {{ title }}
    </h1>
    <!-- Tanpa judul header tetap perlu tinggi, karena tombolnya absolute. -->
    <span v-else class="h-10" aria-hidden="true" />
  </header>
</template>
