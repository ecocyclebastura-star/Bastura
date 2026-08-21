<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import AppIcon from "../../components/AppIcon.vue";
import BaseButton from "../../components/BaseButton.vue";
import type { IconName } from "../../constants/appIcons";
import { useAuthStore } from "../../stores/authStore";

const router = useRouter();
const authStore = useAuthStore();

const isLoggingOut = ref(false);

const MENU_ITEMS: { key: string; label: string; icon: IconName }[] = [
  { key: "edit-profil", label: "Edit Profil", icon: "editProfile" },
  { key: "ganti-password", label: "Ganti Password", icon: "lock" },
  { key: "pusat-bantuan", label: "Pusat Bantuan", icon: "help" },
  { key: "hapus-akun", label: "Hapus Akun", icon: "deleteAccount" },
];

// Diambil dari tauri.conf.json biar tidak perlu diperbarui manual tiap rilis.
// Di luar aplikasi Tauri (`npm run dev`) IPC-nya tidak ada, jadi dibiarkan
// kosong dan barisnya ikut disembunyikan.
const appVersion = ref("");

onMounted(async () => {
  try {
    const { getVersion } = await import("@tauri-apps/api/app");
    appVersion.value = await getVersion();
  } catch {
    appVersion.value = "";
  }
});

const currentYear = computed(() => new Date().getFullYear());

function handleMenu(_key: string) {
  // TODO: arahkan ke halaman terkait setelah routenya dibuat.
}

async function handleLogout() {
  isLoggingOut.value = true;
  try {
    await authStore.logout();
  } finally {
    isLoggingOut.value = false;
    router.push({ name: "login" });
  }
}
</script>

<template>
  <!-- Tinggi dikurangi ruang bottom nav (pb-28 di UserLayout) supaya footer
       mendarat tepat di atas bar, bukan ketutup atau ngambang di tengah. -->
  <main
    class="mx-auto flex min-h-[calc(100vh-7rem)] w-full max-w-sm flex-col px-6 pt-safe"
  >
    <header class="relative flex items-center justify-center pt-6">
      <button
        type="button"
        class="absolute left-0 cursor-pointer p-1 text-neutral-900"
        aria-label="Kembali"
        @click="router.back()"
      >
        <svg
          class="size-7"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2.2"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <path d="M20 12H4" />
          <path d="m10 6-6 6 6 6" />
        </svg>
      </button>

      <h1 class="text-h5 font-extrabold text-neutral-900">Profil</h1>
    </header>

    <!-- Identitas -->
    <section class="mt-8 flex flex-col items-center">
      <AppIcon name="account" class="size-30 text-primary-800" />

      <p class="mt-3 text-h4 font-extrabold text-neutral-900">
        {{ authStore.user?.name || "Warga" }}
      </p>
      <p class="text-body-reg text-neutral-700">
        {{ authStore.user?.email }}
      </p>
    </section>

    <!-- Menu pengaturan -->
    <nav
      class="mt-6 divide-y divide-neutral-200 overflow-hidden rounded-2xl bg-white shadow-[0_4px_16px_-6px_rgba(28,28,26,0.2)]"
      aria-label="Pengaturan akun"
    >
      <button
        v-for="item in MENU_ITEMS"
        :key="item.key"
        type="button"
        class="flex w-full cursor-pointer items-center gap-3 px-4 py-3.5 text-left transition-colors duration-200 hover:bg-neutral-100 focus:outline-none focus-visible:bg-neutral-100"
        @click="handleMenu(item.key)"
      >
        <AppIcon :name="item.icon" class="text-primary-800" />

        <span class="flex-1 text-body-reg text-neutral-900">
          {{ item.label }}
        </span>

        <svg
          class="size-5 text-neutral-900"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2.4"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <path d="m9 6 6 6-6 6" />
        </svg>
      </button>
    </nav>

    <!-- Keluar + versi -->
    <div class="mt-8 flex flex-col items-center">
      <BaseButton
        class="w-3/5"
        label="Keluar"
        variant="accent"
        :block="false"
        :loading="isLoggingOut"
        @click="handleLogout"
      />

      <p v-if="appVersion" class="mt-2 text-body-tiny text-neutral-400">
        Versi {{ appVersion }}
      </p>
    </div>

    <footer class="mt-auto py-6 text-center text-body-sm text-neutral-500">
      &copy; {{ currentYear }} Ecocycle Team
    </footer>
  </main>
</template>
