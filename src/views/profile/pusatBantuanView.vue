<script setup lang="ts">
import { useRouter } from "vue-router";
import MenuCard from "../../components/MenuCard.vue";
import type { MenuItem } from "../../components/MenuCard.vue";
import PageHeader from "../../components/PageHeader.vue";
import { useSectionRoutes } from "../../composables/useSectionRoutes";

const router = useRouter();
const { routeName } = useSectionRoutes();

const MENU_ITEMS: readonly MenuItem[] = [
  { key: "faq", label: "FAQ", icon: "help" },
  { key: "tentang", label: "Tentang bastura", icon: "info" },
  { key: "hubungi", label: "Hubungi kami", icon: "phone" },
];

/** Tanpa awalan role; awalannya menyusul dari `routeName`. */
const MENU_ROUTES: Record<string, string> = {
  faq: "faq",
  tentang: "tentang",
  hubungi: "hubungi-kami",
};

function handleMenu(key: string) {
  const suffix = MENU_ROUTES[key];
  if (suffix) router.push({ name: routeName(suffix) });
}
</script>

<template>
  <main class="mx-auto flex w-full max-w-sm flex-col px-6 pt-safe">
    <PageHeader title="Pusat Bantuan" :fallback="routeName('profil')" />

    <MenuCard
      class="mt-6"
      :items="MENU_ITEMS"
      aria-label="Menu bantuan"
      @select="handleMenu"
    />
  </main>
</template>
