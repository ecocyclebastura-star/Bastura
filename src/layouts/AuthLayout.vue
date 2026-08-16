<script setup lang="ts">
// Wrapper bersama halaman login & sign up: gradient background + container mobile.
</script>

<template>
  <div
    class="min-h-screen w-full bg-linear-to-b from-white from-0% via-primary-300 via-55% to-primary-400 to-100%"
  >
    <div
      class="mx-auto flex min-h-screen w-full max-w-sm flex-col px-6 pt-safe pb-safe"
    >
      <slot />
    </div>
  </div>
</template>
