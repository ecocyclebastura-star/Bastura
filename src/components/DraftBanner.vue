<script setup lang="ts">
defineEmits<{ discard: [] }>();
</script>

<template>
  <!-- Penanda form Tambah sedang melanjutkan draf yang tersimpan di perangkat. -->
  <div
    class="flex items-center gap-3 rounded-2xl border border-primary-300 bg-primary-100 px-4 py-2.5"
    role="status"
  >
    <p class="flex-1 text-body-sm text-primary-800">Melanjutkan draf terakhir.</p>
    <button
      type="button"
      class="cursor-pointer rounded-full px-3 py-1 text-body-sm font-bold text-orange-600 transition-colors duration-200 hover:bg-orange-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
      @click="$emit('discard')"
    >
      Buang draf
    </button>
  </div>
</template>
