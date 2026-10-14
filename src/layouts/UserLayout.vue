<script setup lang="ts">
// Shell halaman role warga: isi halaman + bottom navigation.
import { RouterView, useRoute } from "vue-router";
import UserTabBar from "../components/UserTabBar.vue";

const route = useRoute();
</script>

<template>
  <div class="min-h-screen w-full bg-neutral-50">
    <!-- 7rem (pb-28) supaya konten paling bawah tidak ketutup bar yang fixed;
         safe-area ditambahkan karena bar itu sendiri ikut naik setinggi pb-safe. -->
    <div class="pb-[calc(7rem+env(safe-area-inset-bottom))]">
      <RouterView />
    </div>

    <!-- Halaman tugas (form) cukup memakai tombol kembali. -->
    <UserTabBar v-if="!route.meta.hideTabBar" />
  </div>
</template>
