<script setup lang="ts">
import AppIcon from "./AppIcon.vue";

defineProps<{
  open: boolean;
  /**
   * Tombol hapus cuma aktif buat membatalkan foto yang baru dipilih tapi
   * belum disimpan. Menghapus avatar yang sudah ada di server belum bisa,
   * backend-nya belum punya command untuk itu.
   */
  canRemove?: boolean;
}>();

const emit = defineEmits<{ close: []; pick: []; remove: [] }>();
</script>

<template>
  <Transition
    enter-active-class="transition duration-200 ease-out"
    enter-from-class="opacity-0"
    leave-active-class="transition duration-150 ease-in"
    leave-to-class="opacity-0"
  >
    <div
      v-if="open"
      class="fixed inset-0 z-50 flex items-end justify-center bg-neutral-900/50"
      role="dialog"
      aria-modal="true"
      aria-label="Foto Profil"
      @click.self="emit('close')"
    >
      <div
        class="mx-auto mb-4 w-full max-w-sm rounded-3xl bg-neutral-600/95 px-4 pt-3 pb-4 text-white backdrop-blur-sm"
      >
        <header class="flex items-center gap-3">
          <button
            type="button"
            class="flex size-9 cursor-pointer items-center justify-center rounded-full transition-colors duration-200 hover:bg-white/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
            aria-label="Tutup"
            @click="emit('close')"
          >
            <svg
              class="size-6"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2.2"
              stroke-linecap="round"
              aria-hidden="true"
            >
              <path d="m6 6 12 12M18 6 6 18" />
            </svg>
          </button>

          <h2 class="flex-1 text-center text-body-md font-bold">Foto Profil</h2>

          <button
            type="button"
            class="flex size-9 cursor-pointer items-center justify-center rounded-full transition-colors duration-200 hover:bg-white/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-white disabled:cursor-not-allowed disabled:opacity-40"
            :disabled="!canRemove"
            aria-label="Hapus foto yang dipilih"
            @click="emit('remove')"
          >
            <AppIcon name="trash" class="size-6" />
          </button>
        </header>

        <button
          type="button"
          class="mt-3 flex w-full cursor-pointer items-center gap-3 rounded-2xl px-2 py-3 text-left transition-colors duration-200 hover:bg-white/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
          @click="emit('pick')"
        >
          <AppIcon name="gallery" class="size-7" />

          <span class="flex-1 text-body-reg font-medium">Pilih dari galeri</span>

          <svg
            class="size-5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.4"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <path d="m9 6 6 6-6 6" />
          </svg>
        </button>
      </div>
    </div>
  </Transition>
</template>
