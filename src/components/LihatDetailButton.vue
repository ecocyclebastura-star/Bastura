<script setup lang="ts">
defineEmits<{ click: [] }>();
</script>

<template>
  <!-- Tautan "Lihat Detail >" kuning di kaki kartu setoran & alokasi. -->
  <button
    type="button"
    class="-mx-1 flex cursor-pointer items-center gap-1 rounded-lg px-1 py-1 text-body-sm font-bold text-yellow-600 transition-colors duration-200 hover:text-yellow-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-yellow-500"
    @click="$emit('click')"
  >
    <slot>Lihat Detail</slot>
    <svg
      class="size-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2.5"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <path d="m9 6 6 6-6 6" />
    </svg>
  </button>
</template>
