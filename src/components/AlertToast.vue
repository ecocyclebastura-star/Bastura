<script setup lang="ts">
import { computed } from "vue";
import type { ToastVariant } from "../composables/useToast";

const props = withDefaults(
  defineProps<{
    /** Toast tampil selama string ini tidak kosong. */
    message?: string;
    variant?: ToastVariant;
  }>(),
  { message: "", variant: "warning" },
);

const iconColor: Record<ToastVariant, string> = {
  warning: "text-amber-500",
  error: "text-red-600",
  success: "text-primary-600",
};

/** Pesan pendek tampil sebagai pill, pesan panjang jadi kartu 2 baris. */
const isCompact = computed(() => props.message.length <= 42);
</script>

<template>
  <Transition
    enter-active-class="transition duration-200 ease-out"
    enter-from-class="-translate-y-3 opacity-0"
    leave-active-class="transition duration-150 ease-in"
    leave-to-class="-translate-y-3 opacity-0"
  >
    <div
      v-if="message"
      role="alert"
      aria-live="polite"
      class="pointer-events-none fixed inset-x-0 top-4 z-50 flex justify-center px-6 pt-safe"
    >
      <div
        class="flex items-center gap-2.5 bg-white shadow-lg shadow-primary-900/15"
        :class="
          isCompact
            ? 'rounded-full px-4 py-2.5'
            : 'max-w-sm rounded-2xl px-4 py-3'
        "
      >
        <svg
          class="size-5 shrink-0"
          :class="iconColor[variant]"
          viewBox="0 0 24 24"
          fill="currentColor"
        >
          <!-- error: lingkaran dengan silang -->
          <path
            v-if="variant === 'error'"
            d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm4.2 12.8-1.4 1.4L12 13.4l-2.8 2.8-1.4-1.4L10.6 12 7.8 9.2l1.4-1.4L12 10.6l2.8-2.8 1.4 1.4L13.4 12l2.8 2.8Z"
          />
          <!-- success: lingkaran dengan centang -->
          <path
            v-else-if="variant === 'success'"
            d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm-1.1 14.2-4-4 1.4-1.4 2.6 2.6 5.4-5.4 1.4 1.4-6.8 6.8Z"
          />
          <!-- warning: lingkaran dengan seru -->
          <path
            v-else
            d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm-1 5h2v7h-2V7Zm0 9h2v2h-2v-2Z"
          />
        </svg>

        <span class="text-body-sm font-medium text-neutral-900">
          {{ message }}
        </span>
      </div>
    </div>
  </Transition>
</template>
