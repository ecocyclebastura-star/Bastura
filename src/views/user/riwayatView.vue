<script setup lang="ts">
import { computed, onMounted } from "vue";
import { useRouter } from "vue-router";
import AlertToast from "../../components/AlertToast.vue";
import EmptyState from "../../components/EmptyState.vue";
import FilterChips from "../../components/FilterChips.vue";
import TransactionList from "../../components/TransactionList.vue";
import { TRANSACTION_FILTERS } from "../../constants/transactions";
import { useToast } from "../../composables/useToast";
import { useTransactionStore } from "../../stores/transactionStore";
import type { Transaction } from "../../stores/transactionStore";

const router = useRouter();
const transactionStore = useTransactionStore();
const { toastMessage, toastVariant, showToast } = useToast();

const chips = TRANSACTION_FILTERS.map(({ value, label }) => ({ value, label }));

/**
 * Filternya disimpan di store, bukan di halaman ini, supaya pilihan terakhir
 * tetap sama waktu user balik dari halaman detail.
 */
const activeFilter = computed({
  get: () => transactionStore.activeFilter,
  set: (value: string) => {
    transactionStore.setFilter(value);
  },
});

onMounted(() => {
  transactionStore.loadHistory();

  // Titipan dari halaman detail, mis. hasil pembatalan penarikan.
  const flash = transactionStore.takeFlash();
  if (flash.message) showToast(flash.message, flash.variant);
});

function openDetail(item: Transaction) {
  router.push({
    name: "user-riwayat-detail",
    params: { id: item.id_transaksi },
  });
}
</script>

<template>
  <main class="mx-auto flex w-full max-w-sm flex-col gap-4 px-6 pt-safe">
    <AlertToast :message="toastMessage" :variant="toastVariant" />

    <h1 class="pt-6 text-h4 font-extrabold text-neutral-900">
      Riwayat Transaksi
    </h1>

    <!-- Tanpa chip "Semua": chip yang aktif dimatikan lagi dengan diklik
         ulang, dan itulah tampilan seluruh transaksi. -->
    <FilterChips v-model="activeFilter" :chips="chips" toggleable />

    <p
      v-if="transactionStore.listError"
      class="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-body-sm text-red-700"
      role="alert"
    >
      {{ transactionStore.listError }}
    </p>

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
      <TransactionList :items="transactionStore.items" @open="openDetail" />

      <!-- Desainnya belum mengatur cara memuat halaman berikutnya, jadi
           dipakai tombol sederhana yang cuma muncul kalau memang masih ada. -->
      <button
        v-if="transactionStore.nextCursor"
        type="button"
        class="mx-auto cursor-pointer py-2 text-body-sm font-semibold text-primary-600 underline underline-offset-2 disabled:opacity-60"
        :disabled="transactionStore.listLoadingMore"
        @click="transactionStore.loadMore()"
      >
        {{
          transactionStore.listLoadingMore
            ? "Memuat..."
            : "Muat lebih banyak"
        }}
      </button>
    </template>
  </main>
</template>
