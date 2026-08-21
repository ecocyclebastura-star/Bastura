<script setup lang="ts">
import { computed } from "vue";

const props = withDefaults(
  defineProps<{
    title: string;
    /** Tanggal siap tampil, mis. "18 Juli 2026". Kosong = placeholder. */
    date?: string;
    excerpt?: string;
    /** URL gambar. Kalau kosong dipakai placeholder abu-abu. */
    image?: string;
    /** Teks aksi di bawah kartu. */
    actionLabel?: string;
  }>(),
  {
    date: "",
    excerpt: "",
    image: "",
    actionLabel: "Baca Selengkapnya",
  },
);

defineEmits<{ open: [] }>();

// Backend belum ada, jadi tanggal kosong tetap punya bentuk yang sama.
const displayDate = computed(() => props.date || "dd mm yyyy");
</script>

<template>
  <article
    class="flex flex-col overflow-hidden rounded-2xl bg-white shadow-[0_4px_16px_-6px_rgba(28,28,26,0.25)]"
  >
    <img
      v-if="image"
      :src="image"
      :alt="title"
      class="aspect-4/3 w-full object-cover"
    />
    <!-- Placeholder selama gambar dari backend belum tersedia. -->
    <div
      v-else
      class="aspect-4/3 w-full bg-linear-to-br from-neutral-200 to-neutral-300"
      aria-hidden="true"
    />

    <div class="flex flex-1 flex-col p-3">
      <p class="text-body-tiny text-neutral-400">{{ displayDate }}</p>

      <h3 class="mt-0.5 line-clamp-2 text-body-sm font-bold text-neutral-900">
        {{ title }}
      </h3>

      <p v-if="excerpt" class="mt-1 line-clamp-2 text-body-sm text-neutral-700">
        {{ excerpt }}
      </p>

      <button
        type="button"
        class="mt-3 inline-flex cursor-pointer items-center gap-1.5 self-start text-body-sm font-medium text-primary-500 transition-colors duration-200 hover:text-primary-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
        @click="$emit('open')"
      >
        {{ actionLabel }}
        <svg
          class="size-4"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2.2"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <path d="M4 12h15" />
          <path d="m13 6 6 6-6 6" />
        </svg>
      </button>
    </div>
  </article>
</template>
