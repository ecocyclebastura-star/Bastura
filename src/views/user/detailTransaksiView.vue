<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import BaseButton from "../../components/BaseButton.vue";
import BaseDialog from "../../components/BaseDialog.vue";
import PageHeader from "../../components/PageHeader.vue";
import TransactionDetailContent from "../../components/TransactionDetailContent.vue";
import { resolveAuthError } from "../../constants/authErrors";
import { isCancelable } from "../../constants/transactions";
import { useTransactionStore } from "../../stores/transactionStore";
import type { Transaction } from "../../stores/transactionStore";

const route = useRoute();
const router = useRouter();
const transactionStore = useTransactionStore();

const transaction = ref<Transaction | null>(null);
const loading = ref(true);
const loadError = ref("");
const confirmOpen = ref(false);
const canceling = ref(false);

const canCancel = computed(() =>
  isCancelable(transaction.value?.jenis_transaksi, transaction.value?.status),
);

onMounted(async () => {
  const id = route.params.id as string;

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

/**
 * Hasilnya diumumkan lewat toast di halaman Riwayat -- daftarnya perlu ditarik
 * ulang supaya statusnya ikut berubah, jadi halaman ini tidak menahan user di
 * tampilan yang datanya sudah basi.
 */
async function handleCancel() {
  if (!transaction.value || canceling.value) return;

  canceling.value = true;
  try {
    await transactionStore.cancelWithdrawal(transaction.value.id_transaksi);
    transactionStore.setFlash("Perubahan berhasil disimpan.", "success");
  } catch {
    transactionStore.setFlash("Perubahan gagal disimpan.", "error");
  } finally {
    canceling.value = false;
    confirmOpen.value = false;
    router.push({ name: "user-riwayat" });
  }
}
</script>

<template>
  <main class="mx-auto flex w-full max-w-sm flex-col px-6 pt-safe">
    <PageHeader fallback="user-riwayat" />

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

    <TransactionDetailContent v-else-if="transaction" :transaction="transaction">
      <BaseButton
        v-if="canCancel"
        class="mx-auto mt-10 w-4/5"
        label="Batalkan Penarikan"
        variant="warning"
        :block="false"
        @click="confirmOpen = true"
      />

      <BaseDialog
        :open="confirmOpen"
        dismissible
        title="Batalkan penarikan?"
        message="Permintaan penarikan ini belum disetujui oleh admin. Jika dibatalkan, proses penarikan akan dihentikan"
        @close="confirmOpen = false"
      >
        <template #actions>
          <BaseButton
            class="flex-1"
            label="Kembali"
            variant="accent"
            :block="false"
            :disabled="canceling"
            @click="confirmOpen = false"
          />
          <BaseButton
            class="flex-1"
            label="Batalkan"
            variant="warning"
            :block="false"
            :loading="canceling"
            @click="handleCancel"
          />
        </template>
      </BaseDialog>
    </TransactionDetailContent>
  </main>
</template>
