<script setup lang="ts">
import { computed, onMounted } from "vue";
import { useRouter } from "vue-router";
import AppIcon from "../../components/AppIcon.vue";
import BalanceCard from "../../components/cards/BalanceCard.vue";
import ContentCard from "../../components/cards/ContentCard.vue";
import ExploreMenu from "../../components/cards/ExploreMenu.vue";
import type { ExploreItem } from "../../components/cards/ExploreMenu.vue";
import { useAuthStore } from "../../stores/authStore";
import { useBalanceStore } from "../../stores/balanceStore";
import { useContentStore } from "../../stores/contentStore";
import { formatTanggal } from "../../utils/formatters";

const router = useRouter();
const authStore = useAuthStore();
const balanceStore = useBalanceStore();
const contentStore = useContentStore();

// Nama panggilan: ambil kata pertama biar sapaannya tetap pendek.
const greetingName = computed(
  () => authStore.user?.name?.trim().split(/\s+/)[0] || "Warga",
);

const EXPLORE_ITEMS: ExploreItem[] = [
  { key: "pengumuman", label: "Pengumuman", icon: "megaphone" },
  { key: "jenis-sampah", label: "Jenis Sampah", icon: "list" },
  { key: "edukasi", label: "Edukasi Sampah", icon: "tips" },
];

/** Tujuan tiap menu jelajah. Yang belum punya halaman sengaja dikosongkan. */
const EXPLORE_ROUTES: Record<string, string | undefined> = {
  pengumuman: "user-pengumuman",
  edukasi: "user-edukasi",
  "jenis-sampah": undefined, // TODO: belum ada command & halamannya.
};

onMounted(() => contentStore.loadHighlights());

function handleWithdraw() {
  // TODO: sambungkan ke alur tarik saldo kalau backend-nya sudah siap.
}

function handleExplore(key: string) {
  const name = EXPLORE_ROUTES[key];
  if (name) router.push({ name });
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
          Siap menyetor sampah hari ini?
        </p>
      </div>
    </header>

    <!-- Saldo datang dari event `on_balance_update`; skeleton tampil sampai
         kiriman pertama masuk. -->
    <BalanceCard
      :balance="balanceStore.saldo"
      :loading="balanceStore.isWaitingFirstUpdate"
      @withdraw="handleWithdraw"
    />

    <ExploreMenu :items="EXPLORE_ITEMS" @select="handleExplore" />

    <p
      v-if="contentStore.highlightsError"
      class="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-body-sm text-red-700"
      role="alert"
    >
      {{ contentStore.highlightsError }}
    </p>

    <!-- Pengumuman RT -->
    <section>
      <div class="flex items-baseline justify-between gap-3">
        <h2 class="text-body-reg font-bold text-neutral-900">Pengumuman RT</h2>
        <RouterLink
          :to="{ name: 'user-pengumuman' }"
          class="cursor-pointer text-body-sm font-medium text-primary-500 underline underline-offset-2"
        >
          Lihat Semua
        </RouterLink>
      </div>

      <!-- Digeser ke samping; -mx-6 px-6 supaya kartunya bisa mepet tepi layar. -->
      <div
        class="no-scrollbar -mx-6 mt-3 flex snap-x snap-mandatory gap-4 overflow-x-auto px-6 pb-2"
      >
        <template v-if="contentStore.highlightsLoading">
          <div
            v-for="n in 2"
            :key="n"
            class="h-56 w-60 shrink-0 animate-pulse rounded-2xl bg-neutral-200"
            aria-hidden="true"
          />
        </template>

        <p
          v-else-if="contentStore.announcements.length === 0"
          class="text-body-sm text-neutral-500"
        >
          Belum ada pengumuman dari RT.
        </p>

        <template v-else>
          <ContentCard
            v-for="item in contentStore.announcements"
            :key="item.id"
            class="w-60 shrink-0 snap-start"
            :title="item.title"
            :date="formatTanggal(item.created_at)"
            :excerpt="item.content.text"
            :image="item.image_url ?? ''"
            :badge="item.content.important ? 'Penting' : ''"
            @open="
              router.push({
                name: 'user-pengumuman-detail',
                params: { id: item.id },
              })
            "
          />
        </template>
      </div>
    </section>

    <!-- Edukasi Sampah -->
    <section>
      <div class="flex items-baseline justify-between gap-3">
        <h2 class="text-body-reg font-bold text-neutral-900">Edukasi Sampah</h2>
        <RouterLink
          :to="{ name: 'user-edukasi' }"
          class="cursor-pointer text-body-sm font-medium text-primary-500 underline underline-offset-2"
        >
          Lihat Semua
        </RouterLink>
      </div>

      <div
        class="no-scrollbar -mx-6 mt-3 flex snap-x snap-mandatory gap-4 overflow-x-auto px-6 pb-2"
      >
        <template v-if="contentStore.highlightsLoading">
          <div
            v-for="n in 2"
            :key="n"
            class="h-56 w-60 shrink-0 animate-pulse rounded-2xl bg-neutral-200"
            aria-hidden="true"
          />
        </template>

        <p
          v-else-if="contentStore.educations.length === 0"
          class="text-body-sm text-neutral-500"
        >
          Belum ada materi edukasi.
        </p>

        <template v-else>
          <ContentCard
            v-for="item in contentStore.educations"
            :key="item.id"
            class="w-60 shrink-0 snap-start"
            :title="item.title"
            :date="formatTanggal(item.created_at)"
            :excerpt="item.content.text"
            :image="item.image_url ?? ''"
            :tags="item.content.tags"
            @open="router.push({ name: 'user-edukasi' })"
          />
        </template>
      </div>
    </section>
  </main>
</template>
