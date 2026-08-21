<script setup lang="ts">
import { APP_ICONS } from "../constants/appIcons";
import type { IconName } from "../constants/appIcons";

defineProps<{
  name: IconName;
  /** Isi kalau ikonnya bermakna; kalau kosong dianggap dekoratif. */
  label?: string;
}>();
</script>

<template>
  <!-- Ukuran diatur pemanggil lewat kelas size-*, warna lewat text-*. -->
  <span
    class="app-icon inline-block size-6 shrink-0"
    :role="label ? 'img' : undefined"
    :aria-label="label"
    :aria-hidden="label ? undefined : 'true'"
    v-html="APP_ICONS[name]"
  />
</template>

<style scoped>
/* Atribut width/height bawaan file SVG-nya ditimpa biar nurut ke kelas size-*. */
.app-icon :deep(svg) {
  display: block;
  width: 100%;
  height: 100%;
}
</style>
