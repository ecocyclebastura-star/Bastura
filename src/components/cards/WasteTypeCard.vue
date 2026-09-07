<script setup lang="ts">
import { formatHargaPerKg } from "../../constants/wasteTypes";

withDefaults(
  defineProps<{
    name: string;
    /** Harga per kg dari data; null dipakai kalau harganya belum ada. */
    pricePerKg?: number | null;
    /** URL gambar. Kalau kosong dipakai placeholder abu-abu. */
    image?: string;
  }>(),
  { pricePerKg: null, image: "" },
);

defineEmits<{ open: [] }>();
</script>

<template>
  <!-- Seluruh kartu jadi satu tombol supaya area sentuhnya selebar kartunya. -->
  <button
    type="button"
    class="flex cursor-pointer flex-col overflow-hidden rounded-2xl bg-white text-left shadow-[0_4px_16px_-6px_rgba(28,28,26,0.25)] transition-shadow duration-200 hover:shadow-[0_6px_20px_-6px_rgba(28,28,26,0.35)] focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
    @click="$emit('open')"
  >
    <img
      v-if="image"
      :src="image"
      :alt="name"
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
      <h3 class="text-body-sm leading-tight font-bold text-neutral-900">
        {{ name }}
      </h3>

      <!-- mt-auto: harga selalu menempel di dasar kartu, jadi baris harga
           tetap sejajar walaupun nama barangnya beda-beda panjangnya. -->
      <p class="mt-auto pt-2 text-body-tiny text-neutral-400">Estimasi harga</p>
      <p class="text-right text-body-sm font-bold text-primary-600">
        {{ formatHargaPerKg(pricePerKg) }}
      </p>
    </div>
  </button>
</template>
