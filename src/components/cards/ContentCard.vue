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
    /** Label kecil di atas judul, mis. "Penting". */
    badge?: string;
    /** Chip kategori di bawah judul. */
    tags?: string[];
    /**
     * Mode daftar: teksnya ditampilkan utuh (tidak dipotong) dan tombol
     * aksinya disembunyikan karena isinya sudah kebaca semua.
     */
    expanded?: boolean;
    /** Teks aksi di bawah kartu. */
    actionLabel?: string;
  }>(),
  {
    date: "",
    excerpt: "",
    image: "",
    badge: "",
    tags: () => [],
    expanded: false,
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
      loading="lazy"
      class="aspect-4/3 w-full object-cover"
    />
    <!-- Placeholder selama gambar dari backend belum tersedia. -->
    <div
      v-else
      class="aspect-4/3 w-full bg-linear-to-br from-neutral-200 to-neutral-300"
      aria-hidden="true"
    />

    <div class="flex flex-1 flex-col p-3">
      <div class="flex items-center gap-2">
        <span
          v-if="badge"
          class="rounded-full bg-red-100 px-2 py-0.5 text-body-tiny font-bold text-red-700"
        >
          {{ badge }}
        </span>
        <p class="text-body-tiny text-neutral-400">{{ displayDate }}</p>
      </div>

      <h3
        class="mt-0.5 text-body-sm font-bold text-neutral-900"
        :class="expanded ? '' : 'line-clamp-2'"
      >
        {{ title }}
      </h3>

      <ul v-if="tags.length" class="mt-1.5 flex flex-wrap gap-1.5">
        <li
          v-for="tag in tags"
          :key="tag"
          class="rounded-full bg-primary-100 px-2 py-0.5 text-body-tiny font-medium text-primary-800"
        >
          {{ tag }}
        </li>
      </ul>

      <p
        v-if="excerpt"
        class="mt-1 text-body-sm whitespace-pre-line text-neutral-700"
        :class="expanded ? '' : 'line-clamp-2'"
      >
        {{ excerpt }}
      </p>

      <button
        v-if="!expanded"
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
