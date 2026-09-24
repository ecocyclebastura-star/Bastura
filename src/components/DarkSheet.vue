<script setup lang="ts">
import { useId } from "vue";

/**
 * Kartu hijau tua yang muncul dari bawah, dipakai untuk ringkasan yang cuma
 * dibaca: Informasi Setoran dan Ringkasan Penerimaan Dana. Tombol lanjutan
 * (kalau ada) dipasang lewat slot `actions`.
 */
defineProps<{
  open: boolean;
  title: string;
}>();

const emit = defineEmits<{ close: [] }>();

const uid = useId();
</script>

<template>
  <Transition
    enter-active-class="transition duration-200 ease-out"
    enter-from-class="opacity-0 [&>div]:translate-y-6"
    leave-active-class="transition duration-150 ease-in"
    leave-to-class="opacity-0 [&>div]:translate-y-6"
  >
    <div
      v-if="open"
      class="fixed inset-0 z-50 flex items-end justify-center bg-neutral-900/70 px-4 pb-4"
      role="dialog"
      aria-modal="true"
      :aria-labelledby="`${uid}-title`"
      @click.self="emit('close')"
    >
      <!-- scheme-4: pasangan hijau tua dari style guide (lihat style.css). -->
      <div
        class="scheme-4 mb-safe w-full max-w-sm rounded-2xl border border-scheme-border bg-scheme-bg text-scheme-text shadow-xl transition-transform duration-200"
      >
        <h2
          :id="`${uid}-title`"
          class="border-b border-scheme-border px-5 pt-5 pb-3 text-h5 font-extrabold"
        >
          {{ title }}
        </h2>

        <div class="px-5 pt-4 pb-6">
          <slot />

          <div v-if="$slots.actions" class="mt-6 flex justify-center">
            <slot name="actions" />
          </div>
        </div>
      </div>
    </div>
  </Transition>
</template>
