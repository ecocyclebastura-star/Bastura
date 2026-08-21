<script setup lang="ts">
import { onMounted, onUnmounted } from "vue";
import { RouterView, useRouter } from "vue-router";
import { listen } from "@tauri-apps/api/event";
import { useAuthStore } from "./stores/authStore";
import { BALANCE_EVENT, useBalanceStore } from "./stores/balanceStore";
import type { BalanceUpdatePayload } from "./stores/balanceStore";

const router = useRouter();
const authStore = useAuthStore();
const balanceStore = useBalanceStore();

// Didaftarkan di sini, bukan di halaman: listener-nya harus tetap hidup waktu
// user pindah-pindah halaman, karena backend mengirimnya tanpa diminta.
const unlisteners: Array<() => void> = [];

onMounted(async () => {
  try {
    // Session watcher di Rust mengirim event ini kalau refresh token ditolak
    // atau sudah kedaluwarsa.
    unlisteners.push(
      await listen("on_session_expired", () => {
        // clearSession sekalian membuang saldo & konten milik sesi itu.
        authStore.clearSession();
        router.push({ name: "login" });
      }),
    );

    // Balance worker di Rust mengirim saldo terbaru secara berkala.
    unlisteners.push(
      await listen<BalanceUpdatePayload>(BALANCE_EVENT, (event) => {
        balanceStore.applyUpdate(event.payload);
      }),
    );
  } catch (error) {
    // Kejadian saat dijalankan lewat `npm run dev` biasa (di luar Tauri),
    // IPC-nya memang tidak ada. Biarkan halaman tetap jalan.
    console.warn("Event Tauri tidak aktif di luar aplikasi Tauri.", error);
  }
});

onUnmounted(() => {
  unlisteners.forEach((unlisten) => unlisten());
  unlisteners.length = 0;
});
</script>

<template>
  <RouterView />
</template>
