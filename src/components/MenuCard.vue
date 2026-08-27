<script setup lang="ts">
import AppIcon from "./AppIcon.vue";
import type { IconName } from "../constants/appIcons";

export type MenuItem = {
  key: string;
  label: string;
  icon: IconName;
};

defineProps<{ items: readonly MenuItem[]; ariaLabel?: string }>();

defineEmits<{ select: [key: string] }>();
</script>

<template>
  <nav
    class="divide-y divide-neutral-200 overflow-hidden rounded-2xl bg-white shadow-[0_4px_16px_-6px_rgba(28,28,26,0.2)]"
    :aria-label="ariaLabel"
  >
    <button
      v-for="item in items"
      :key="item.key"
      type="button"
      class="flex w-full cursor-pointer items-center gap-3 px-4 py-3.5 text-left transition-colors duration-200 hover:bg-neutral-100 focus:outline-none focus-visible:bg-neutral-100"
      @click="$emit('select', item.key)"
    >
      <AppIcon :name="item.icon" class="text-primary-800" />

      <span class="flex-1 text-body-reg text-neutral-900">{{ item.label }}</span>

      <svg
        class="size-5 text-neutral-900"
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
