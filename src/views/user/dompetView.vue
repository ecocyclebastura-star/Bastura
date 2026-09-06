<script setup lang="ts">
import { onMounted } from "vue";
import { useRouter } from "vue-router";
import BalanceCard from "../../components/cards/BalanceCard.vue";
import EmptyState from "../../components/EmptyState.vue";
import TransactionList from "../../components/TransactionList.vue";
import { useBalanceStore } from "../../stores/balanceStore";
import { useTransactionStore } from "../../stores/transactionStore";
import type { Transaction } from "../../stores/transactionStore";

const router = useRouter();
const balanceStore = useBalanceStore();
const transactionStore = useTransactionStore();

onMounted(() => transactionStore.loadRecent());

function openDetail(item: Transaction) {
  router.push({
    name: "user-riwayat-detail",
    params: { id: item.id_transaksi },
  });
}
</script>

<template>
  <main class="mx-auto flex w-full max-w-sm flex-col gap-5 px-6 pt-safe">
    <h1 class="pt-6 text-h4 font-extrabold text-neutral-900">Dompet</h1>

    <!-- Saldo datang dari event `on_balance_update`; skeleton tampil sampai
         kiriman pertama masuk. -->
    <BalanceCard
      :balance="balanceStore.saldo"
      :loading="balanceStore.isWaitingFirstUpdate"
      @withdraw="router.push({ name: 'user-tarik-saldo' })"
    />

    <section>
      <div class="flex items-baseline justify-between gap-3">
        <h2 class="text-body-reg font-bold text-neutral-900">
          Riwayat Transaksi
        </h2>
        <RouterLink
          :to="{ name: 'user-riwayat' }"
          class="cursor-pointer text-body-sm font-medium text-primary-500 underline underline-offset-2"
        >
          Lihat Semua
        </RouterLink>
      </div>

      <p
        v-if="transactionStore.recentError"
        class="mt-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-body-sm text-red-700"
        role="alert"
      >
        {{ transactionStore.recentError }}
      </p>

      <div
        v-else-if="transactionStore.recentLoading"
        class="mt-3 flex flex-col gap-3"
      >
        <div
          v-for="n in 3"
          :key="n"
          class="h-20 animate-pulse rounded-2xl bg-neutral-200"
          aria-hidden="true"
        />
      </div>

      <EmptyState
        v-else-if="transactionStore.recent.length === 0"
        title="Belum ada transaksi"
        message="Setorkan sampah pertamamu untuk mulai mengumpulkan tabungan"
      />

      <TransactionList
        v-else
        class="mt-3"
        :items="transactionStore.recent"
        @open="openDetail"
      />
    </section>
  </main>
</template>
