<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import AvatarPhoto from "../../components/AvatarPhoto.vue";
import BaseButton from "../../components/BaseButton.vue";
import MenuCard from "../../components/MenuCard.vue";
import PageHeader from "../../components/PageHeader.vue";
import type { MenuItem } from "../../components/MenuCard.vue";
import { useAuthStore } from "../../stores/authStore";
import { useProfileStore } from "../../stores/profileStore";

const router = useRouter();
const authStore = useAuthStore();
const profileStore = useProfileStore();

/** Rute tujuan tiap menu. Yang belum ada halamannya dibiarkan kosong. */
const MENU_ROUTES: Record<string, string | undefined> = {
  "edit-profil": "user-edit-profil",
  "ganti-password": "user-ganti-password",
  "pusat-bantuan": "user-pusat-bantuan",
  "hapus-akun": "user-nonaktif-akun",
};

// Profil dipakai buat nama, email, dan foto. Kalau gagal dimuat (offline dan
// cache kosong), tampilannya jatuh ke data sesi dari authStore.
const displayName = computed(
  () => profileStore.profile?.name || authStore.user?.name || "Warga",
);
const displayEmail = computed(
  () => profileStore.profile?.email || authStore.user?.email || "",
);

const isLoggingOut = ref(false);

const MENU_ITEMS: readonly MenuItem[] = [
  { key: "edit-profil", label: "Edit Profil", icon: "editProfile" },
  { key: "ganti-password", label: "Ganti Password", icon: "lock" },
  { key: "pusat-bantuan", label: "Pusat Bantuan", icon: "help" },
  { key: "hapus-akun", label: "Nonaktifkan Akun", icon: "deleteAccount" },
];

// Diambil dari tauri.conf.json biar tidak perlu diperbarui manual tiap rilis.
// Di luar aplikasi Tauri (`npm run dev`) IPC-nya tidak ada, jadi dibiarkan
// kosong dan barisnya ikut disembunyikan.
const appVersion = ref("");

onMounted(async () => {
  profileStore.load();

  try {
    const { getVersion } = await import("@tauri-apps/api/app");
    appVersion.value = await getVersion();
  } catch {
    appVersion.value = "";
  }
});

const currentYear = computed(() => new Date().getFullYear());

function handleMenu(key: string) {
  const name = MENU_ROUTES[key];
  if (name) router.push({ name });
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
    <PageHeader title="Profil" fallback="user-profil" />

    <!-- Identitas -->
    <section class="mt-8 flex flex-col items-center">
      <AvatarPhoto
        :src="profileStore.avatarSrc"
        alt="Foto profil"
        class="size-30"
      />

      <p class="mt-3 text-h4 font-extrabold text-neutral-900">
        {{ displayName }}
      </p>
      <p class="text-body-reg text-neutral-700">
        {{ displayEmail }}
      </p>
    </section>

    <!-- Menu pengaturan -->
    <MenuCard
      class="mt-6"
      :items="MENU_ITEMS"
      aria-label="Pengaturan akun"
      @select="handleMenu"
    />

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
