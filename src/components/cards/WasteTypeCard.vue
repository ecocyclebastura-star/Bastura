<script setup lang="ts">
import { computed } from "vue";
import { formatHargaSatuan } from "../../constants/wasteCatalog";

const props = withDefaults(
  defineProps<{
    name: string | null;
    /** Harga per satuan dari backend; null kalau belum diisi. */
    price?: number | null;
    /** Satuan harga, mis. "kg". */
    unit?: string | null;
    /** Data URI gambar. Kalau kosong dipakai placeholder abu-abu. */
    image?: string;
  }>(),
  { price: null, unit: null, image: "" },
);

defineEmits<{ open: [] }>();

const displayName = computed(() => props.name?.trim() || "Tanpa nama");
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
      :alt="displayName"
      loading="lazy"
      class="aspect-4/3 w-full object-cover"
    />
    <!-- Placeholder buat item yang belum punya gambar di server. -->
    <div
      v-else
      class="aspect-4/3 w-full bg-linear-to-br from-neutral-200 to-neutral-300"
      aria-hidden="true"
    />

    <div class="flex flex-1 flex-col p-3">
      <h3 class="text-body-sm leading-tight font-bold text-neutral-900">
        {{ displayName }}
      </h3>

      <!-- mt-auto: harga selalu menempel di dasar kartu, jadi baris harga
           tetap sejajar walaupun nama barangnya beda-beda panjangnya. -->
      <p class="mt-auto pt-2 text-body-tiny text-neutral-400">Estimasi harga</p>
      <p class="text-right text-body-sm font-bold text-primary-600">
        {{ formatHargaSatuan(price, unit) }}
      </p>
    </div>
  </button>
</template>
