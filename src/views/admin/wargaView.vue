<script setup lang="ts">
// Rangka halaman tab "Warga". Desain isinya belum ada, tapi route-nya sudah
// dibuat supaya bottom navigation admin tidak menunjuk ke halaman kosong.
import EmptyState from "../../components/EmptyState.vue";
</script>

<template>
  <main class="mx-auto flex w-full max-w-sm flex-col px-6 pt-safe">
    <h1 class="pt-6 text-h5 font-extrabold text-neutral-900">Warga</h1>

    <EmptyState
      class="mt-6"
      title="Belum tersedia"
      message="Data warga dan riwayat setorannya akan tampil di sini."
    />
  </main>
</template>
