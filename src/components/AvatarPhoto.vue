<script setup lang="ts">
import AppIcon from "./AppIcon.vue";

withDefaults(
  defineProps<{
    /** Data URL atau object URL foto. Kosong = pakai ikon bawaan. */
    src?: string;
    alt?: string;
  }>(),
  { src: "", alt: "" },
);
</script>

<template>
  <!-- Ukurannya diatur pemanggil lewat kelas size-*. -->
  <span class="inline-block shrink-0 overflow-hidden rounded-full">
    <img
      v-if="src"
      :src="src"
      :alt="alt"
      class="size-full object-cover"
    />
    <AppIcon v-else name="account" class="size-full text-primary-900" />
  </span>
</template>
