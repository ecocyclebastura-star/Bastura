<script setup lang="ts">
import AppIcon from "../AppIcon.vue";
import type { IconName } from "../../constants/appIcons";

export type ManagementItem = {
  key: string;
  label: string;
  /** Keterangan singkat di bawah judul. */
  description: string;
  icon: IconName;
};

defineProps<{ items: readonly ManagementItem[]; ariaLabel?: string }>();

defineEmits<{ select: [key: string] }>();
</script>

<template>
  <nav
    class="divide-y divide-primary-200 overflow-hidden rounded-2xl border border-primary-200 bg-white"
    :aria-label="ariaLabel"
  >
    <button
      v-for="item in items"
      :key="item.key"
      type="button"
      class="flex w-full cursor-pointer items-center gap-3 px-3 py-3 text-left transition-colors duration-200 hover:bg-primary-100 focus:outline-none focus-visible:bg-primary-100"
      @click="$emit('select', item.key)"
    >
      <span
        class="flex size-11 shrink-0 items-center justify-center rounded-xl scheme-4 bg-scheme-bg text-secondary-300 ring-1 ring-scheme-border"
        aria-hidden="true"
      >
        <AppIcon :name="item.icon" class="size-7" />
      </span>

      <span class="min-w-0 flex-1">
        <span
          class="block text-body-sm leading-snug font-bold text-neutral-900"
        >
          {{ item.label }}
        </span>
        <span class="block text-body-tiny leading-snug text-neutral-600">
          {{ item.description }}
        </span>
      </span>

      <svg
        class="size-5 shrink-0 text-neutral-900"
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
  </nav>
</template>
