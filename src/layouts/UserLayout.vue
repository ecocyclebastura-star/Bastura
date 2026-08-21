<script setup lang="ts">
// Shell halaman role warga: isi halaman + bottom navigation yang selalu tampil.
import { RouterView } from "vue-router";
import UserTabBar from "../components/UserTabBar.vue";
</script>

<template>
  <div class="min-h-screen w-full bg-neutral-50">
    <!-- pb-28 supaya konten paling bawah tidak ketutup bar yang fixed. -->
    <div class="pb-28">
      <RouterView />
    </div>

    <UserTabBar />
  </div>
</template>
