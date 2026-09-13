<script setup lang="ts">
import { computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import EmptyState from "../../components/EmptyState.vue";
import SearchBar from "../../components/SearchBar.vue";
import WargaListItem from "../../components/cards/WargaListItem.vue";
import { canSeeBlockedBadge } from "../../constants/wargaAccess";
import { useSearchableList } from "../../composables/useSearchableList";
import { useAuthStore } from "../../stores/authStore";
import { useWargaStore } from "../../stores/wargaStore";
import type { Warga } from "../../stores/wargaStore";

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
const wargaStore = useWargaStore();

const { searchTerm, items, loading, errorMessage, submit, clearSearch, reload } =
  useSearchableList<Warga>((search) => wargaStore.list(search), {
    fallbackError: "Gagal memuat data warga. Coba lagi sebentar lagi.",
  });

// Pencarian dari search bar halaman detail datang lewat ?q=.
const initialQuery = typeof route.query.q === "string" ? route.query.q.trim() : "";
if (initialQuery) {
  searchTerm.value = initialQuery;
  submit();
}

const showBlockedBadge = computed(() => canSeeBlockedBadge(authStore.role));
const isSearching = computed(() => searchTerm.value.trim().length > 0);

function openDetail(item: Warga) {
  router.push({ name: "admin-warga-detail", params: { id: item.id } });
}
</script>

<template>
  <main class="mx-auto flex w-full max-w-sm flex-col gap-4 px-6 pt-safe">
    <h1 class="pt-6 text-h4 font-extrabold text-neutral-900">Warga</h1>

    <SearchBar
      v-model="searchTerm"
      placeholder="Cari nama warga"
      label="Cari nama warga"
      :loading="loading"
      @submit="submit"
      @clear="clearSearch"
    />

    <div v-if="loading" class="flex flex-col gap-3" aria-hidden="true">
      <div
        v-for="n in 4"
        :key="n"
        class="h-18 animate-pulse rounded-2xl bg-neutral-200"
      />
    </div>

    <div
      v-else-if="errorMessage"
      class="rounded-2xl border border-red-200 bg-red-50 p-4"
      role="alert"
    >
      <p class="text-body-sm text-red-700">{{ errorMessage }}</p>
      <button
        type="button"
        class="mt-3 cursor-pointer rounded-full bg-red-600 px-4 py-2 text-body-sm font-bold text-white transition-colors duration-200 hover:bg-red-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
        @click="reload"
      >
        Coba Lagi
      </button>
    </div>

    <EmptyState
      v-else-if="items.length === 0"
      :title="isSearching ? 'Warga tidak ditemukan' : 'Belum ada warga'"
      :message="
        isSearching
          ? 'Coba periksa lagi ejaan nama warganya.'
          : 'Warga yang sudah mendaftar akan tampil di sini.'
      "
    />

    <div v-else class="flex flex-col gap-3 pb-4">
      <WargaListItem
        v-for="item in items"
        :key="item.id"
        :warga="item"
        :show-blocked-badge="showBlockedBadge"
        @open="openDetail(item)"
      />
    </div>
  </main>
</template>
