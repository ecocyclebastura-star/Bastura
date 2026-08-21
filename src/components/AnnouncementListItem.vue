<script setup lang="ts">
import { computed } from "vue";
import { categoryBadgeClass } from "../constants/announcementCategories";

const props = withDefaults(
  defineProps<{
    title: string;
    category: string;
    author?: string;
    /** Tanggal siap tampil, mis. "18 Juli 2026". */
    date?: string;
    /** URL gambar. Kalau kosong dipakai kotak abu-abu. */
    image?: string;
  }>(),
  { author: "", date: "", image: "" },
);

defineEmits<{ open: [] }>();

const displayAuthor = computed(() => props.author || "Admin");
const displayDate = computed(() => props.date || "dd mm yyyy");
const badgeClass = computed(() => categoryBadgeClass(props.category));
</script>

<template>
  <article class="border-b border-neutral-200">
    <!-- Seluruh baris dibikin satu tombol supaya area sentuhnya lebar,
         bukan cuma di judulnya. -->
    <button
      type="button"
      class="flex w-full cursor-pointer items-start gap-3 py-4 text-left transition-colors duration-200 hover:bg-neutral-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
      @click="$emit('open')"
    >
      <div class="min-w-0 flex-1">
        <span
          class="inline-block rounded-full px-2.5 py-0.5 text-body-tiny font-bold"
          :class="badgeClass"
        >
          {{ category }}
        </span>

        <h3
          class="mt-1.5 line-clamp-2 text-body-md leading-tight font-extrabold text-neutral-900"
        >
          {{ title }}
        </h3>

        <p class="mt-1.5 flex flex-wrap gap-x-3 text-body-tiny text-neutral-500">
          <span>{{ displayAuthor }}</span>
          <span>{{ displayDate }}</span>
        </p>
      </div>

      <img
        v-if="image"
        :src="image"
        :alt="title"
        loading="lazy"
        class="size-24 shrink-0 rounded-xl object-cover"
      />
      <div
        v-else
        class="size-24 shrink-0 rounded-xl bg-neutral-200"
        aria-hidden="true"
      />
    </button>
  </article>
</template>
