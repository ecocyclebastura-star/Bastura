<script setup lang="ts">
import { computed } from "vue";
import AppIcon from "../AppIcon.vue";
import { formatTanggalLengkap } from "../../utils/formatters";

const props = withDefaults(
  defineProps<{
    /** "yyyy-mm-dd". Kosong berarti admin belum pernah mengatur jadwal. */
    date?: string;
    /** "HH:mm" waktu WITA. */
    time?: string;
    /** Sisa hari menuju jadwal; null kalau belum diatur. */
    daysLeft?: number | null;
  }>(),
  { date: "", time: "", daysLeft: null },
);

defineEmits<{ edit: [] }>();

// Placeholder-nya sengaja mirip format aslinya, biar bentuk kartunya tetap
// kebaca walau jadwalnya belum pernah diisi.
const tanggalLabel = computed(
  () => formatTanggalLengkap(props.date) || "Hari, dd mm yyyy",
);
const jamLabel = computed(() => `${props.time || "00:00"} WITA`);
</script>

<template>
  <!-- scheme-4: pasangan hijau tua bg/fg dari style guide (lihat style.css). -->
  <section class="scheme-4 rounded-3xl bg-scheme-bg px-4 py-4 text-white">
    <header class="flex items-center gap-2">
      <AppIcon name="truck" class="size-8 shrink-0 text-secondary-300" />

      <h2 class="min-w-0 truncate text-body-reg font-extrabold">
        Jadwal Setor Sampah
      </h2>

      <p class="shrink-0 text-body-sm font-medium whitespace-nowrap text-primary-400">
        {{ daysLeft ?? 0 }} hari lagi
      </p>
    </header>

    <div class="mt-3 flex items-center gap-3 rounded-2xl bg-scheme-fg px-4 py-3">
      <div class="min-w-0 flex-1">
        <p class="truncate text-body-reg leading-tight font-bold">
          {{ tanggalLabel }}
        </p>
        <p class="text-body-sm leading-tight text-neutral-200">{{ jamLabel }}</p>
      </div>

      <button
        type="button"
        class="shrink-0 cursor-pointer rounded-full bg-sky-400 px-5 py-1.5 text-body-reg font-semibold text-white transition-colors duration-200 hover:bg-sky-500 active:bg-sky-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
        @click="$emit('edit')"
      >
        Edit
      </button>
    </div>
  </section>
</template>
