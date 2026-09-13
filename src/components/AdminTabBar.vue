<script setup lang="ts">
import { computed } from "vue";
import { useRoute } from "vue-router";
import AppIcon from "./AppIcon.vue";
import type { IconName } from "../constants/appIcons";
// Tombol setoran punya gradien & warna sendiri, jadi dipakai apa adanya.
import setoranButton from "../assets/setoran-button.svg";

type Tab = {
  /** Nama route tujuan. */
  name: string;
  label: string;
  icon: IconName;
};

const TABS_LEFT: Tab[] = [
  { name: "dashboard-admin", label: "Beranda", icon: "home" },
  { name: "admin-warga", label: "Warga", icon: "personSearch" },
];

const TABS_RIGHT: Tab[] = [
  { name: "admin-riwayat", label: "Riwayat", icon: "history" },
  { name: "admin-profil", label: "Profil", icon: "account" },
];

const route = useRoute();

// Halaman turunan (mis. admin-warga-detail) tetap menyalakan tab induknya.
const isActive = (name: string) =>
  route.name === name || String(route.name ?? "").startsWith(`${name}-`);
const isSetoranActive = computed(() => route.name === "admin-setoran");

// Kelas dipakai di dua kolom (kiri & kanan), jadi ditaruh sekali di sini.
const itemClass =
  "flex select-none flex-col items-center gap-1 py-1 transition-colors duration-200";
const labelClass = "text-body-tiny leading-none font-medium";
</script>

<template>
  <nav
    class="fixed inset-x-0 bottom-0 z-40 pb-safe"
    aria-label="Navigasi utama"
  >
    <div class="mx-auto w-full max-w-sm px-4 pb-3">
      <div
        class="grid grid-cols-5 items-end rounded-4xl bg-secondary-100 px-1 py-2.5 shadow-[0_8px_24px_-8px_rgba(28,28,26,0.3)]"
      >
        <RouterLink
          v-for="tab in TABS_LEFT"
          :key="tab.name"
          :to="{ name: tab.name }"
          :class="[
            itemClass,
            isActive(tab.name)
              ? 'text-primary-500'
              : 'text-primary-900 hover:text-primary-600',
          ]"
          :aria-current="isActive(tab.name) ? 'page' : undefined"
        >
          <AppIcon :name="tab.icon" />
          <span :class="labelClass">{{ tab.label }}</span>
        </RouterLink>

        <!-- Tombol setoran: selalu menonjol, sedikit keluar dari batas atas bar. -->
        <RouterLink
          :to="{ name: 'admin-setoran' }"
          :class="[itemClass, 'text-primary-900']"
          :aria-current="isSetoranActive ? 'page' : undefined"
        >
          <img
            :src="setoranButton"
            alt=""
            aria-hidden="true"
            :class="[
              '-mt-5 size-16 transition-transform duration-200',
              isSetoranActive ? 'scale-105' : '',
            ]"
          />
          <span :class="labelClass">Setoran</span>
        </RouterLink>

        <RouterLink
          v-for="tab in TABS_RIGHT"
          :key="tab.name"
          :to="{ name: tab.name }"
          :class="[
            itemClass,
            isActive(tab.name)
              ? 'text-primary-500'
              : 'text-primary-900 hover:text-primary-600',
          ]"
          :aria-current="isActive(tab.name) ? 'page' : undefined"
        >
          <AppIcon :name="tab.icon" />
          <span :class="labelClass">{{ tab.label }}</span>
        </RouterLink>
      </div>
    </div>
  </nav>
</template>
