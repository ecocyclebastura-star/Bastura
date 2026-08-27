<script setup lang="ts">
import { useId } from "vue";

defineProps<{
  open: boolean;
  title: string;
  message?: string;
  /**
   * Dialog yang menutup kalau latarnya disentuh. Dimatikan untuk dialog
   * hasil akhir, supaya user tidak melewatkan kabarnya tanpa sengaja.
   */
  dismissible?: boolean;
}>();

const emit = defineEmits<{ close: [] }>();

const uid = useId();
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
      class="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/50 px-6"
      role="dialog"
      aria-modal="true"
      :aria-labelledby="`${uid}-title`"
      :aria-describedby="message ? `${uid}-desc` : undefined"
      @click.self="dismissible && emit('close')"
    >
      <div class="w-full max-w-sm rounded-3xl bg-white px-6 pt-3 pb-6 shadow-xl">
        <!-- Gagang kecil khas bottom sheet; murni penanda visual. -->
        <div
          class="mx-auto h-1.5 w-10 rounded-full bg-primary-500"
          aria-hidden="true"
        />

        <h2
          :id="`${uid}-title`"
          class="mt-4 text-center text-h6 font-extrabold text-neutral-900"
        >
          {{ title }}
        </h2>

        <p
          v-if="message"
          :id="`${uid}-desc`"
          class="mt-3 text-center text-body-sm text-neutral-700"
        >
          {{ message }}
        </p>

        <div class="mt-6 flex gap-3">
          <slot name="actions" />
        </div>
      </div>
    </div>
  </Transition>
</template>
