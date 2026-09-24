<script setup lang="ts">
// Shell halaman role admin: isi halaman + bottom navigation yang selalu tampil.
import { RouterView, useRoute } from "vue-router";
import AdminTabBar from "../components/AdminTabBar.vue";

const route = useRoute();
</script>

<template>
  <div class="min-h-screen w-full bg-neutral-50">
    <!-- pb-28 supaya konten paling bawah tidak ketutup bar yang fixed. -->
    <div class="pb-28">
      <RouterView />
    </div>

    <!-- Halaman form punya bar Simpan sendiri di posisi yang sama. -->
    <AdminTabBar v-if="!route.meta.hideTabBar" />
  </div>
</template>
