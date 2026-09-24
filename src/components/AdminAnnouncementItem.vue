<script setup lang="ts">
import { computed } from "vue";
import { categoryBadgeClass } from "../constants/announcementCategories";

/**
 * Baris pengumuman di halaman kelola admin: sama dengan AnnouncementListItem
 * versi warga, ditambah tombol Hapus & Edit.
 *
 * Tombol tidak boleh bersarang di dalam tombol, jadi pola "stretched link"
 * yang dipakai: tombol buka detail membentangkan area klik-nya (::after)
 * sepenuh baris, lalu Hapus & Edit diangkat ke atasnya lewat `relative z-10`.
 */
const props = withDefaults(
  defineProps<{
    title: string;
    category: string;
    author?: string;
    /** Tanggal siap tampil, mis. "18 Juli 2026". */
    date?: string;
    /** URL gambar. Kalau kosong dipakai kotak abu-abu. */
    image?: string;
    /** Kunci tombol selama pengumuman ini sedang dihapus. */
    busy?: boolean;
  }>(),
  { author: "", date: "", image: "", busy: false },
);

defineEmits<{ open: []; edit: []; delete: [] }>();

const displayAuthor = computed(() => props.author || "Admin");
const displayDate = computed(() => props.date || "dd mm yyyy");
const badgeClass = computed(() => categoryBadgeClass(props.category));

const actionClass =
  "relative z-10 w-16 cursor-pointer rounded-full py-0.5 text-body-tiny font-semibold text-white transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 disabled:pointer-events-none disabled:opacity-50";
</script>

<template>
  <article
    class="relative flex items-start gap-3 border-b border-neutral-300 py-4 transition-colors duration-200 has-[.open-link:hover]:bg-neutral-100"
  >
    <div class="min-w-0 flex-1">
      <span
        class="inline-block rounded-full px-2.5 py-0.5 text-body-tiny font-bold"
        :class="badgeClass"
      >
        {{ category }}
      </span>

      <h3 class="mt-1.5 line-clamp-2 text-body-md leading-tight font-extrabold text-neutral-900">
        <button
          type="button"
          class="open-link cursor-pointer text-left after:absolute after:inset-0 after:content-[''] focus:outline-none focus-visible:after:rounded-xl focus-visible:after:ring-2 focus-visible:after:ring-primary-500"
          @click="$emit('open')"
        >
          {{ title }}
        </button>
      </h3>

      <p class="mt-1.5 flex flex-wrap gap-x-6 text-body-tiny text-neutral-700">
        <span>{{ displayAuthor }}</span>
        <span>{{ displayDate }}</span>
      </p>

      <div class="mt-2 flex gap-10">
        <button
          type="button"
          :class="[actionClass, 'bg-orange-500 hover:bg-orange-600 focus-visible:ring-orange-500']"
          :aria-label="`Hapus pengumuman ${title}`"
          :disabled="busy"
          @click="$emit('delete')"
        >
          Hapus
        </button>
        <button
          type="button"
          :class="[actionClass, 'bg-sky-400 hover:bg-sky-500 focus-visible:ring-sky-500']"
          :aria-label="`Edit pengumuman ${title}`"
          :disabled="busy"
          @click="$emit('edit')"
        >
          Edit
        </button>
      </div>
    </div>

    <img
      v-if="image"
      :src="image"
      alt=""
      loading="lazy"
      class="size-24 shrink-0 rounded-xl object-cover"
    />
    <div v-else class="size-24 shrink-0 rounded-xl bg-neutral-200" aria-hidden="true" />
  </article>
</template>
