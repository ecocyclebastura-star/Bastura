<script setup lang="ts">
import { computed } from "vue";
import AppIcon from "../../components/AppIcon.vue";
import BalanceCard from "../../components/BalanceCard.vue";
import ContentCard from "../../components/ContentCard.vue";
import ExploreMenu from "../../components/ExploreMenu.vue";
import type { ExploreItem } from "../../components/ExploreMenu.vue";
import { useAuthStore } from "../../stores/authStore";

const authStore = useAuthStore();

// Nama panggilan: ambil kata pertama biar sapaannya tetap pendek.
const greetingName = computed(
  () => authStore.user?.name?.trim().split(/\s+/)[0] || "Warga",
);

// TODO: ganti dengan saldo dari event listener realtime backend.
const balance = computed<number | null>(() => null);

const EXPLORE_ITEMS: ExploreItem[] = [
  { key: "pengumuman", label: "Pengumuman", icon: "megaphone" },
  { key: "jenis-sampah", label: "Jenis Sampah", icon: "list" },
  { key: "edukasi", label: "Edukasi Sampah", icon: "tips" },
];

// TODO: data dummy, nanti diganti hasil fetch dari backend.
type Content = {
  id: number;
  date: string;
  title: string;
  excerpt: string;
};

const announcements: Content[] = [
  {
    id: 1,
    date: "18 Juli 2026",
    title: "Melanjutkan kerja bakti di jalan longsor",
    excerpt:
      "Kegiatan kerja bakti di area jalan yang terdampak longsor akan kembali dilanjutkan akhir pekan ini.",
  },
  {
    id: 2,
    date: "12 Juli 2026",
    title: "Senam bersama warga RT 04",
    excerpt:
      "Mari bapak ibu ikut serta memeriahkan senam pagi bersama di lapangan RT.",
  },
];

const educations: Content[] = [
  {
    id: 1,
    date: "10 Juli 2026",
    title: "Memilah sampah anorganik dengan benar",
    excerpt:
      "Kenali jenis sampah anorganik yang masih bisa didaur ulang sebelum disetorkan ke bank sampah.",
  },
  {
    id: 2,
    date: "02 Juli 2026",
    title: "Membuat kompos dari sisa dapur",
    excerpt:
      "Sisa sayur dan buah dari dapur bisa diolah jadi kompos yang bermanfaat untuk tanaman.",
  },
];

function handleWithdraw() {
  // TODO: sambungkan ke alur tarik saldo kalau backend-nya sudah siap.
}

function handleExplore(_key: string) {
  // TODO: arahkan ke halaman terkait setelah routenya dibuat.
}

function handleOpenContent(_id: number) {
  // TODO: buka halaman detail konten.
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

    <BalanceCard :balance="balance" @withdraw="handleWithdraw" />

    <ExploreMenu :items="EXPLORE_ITEMS" @select="handleExplore" />

    <!-- Pengumuman RT -->
    <section>
      <div class="flex items-baseline justify-between gap-3">
        <h2 class="text-body-reg font-bold text-neutral-900">Pengumuman RT</h2>
        <button
          type="button"
          class="cursor-pointer text-body-sm font-medium text-primary-500 underline underline-offset-2"
        >
          Lihat Semua
        </button>
      </div>

      <!-- Digeser ke samping; -mx-6 px-6 supaya kartunya bisa mepet tepi layar. -->
      <div
        class="no-scrollbar -mx-6 mt-3 flex snap-x snap-mandatory gap-4 overflow-x-auto px-6 pb-2"
      >
        <ContentCard
          v-for="item in announcements"
          :key="item.id"
          class="w-60 shrink-0 snap-start"
          :title="item.title"
          :date="item.date"
          :excerpt="item.excerpt"
          @open="handleOpenContent(item.id)"
        />
      </div>
    </section>

    <!-- Edukasi Sampah -->
    <section>
      <div class="flex items-baseline justify-between gap-3">
        <h2 class="text-body-reg font-bold text-neutral-900">Edukasi Sampah</h2>
        <button
          type="button"
          class="cursor-pointer text-body-sm font-medium text-primary-500 underline underline-offset-2"
        >
          Lihat Semua
        </button>
      </div>

      <div
        class="no-scrollbar -mx-6 mt-3 flex snap-x snap-mandatory gap-4 overflow-x-auto px-6 pb-2"
      >
        <ContentCard
          v-for="item in educations"
          :key="item.id"
          class="w-60 shrink-0 snap-start"
          :title="item.title"
          :date="item.date"
          :excerpt="item.excerpt"
          @open="handleOpenContent(item.id)"
        />
      </div>
    </section>
  </main>
</template>
