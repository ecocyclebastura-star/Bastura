<script setup lang="ts">
const STEPS = ["Input Data", "Alokasi", "Konfirmasi"] as const;

defineProps<{
  /** Urutan langkah yang sedang aktif, mulai dari 0. */
  current: number;
}>();
</script>

<template>
  <nav aria-label="Langkah bagi hasil setoran">
    <ol class="flex flex-wrap items-center gap-x-1 text-body-reg font-bold">
      <li
        v-for="(step, index) in STEPS"
        :key="step"
        class="flex items-center gap-1"
      >
        <span
          :class="index === current ? 'text-primary-500' : 'text-neutral-900'"
          :aria-current="index === current ? 'step' : undefined"
        >
          {{ step }}
        </span>
        <span v-if="index < STEPS.length - 1" class="text-neutral-900" aria-hidden="true">
          &gt;
        </span>
      </li>
    </ol>
  </nav>
</template>
