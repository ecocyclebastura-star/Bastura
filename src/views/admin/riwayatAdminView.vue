<script setup lang="ts">
import { computed, onMounted } from "vue";
import { useRouter } from "vue-router";
import EmptyState from "../../components/EmptyState.vue";
import FilterChips from "../../components/FilterChips.vue";
import TransactionList from "../../components/TransactionList.vue";
import { TRANSACTION_FILTERS } from "../../constants/transactions";
import { useAdminTransactionStore } from "../../stores/adminTransactionStore";
import type { AdminTransaction } from "../../stores/adminTransactionStore";

const router = useRouter();
const transactionStore = useAdminTransactionStore();

const chips = TRANSACTION_FILTERS.map(({ value, label }) => ({ value, label }));

/** Disimpan di store supaya chip terakhir tetap sama waktu balik dari detail. */
const activeFilter = computed({
  get: () => transactionStore.activeFilter,
  set: (value: string) => {
    transactionStore.setFilter(value);
  },
});

onMounted(() => {
  transactionStore.loadHistory();
});

/** Riwayat admin berisi transaksi semua warga, jadi judul barisnya nama warga. */
const ownerName = (item: AdminTransaction) => item.nama_warga;

function openDetail(item: AdminTransaction) {
  router.push({
    name: "admin-riwayat-detail",
    params: { id: item.id_transaksi },
  });
}
</script>

<template>
  <main class="mx-auto flex w-full max-w-sm flex-col gap-4 px-6 pt-safe">
    <h1 class="pt-6 text-h4 font-extrabold text-neutral-900">
      Riwayat Transaksi
    </h1>

    <!-- Tidak toggleable: desain admin selalu menyalakan satu chip. -->
    <FilterChips v-model="activeFilter" :chips="chips" />

    <div
      v-if="transactionStore.listError"
      class="rounded-2xl border border-red-200 bg-red-50 p-4"
      role="alert"
    >
      <p class="text-body-sm text-red-700">{{ transactionStore.listError }}</p>
      <button
        type="button"
        class="mt-3 cursor-pointer rounded-full bg-red-600 px-4 py-2 text-body-sm font-bold text-white transition-colors duration-200 hover:bg-red-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
        @click="transactionStore.loadHistory()"
      >
        Coba Lagi
      </button>
    </div>

    <div v-else-if="transactionStore.listLoading" class="flex flex-col gap-3">
      <div
        v-for="n in 4"
        :key="n"
        class="h-20 animate-pulse rounded-2xl bg-neutral-200"
        aria-hidden="true"
      />
    </div>

    <EmptyState
      v-else-if="transactionStore.items.length === 0"
      title="Belum ada transaksi"
      message="Setorkan sampah pertamamu untuk mulai mengumpulkan tabungan"
    />

    <template v-else>
      <TransactionList
        :items="transactionStore.items"
        :title-of="ownerName"
        @open="openDetail"
      />

      <button
        v-if="transactionStore.nextCursor"
        type="button"
        class="mx-auto cursor-pointer py-2 text-body-sm font-semibold text-primary-600 underline underline-offset-2 disabled:opacity-60"
        :disabled="transactionStore.listLoadingMore"
        @click="transactionStore.loadMore()"
      >
        {{ transactionStore.listLoadingMore ? "Memuat..." : "Muat lebih banyak" }}
      </button>
    </template>
  </main>
</template>
