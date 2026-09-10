<script setup lang="ts">
// Rangka halaman tab "Riwayat". Desain isinya belum ada, tapi route-nya sudah
// dibuat supaya bottom navigation admin tidak menunjuk ke halaman kosong.
import EmptyState from "../../components/EmptyState.vue";
</script>

<template>
  <main class="mx-auto flex w-full max-w-sm flex-col px-6 pt-safe">
    <h1 class="pt-6 text-h5 font-extrabold text-neutral-900">Riwayat</h1>

    <EmptyState
      class="mt-6"
      title="Belum tersedia"
      message="Riwayat transaksi yang diproses admin akan tampil di sini."
    />
  </main>
</template>
