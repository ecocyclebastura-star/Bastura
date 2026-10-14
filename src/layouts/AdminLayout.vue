<script setup lang="ts">
// Shell halaman role admin: isi halaman + bottom navigation.
import { RouterView, useRoute } from "vue-router";
import AdminTabBar from "../components/AdminTabBar.vue";

const route = useRoute();
</script>

<template>
  <div class="min-h-screen w-full bg-neutral-50">
    <!-- 7rem (pb-28) supaya konten paling bawah tidak ketutup bar yang fixed;
         safe-area ditambahkan karena bar itu sendiri ikut naik setinggi pb-safe. -->
    <div class="pb-[calc(7rem+env(safe-area-inset-bottom))]">
      <RouterView />
    </div>

    <!-- Halaman tugas (form & alur bagi hasil) cukup memakai tombol kembali;
         form setoran malah punya bar Simpan sendiri di posisi yang sama. -->
    <AdminTabBar v-if="!route.meta.hideTabBar" />
  </div>
</template>
