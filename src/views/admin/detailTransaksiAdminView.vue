<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useRoute } from "vue-router";
import PageHeader from "../../components/PageHeader.vue";
import TransactionDetailContent from "../../components/TransactionDetailContent.vue";
import { resolveAuthError } from "../../constants/authErrors";
import { useAdminTransactionStore } from "../../stores/adminTransactionStore";
import type { AdminTransaction } from "../../stores/adminTransactionStore";

const route = useRoute();
const transactionStore = useAdminTransactionStore();

const transaction = ref<AdminTransaction | null>(null);
const loading = ref(true);
const loadError = ref("");

onMounted(async () => {
  const id = String(route.params.id ?? "");

  if (!id) {
    loadError.value = "Transaksi tidak ditemukan.";
    loading.value = false;
    return;
  }

  try {
    transaction.value = await transactionStore.findTransaction(id);
    if (!transaction.value) loadError.value = "Transaksi tidak ditemukan.";
  } catch (error) {
    loadError.value = resolveAuthError(
      error,
      "Gagal memuat detail transaksi. Coba lagi sebentar lagi.",
    );
  } finally {
    loading.value = false;
  }
});
</script>

<template>
  <main class="mx-auto flex w-full max-w-sm flex-col px-6 pt-safe">
    <PageHeader fallback="admin-riwayat" />

    <div v-if="loading" class="mt-10 flex flex-col items-center gap-4">
      <div class="size-20 animate-pulse rounded-full bg-neutral-200" />
      <div class="h-6 w-48 animate-pulse rounded-lg bg-neutral-200" />
      <div class="h-10 w-40 animate-pulse rounded-lg bg-neutral-200" />
    </div>

    <p
      v-else-if="loadError"
      class="mt-10 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-body-sm text-red-700"
      role="alert"
    >
      {{ loadError }}
    </p>

    <!-- Admin cuma memantau: tidak ada tombol batalkan seperti di sisi warga. -->
    <TransactionDetailContent
      v-else-if="transaction"
      :transaction="transaction"
      :recipient="transaction.nama_warga || '-'"
    />
  </main>
</template>
