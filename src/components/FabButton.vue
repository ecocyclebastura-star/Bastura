<script setup lang="ts">
defineProps<{
  /** Dibaca screen reader; tombolnya cuma berisi ikon. */
  label: string;
}>();

defineEmits<{ click: [] }>();
</script>

<template>
  <!-- Dibungkus selebar kolom konten (max-w-sm) supaya tombolnya menempel di
       tepi kanan konten, bukan tepi layar, waktu jendelanya lebar. bottom-28
       menaruhnya tepat di atas bottom navigation yang fixed. -->
  <div
    class="pointer-events-none fixed inset-x-0 bottom-28 z-30 mx-auto flex w-full max-w-sm justify-end px-4 pb-safe"
  >
    <button
      type="button"
      class="pointer-events-auto flex size-16 cursor-pointer items-center justify-center rounded-full bg-primary-700 text-white shadow-lg shadow-primary-900/30 transition duration-200 hover:bg-primary-800 active:scale-95 active:bg-primary-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
      :aria-label="label"
      @click="$emit('click')"
    >
      <svg
        class="size-9"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="3"
        stroke-linecap="round"
        aria-hidden="true"
      >
        <path d="M12 5v14M5 12h14" />
      </svg>
    </button>
  </div>
</template>
