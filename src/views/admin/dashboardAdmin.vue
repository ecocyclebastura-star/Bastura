<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import AlertToast from "../../components/AlertToast.vue";
import AppIcon from "../../components/AppIcon.vue";
import ManagementMenu from "../../components/cards/ManagementMenu.vue";
import ScheduleCard from "../../components/cards/ScheduleCard.vue";
import ScheduleSheet from "../../components/ScheduleSheet.vue";
import type { ManagementItem } from "../../components/cards/ManagementMenu.vue";
import { resolveAuthError } from "../../constants/authErrors";
import { isSuperAdmin } from "../../constants/roleRoutes";
import { useToast } from "../../composables/useToast";
import { useAuthStore } from "../../stores/authStore";
import { useScheduleStore } from "../../stores/scheduleStore";
import type { SetorSchedule } from "../../stores/scheduleStore";

const router = useRouter();
const authStore = useAuthStore();
const scheduleStore = useScheduleStore();
const { toastMessage, toastVariant, showToast } = useToast();

// Nama panggilan: ambil kata pertama biar sapaannya tetap pendek.
const greetingName = computed(
  () => authStore.user?.name?.trim().split(/\s+/)[0] || "Admin",
);

/** Menu yang dipegang admin maupun super admin. */
const MENU_ITEMS: readonly ManagementItem[] = [
  {
    key: "verifikasi-penarikan",
    label: "Verifikasi Penarikan Saldo",
    description: "Setujui penarikan saldo para warga",
    icon: "penarikan",
  },
  {
    key: "jenis-sampah",
    label: "Kelola harga & jenis sampah",
    description: "Update harga & jenis sampah terkini",
    icon: "list",
  },
  {
    key: "pengumuman",
    label: "Kelola pengumuman RT",
    description: "Memberikan informasi baru ke warga",
    icon: "megaphone",
  },
  {
    key: "edukasi",
    label: "Kelola edukasi sampah",
    description: "Memberikan edukasi sampah",
    icon: "tips",
  },
  {
    key: "template-simba",
    label: "Kelola template SIMBA",
    description: "Template laporan SIMBA",
    icon: "document",
  },
];

/** Besaran komisi cuma boleh diatur super admin, jadi menunya ikut dibatasi. */
const KOMISI_ITEM: ManagementItem = {
  key: "komisi-setoran",
  label: "Komisi Setoran",
  description: "Mengatur komisi dari hasil setoran",
  icon: "handCoin",
};

const menuItems = computed(() =>
  isSuperAdmin(authStore.role) ? [...MENU_ITEMS, KOMISI_ITEM] : MENU_ITEMS,
);

/** Tujuan tiap menu. Yang belum punya halaman sengaja dikosongkan. */
const MENU_ROUTES: Record<string, string | undefined> = {
  "verifikasi-penarikan": undefined,
  "jenis-sampah": undefined,
  pengumuman: undefined,
  edukasi: undefined,
  "template-simba": undefined,
  "komisi-setoran": undefined,
};

const sheetOpen = ref(false);
const savingSchedule = ref(false);

function handleMenu(key: string) {
  const name = MENU_ROUTES[key];
  if (name) router.push({ name });
}

// Jadwal terakhir yang tersimpan di store tetap tampil selama request ini
// jalan, jadi gagal memuat cukup dikabari lewat toast.
onMounted(async () => {
  try {
    await scheduleStore.fetch();
  } catch (error) {
    showToast(resolveAuthError(error, "Gagal memuat jadwal setor."), "error");
  }
});

async function handleConfirmSchedule(value: SetorSchedule) {
  savingSchedule.value = true;

  try {
    await scheduleStore.save(value);
    sheetOpen.value = false;
    showToast("Jadwal setor berhasil disimpan.", "success");
  } catch (error) {
    // Sheet sengaja dibiarkan terbuka supaya isian form tidak hilang.
    showToast(resolveAuthError(error, "Jadwal setor gagal disimpan."), "error");
  } finally {
    savingSchedule.value = false;
  }
}
</script>

<template>
  <main class="mx-auto flex w-full max-w-sm flex-col gap-5 px-6 pt-safe">
    <!-- Sapaan -->
    <header class="flex items-center gap-3 pt-6">
      <AppIcon name="account" class="size-11 text-neutral-900" />
      <div>
        <p class="text-body-md leading-tight font-extrabold text-neutral-900">
          Halo, {{ greetingName }}
        </p>
        <p class="text-body-sm leading-tight text-neutral-600">
          Siap mengelola sampah hari ini?
        </p>
      </div>
    </header>

    <ScheduleCard
      :date="scheduleStore.date"
      :time="scheduleStore.time"
      :days-left="scheduleStore.daysLeft"
      @edit="sheetOpen = true"
    />

    <section>
      <h2 class="text-body-reg font-extrabold text-neutral-900">
        Pusat Pengelolaan
      </h2>

      <ManagementMenu
        class="mt-3"
        :items="menuItems"
        aria-label="Pusat pengelolaan"
        @select="handleMenu"
      />
    </section>

    <ScheduleSheet
      :open="sheetOpen"
      :date="scheduleStore.date"
      :time="scheduleStore.time"
      :saving="savingSchedule"
      @close="sheetOpen = false"
      @confirm="handleConfirmSchedule"
    />

    <!-- Setelah ScheduleSheet: sama-sama z-50, jadi yang belakangan di DOM
         yang tampil di atas -- toast gagal simpan tidak boleh ketutup sheet. -->
    <AlertToast :message="toastMessage" :variant="toastVariant" />
  </main>
</template>
