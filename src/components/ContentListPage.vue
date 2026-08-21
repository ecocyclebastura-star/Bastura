<script setup lang="ts">
import { RouterLink } from "vue-router";
import EmptyState from "./EmptyState.vue";
import SearchBar from "./SearchBar.vue";

withDefaults(
  defineProps<{
    title: string;
    searchPlaceholder?: string;
    searchLabel?: string;
    loading?: boolean;
    errorMessage?: string;
    /** true kalau tidak ada satu pun item yang bisa ditampilkan. */
    empty?: boolean;
    /** Judul & pesan waktu daftarnya memang kosong dari sananya. */
    emptyTitle?: string;
    emptyMessage?: string;
    /** Judul & pesan waktu kosongnya gara-gara pencarian atau filter. */
    emptyFilteredTitle?: string;
    emptyFilteredMessage?: string;
    /** true kalau pencarian atau filternya sedang aktif. */
    filtered?: boolean;
    /** Kelas pembungkus daftar; dipakai buat mengatur jarak antar item. */
    listClass?: string;
  }>(),
  {
    searchPlaceholder: "Cari...",
    searchLabel: "Cari",
    loading: false,
    errorMessage: "",
    empty: false,
    emptyTitle: "Belum ada konten",
    emptyMessage: "Belum ada informasi terbaru untuk saat ini.",
    emptyFilteredTitle: "Tidak ada hasil",
    emptyFilteredMessage: "Coba ubah kata kunci atau filternya.",
    filtered: false,
    listClass: "flex flex-col",
  },
);

const search = defineModel<string>("search", { default: "" });

const emit = defineEmits<{ submit: []; clear: []; retry: [] }>();
</script>

<template>
  <main class="mx-auto flex w-full max-w-sm flex-col gap-4 px-6 pt-safe">
    <!-- Tombol kembali dilepas dari alur biar judulnya benar-benar di tengah
         halaman, bukan di tengah sisa ruang setelah tombol. -->
    <header class="relative flex items-center justify-center pt-6 pb-1">
      <RouterLink
        :to="{ name: 'dashboard-user' }"
        class="absolute left-0 flex size-10 items-center justify-center rounded-full text-neutral-900 transition-colors duration-200 hover:bg-neutral-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
        aria-label="Kembali ke beranda"
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
      </RouterLink>

      <h1 class="text-h5 font-extrabold text-neutral-900">{{ title }}</h1>
    </header>

    <SearchBar
      v-model="search"
      :placeholder="searchPlaceholder"
      :label="searchLabel"
      :loading="loading"
      @submit="emit('submit')"
      @clear="emit('clear')"
    />

    <slot name="filters" />

    <!-- Skeleton dipakai supaya tinggi halaman tidak lompat waktu hasil
         pencarian baru masuk. -->
    <div v-if="loading" class="flex flex-col gap-4" aria-hidden="true">
      <div
        v-for="n in 3"
        :key="n"
        class="h-28 animate-pulse rounded-2xl bg-neutral-200"
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
        @click="emit('retry')"
      >
        Coba Lagi
      </button>
    </div>

    <EmptyState
      v-else-if="empty"
      :title="filtered ? emptyFilteredTitle : emptyTitle"
      :message="filtered ? emptyFilteredMessage : emptyMessage"
    />

    <div v-else class="pb-4" :class="listClass">
      <slot />
    </div>
  </main>
</template>
