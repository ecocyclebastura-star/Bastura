<script setup lang="ts">
import AppIcon from "./AppIcon.vue";
import type { IconName } from "../constants/appIcons";

export type ExploreItem = {
  key: string;
  label: string;
  icon: IconName;
};

defineProps<{ items: ExploreItem[] }>();

defineEmits<{ select: [key: string] }>();
</script>

<template>
  <section class="rounded-2xl border border-primary-200 bg-white p-4">
    <h2 class="text-body-reg font-bold text-primary-900">Jelajahi Bastura</h2>

    <hr class="mt-2 border-primary-200" />

    <ul class="mt-3 grid grid-cols-3 gap-2">
      <li v-for="item in items" :key="item.key">
        <button
          type="button"
          class="flex w-full cursor-pointer flex-col items-center gap-1.5 rounded-xl px-1 py-2 text-primary-800 transition-colors duration-200 hover:bg-primary-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
          @click="$emit('select', item.key)"
        >
          <AppIcon :name="item.icon" class="size-8" />
          <span
            class="text-body-tiny leading-tight font-medium text-neutral-900"
          >
            {{ item.label }}
          </span>
        </button>
      </li>
    </ul>
  </section>
</template>
