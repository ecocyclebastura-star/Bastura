<script setup lang="ts">
import { computed } from "vue";
import { useRoute } from "vue-router";
import AppIcon from "./AppIcon.vue";
import type { IconName } from "../constants/appIcons";
// Tombol scan punya gradien & warna sendiri, jadi dipakai apa adanya.
import scanButton from "../assets/scan-button.svg";

type Tab = {
  /** Nama route tujuan. */
  name: string;
  label: string;
  icon: IconName;
};

const TABS_LEFT: Tab[] = [
  { name: "dashboard-user", label: "Beranda", icon: "home" },
  { name: "user-dompet", label: "Dompet", icon: "wallet" },
];

const TABS_RIGHT: Tab[] = [
  { name: "user-riwayat", label: "Riwayat", icon: "history" },
  { name: "user-profil", label: "Profil", icon: "account" },
];

const route = useRoute();

const isActive = (name: string) => route.name === name;
const isScanActive = computed(() => route.name === "user-scan");

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
        class="grid grid-cols-5 items-end rounded-4xl bg-neutral-50 px-1 py-2.5 shadow-[0_8px_24px_-8px_rgba(28,28,26,0.3)]"
      >
        <RouterLink
          v-for="tab in TABS_LEFT"
          :key="tab.name"
          :to="{ name: tab.name }"
          :class="[
            itemClass,
            isActive(tab.name)
              ? 'text-primary-500'
              : 'text-neutral-900 hover:text-primary-600',
          ]"
          :aria-current="isActive(tab.name) ? 'page' : undefined"
        >
          <AppIcon :name="tab.icon" />
          <span :class="labelClass">{{ tab.label }}</span>
        </RouterLink>

        <!-- Tombol scan: selalu menonjol, sedikit keluar dari batas atas bar. -->
        <RouterLink
          :to="{ name: 'user-scan' }"
          :class="[itemClass, 'text-neutral-900']"
          :aria-current="isScanActive ? 'page' : undefined"
        >
          <img
            :src="scanButton"
            alt=""
            aria-hidden="true"
            :class="[
              '-mt-5 size-16 transition-transform duration-200',
              isScanActive ? 'scale-105' : '',
            ]"
          />
          <span :class="labelClass">scan</span>
        </RouterLink>

        <RouterLink
          v-for="tab in TABS_RIGHT"
          :key="tab.name"
          :to="{ name: tab.name }"
          :class="[
            itemClass,
            isActive(tab.name)
              ? 'text-primary-500'
              : 'text-neutral-900 hover:text-primary-600',
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
