<script setup lang="ts">
import emptyIllustration from "../assets/illustration-empty.webp";

withDefaults(
  defineProps<{
    title: string;
    message?: string;
  }>(),
  { message: "" },
);
</script>

<template>
  <div class="flex flex-col items-center px-4 py-10 text-center">
    <!-- width/height asli ikut ditulis supaya browser sudah tahu rasionya
         sebelum gambarnya selesai dimuat, jadi teks di bawahnya tidak lompat. -->
    <img
      :src="emptyIllustration"
      alt=""
      aria-hidden="true"
      width="640"
      height="494"
      class="h-auto w-60 max-w-full"
    />

    <p class="mt-6 text-body-md font-extrabold text-neutral-900">{{ title }}</p>

    <p v-if="message" class="mt-1 text-body-sm text-neutral-600">
      {{ message }}
    </p>
  </div>
</template>
