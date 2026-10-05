<script setup lang="ts">
import { computed } from "vue";
import { formatHargaSatuan } from "../../constants/wasteCatalog";

/**
 * Kartu jenis sampah di halaman kelola admin: sama dengan WasteTypeCard versi
 * warga, ditambah tombol Hapus & Edit.
 *
 * Tombol tidak boleh bersarang di dalam tombol, jadi dipakai pola "stretched
 * link" seperti AdminAnnouncementItem: nama barang jadi tombol buka detail
 * yang area klik-nya (::after) dibentangkan sepenuh kartu, lalu Hapus & Edit
 * diangkat ke atasnya lewat `relative z-10`.
 */
const props = withDefaults(
  defineProps<{
    name: string | null;
    price?: number | null;
    unit?: string | null;
    /** Data URI gambar. Kalau kosong dipakai placeholder abu-abu. */
    image?: string;
    /** Kunci tombol selama item ini sedang dihapus. */
    busy?: boolean;
  }>(),
  { price: null, unit: null, image: "", busy: false },
);

defineEmits<{ open: []; edit: []; delete: [] }>();

const displayName = computed(() => props.name?.trim() || "Tanpa nama");

const actionClass =
  "relative z-10 flex-1 cursor-pointer rounded-full py-1 text-body-tiny font-semibold text-white transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 disabled:pointer-events-none disabled:opacity-50";
</script>

<template>
  <article
    class="relative flex flex-col overflow-hidden rounded-2xl bg-white shadow-[0_4px_16px_-6px_rgba(28,28,26,0.25)] transition-shadow duration-200 has-[.open-link:hover]:shadow-[0_6px_20px_-6px_rgba(28,28,26,0.35)]"
  >
    <img
      v-if="image"
      :src="image"
      :alt="displayName"
      loading="lazy"
      class="aspect-4/3 w-full object-cover"
    />
    <div
      v-else
      class="aspect-4/3 w-full bg-linear-to-br from-neutral-200 to-neutral-300"
      aria-hidden="true"
    />

    <div class="flex flex-1 flex-col p-3">
      <h3 class="text-body-sm leading-tight font-bold text-neutral-900">
        <button
          type="button"
          class="open-link cursor-pointer text-left after:absolute after:inset-0 after:content-[''] focus:outline-none focus-visible:after:rounded-2xl focus-visible:after:ring-2 focus-visible:after:ring-primary-500"
          @click="$emit('open')"
        >
          {{ displayName }}
        </button>
      </h3>

      <!-- mt-auto: baris harga & tombol selalu menempel di dasar kartu. -->
      <div class="mt-auto flex flex-wrap items-baseline justify-between gap-x-1 pt-2">
        <p class="text-body-tiny text-neutral-400">Estimasi harga</p>
        <p class="text-body-sm font-bold text-primary-700">
          {{ formatHargaSatuan(price, unit) }}
        </p>
      </div>

      <div class="mt-1.5 flex gap-3">
        <button
          type="button"
          :class="[actionClass, 'bg-orange-500 hover:bg-orange-600 focus-visible:ring-orange-500']"
          :aria-label="`Hapus ${displayName}`"
          :disabled="busy"
          @click="$emit('delete')"
        >
          Hapus
        </button>
        <button
          type="button"
          :class="[actionClass, 'bg-sky-400 hover:bg-sky-500 focus-visible:ring-sky-500']"
          :aria-label="`Edit ${displayName}`"
          :disabled="busy"
          @click="$emit('edit')"
        >
          Edit
        </button>
      </div>
    </div>
  </article>
</template>
