<script setup lang="ts">
import { onMounted, onUnmounted } from "vue";
import { RouterView, useRouter } from "vue-router";
import { listen } from "@tauri-apps/api/event";
import { useAuthStore } from "./stores/authStore";

const router = useRouter();
const authStore = useAuthStore();

let unlisten: (() => void) | undefined;

onMounted(async () => {
  try {
    // Session watcher di Rust mengirim event ini kalau refresh token ditolak
    // atau sudah kedaluwarsa.
    unlisten = await listen("on_session_expired", () => {
      authStore.clearSession();
      router.push({ name: "login" });
    });
  } catch (error) {
    // Kejadian saat dijalankan lewat `npm run dev` biasa (di luar Tauri),
    // IPC-nya memang tidak ada. Biarkan halaman tetap jalan.
    console.warn("Event Tauri tidak aktif di luar aplikasi Tauri.", error);
  }
});

onUnmounted(() => unlisten?.());
</script>

<template>
  <RouterView />
</template>
