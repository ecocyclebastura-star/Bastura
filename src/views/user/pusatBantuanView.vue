<script setup lang="ts">
import { useRouter } from "vue-router";
import MenuCard from "../../components/MenuCard.vue";
import type { MenuItem } from "../../components/MenuCard.vue";
import PageHeader from "../../components/PageHeader.vue";

const router = useRouter();

const MENU_ITEMS: readonly MenuItem[] = [
  { key: "faq", label: "FAQ", icon: "help" },
  { key: "tentang", label: "Tentang bastura", icon: "info" },
  { key: "hubungi", label: "Hubungi kami", icon: "phone" },
];

const MENU_ROUTES: Record<string, string> = {
  faq: "user-faq",
  tentang: "user-tentang",
  hubungi: "user-hubungi-kami",
};

function handleMenu(key: string) {
  const name = MENU_ROUTES[key];
  if (name) router.push({ name });
}
</script>

<template>
  <main class="mx-auto flex w-full max-w-sm flex-col px-6 pt-safe">
    <PageHeader title="Pusat Bantuan" fallback="user-profil" />

    <MenuCard
      class="mt-6"
      :items="MENU_ITEMS"
      aria-label="Menu bantuan"
      @select="handleMenu"
    />
  </main>
</template>
