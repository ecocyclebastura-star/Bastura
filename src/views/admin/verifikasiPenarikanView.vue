<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import AlertToast from "../../components/AlertToast.vue";
import BaseButton from "../../components/BaseButton.vue";
import BaseDialog from "../../components/BaseDialog.vue";
import EmptyState from "../../components/EmptyState.vue";
import PageHeader from "../../components/PageHeader.vue";
import WithdrawalVerifyCard from "../../components/cards/WithdrawalVerifyCard.vue";
import { resolveAuthError, statusFallback } from "../../constants/authErrors";
import { useToast } from "../../composables/useToast";
import { useAdminTransactionStore } from "../../stores/adminTransactionStore";
import type { PendingWithdrawal } from "../../stores/adminTransactionStore";

const transactionStore = useAdminTransactionStore();
const { toastMessage, toastVariant, showToast } = useToast();

const items = ref<PendingWithdrawal[]>([]);
const loading = ref(true);
const loadError = ref("");

/**
 * Kalimat gagal versi bahasa bisnis.
 *
 * Service admin di src-tauri meneruskan body respons server apa adanya, jadi
 * pesan aslinya kerap berupa JSON mentah. Kalimat di bawah yang dipakai kalau
 * pesan server tidak layak tampil; kalau servernya mengirim alasan yang jelas
 * (mis. saldo warga tidak mencukupi), alasan itu yang menang.
 */
const LOAD_ERRORS: Record<number, string> = {
  401: "Sesi Anda sudah berakhir. Masuk kembali untuk melihat permintaan penarikan.",
  403: "Akun Anda tidak memiliki akses ke daftar permintaan penarikan.",
  429: "Terlalu banyak permintaan dalam waktu singkat. Tunggu sebentar, lalu muat ulang.",
  500: "Server sedang bermasalah sehingga daftar penarikan belum bisa dimuat. Coba lagi beberapa saat lagi.",
};

const LOAD_ERROR = "Gagal memuat permintaan penarikan. Coba lagi sebentar lagi.";

async function load() {
  loading.value = true;
  loadError.value = "";

  try {
    items.value = await transactionStore.fetchPendingWithdrawals();
  } catch (error) {
    items.value = [];
    loadError.value = resolveAuthError(
      error,
      statusFallback(error, LOAD_ERRORS, LOAD_ERROR),
    );
  } finally {
    loading.value = false;
  }
}

onMounted(load);

/* ============================== KEPUTUSAN ============================== */

type Decision = "approve" | "reject";

const DECISIONS = {
  approve: {
    title: "Setujui Penarikan Saldo?",
    message: "Permintaan penarikan saldo dari warga akan disetujui dan diproses. Lanjutkan?",
    confirmLabel: "Setujui",
    success: "Permintaan penarikan saldo berhasil disetujui.",
    /** Toast-nya ikut warna keputusan: centang hijau vs silang. */
    toastVariant: "success",
    /** Status yang dipasang ke kartu supaya badge-nya langsung berganti. */
    status: "disetujui",
    run: (id: string) => transactionStore.approveWithdrawal(id),
  },
  reject: {
    title: "Tolak Penarikan Saldo?",
    message:
      "Permintaan penarikan saldo dari warga akan ditolak. Pastikan data penarikan sudah diperiksa sebelum melanjutkan.",
    confirmLabel: "Tolak",
    success: "Permintaan penarikan saldo telah ditolak.",
    toastVariant: "error",
    status: "ditolak",
    run: (id: string) => transactionStore.rejectWithdrawal(id),
  },
} as const;

const DECISION_ERRORS: Record<number, string> = {
  400: "Permintaan penarikan ini tidak bisa diproses lagi. Muat ulang halaman untuk melihat status terbarunya.",
  401: "Sesi Anda sudah berakhir. Masuk kembali untuk melanjutkan verifikasi.",
  403: "Akun Anda tidak memiliki akses untuk memverifikasi penarikan saldo.",
  404: "Permintaan penarikan ini sudah tidak ada. Muat ulang halaman untuk melihat daftar terbaru.",
  409: "Permintaan penarikan ini sudah diverifikasi sebelumnya. Muat ulang halaman untuk melihat status terbarunya.",
  422: "Data penarikan ini belum lengkap atau tidak sesuai, jadi belum bisa diproses.",
  429: "Terlalu banyak permintaan dalam waktu singkat. Tunggu sebentar, lalu coba lagi.",
  500: "Server sedang bermasalah sehingga keputusan Anda belum tersimpan. Coba lagi beberapa saat lagi.",
};

const DECISION_ERROR =
  "Permintaan penarikan belum berhasil diproses. Coba lagi atau periksa koneksi Anda.";

const pending = ref<{ decision: Decision; item: PendingWithdrawal } | null>(null);
const submitting = ref(false);

const dialogCopy = computed(() => (pending.value ? DECISIONS[pending.value.decision] : null));

function ask(decision: Decision, item: PendingWithdrawal) {
  pending.value = { decision, item };
}

function closeDialog() {
  if (!submitting.value) pending.value = null;
}

async function confirmDecision() {
  if (!pending.value || submitting.value) return;

  const { decision, item } = pending.value;
  const copy = DECISIONS[decision];
  submitting.value = true;

  try {
    await copy.run(item.id_transaksi);
    // Kartunya dibiarkan di daftar dengan badge hasil keputusan, sesuai desain;
    // baru hilang waktu halaman dimuat ulang.
    items.value = items.value.map((entry) =>
      entry.id_transaksi === item.id_transaksi ? { ...entry, status: copy.status } : entry,
    );
    showToast(copy.success, copy.toastVariant);
  } catch (error) {
    showToast(
      resolveAuthError(error, statusFallback(error, DECISION_ERRORS, DECISION_ERROR)),
      "error",
    );
  } finally {
    submitting.value = false;
    pending.value = null;
  }
}
</script>

<template>
  <main class="mx-auto flex w-full max-w-sm flex-col gap-4 px-6 pt-safe">
    <PageHeader title="Verifikasi Penarikan" fallback="dashboard-admin" />

    <div v-if="loading" class="flex flex-col gap-4" aria-hidden="true">
      <div
        v-for="n in 3"
        :key="n"
        class="h-26 animate-pulse rounded-2xl bg-neutral-200"
      />
    </div>

    <div
      v-else-if="loadError"
      class="rounded-2xl border border-red-200 bg-red-50 p-4"
      role="alert"
    >
      <p class="text-body-sm text-red-700">{{ loadError }}</p>
      <button
        type="button"
        class="mt-3 cursor-pointer rounded-full bg-red-600 px-4 py-2 text-body-sm font-bold text-white transition-colors duration-200 hover:bg-red-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
        @click="load"
      >
        Coba Lagi
      </button>
    </div>

    <EmptyState
      v-else-if="items.length === 0"
      title="Belum ada permintaan penarikan"
      message="Permintaan penarikan saldo dari warga akan tampil di sini."
    />

    <div v-else class="flex flex-col gap-4 pb-4">
      <WithdrawalVerifyCard
        v-for="item in items"
        :key="item.id_transaksi"
        :item="item"
        :busy="submitting && pending?.item.id_transaksi === item.id_transaksi"
        @approve="ask('approve', item)"
        @reject="ask('reject', item)"
      />
    </div>

    <BaseDialog
      :open="dialogCopy !== null"
      :title="dialogCopy?.title ?? ''"
      :message="dialogCopy?.message"
      dismissible
      @close="closeDialog"
    >
      <template #actions>
        <BaseButton
          class="flex-1"
          label="Batal"
          variant="warning"
          :block="false"
          :disabled="submitting"
          @click="closeDialog"
        />
        <BaseButton
          class="flex-1"
          :label="dialogCopy?.confirmLabel ?? ''"
          variant="accent"
          :block="false"
          :loading="submitting"
          @click="confirmDecision"
        />
      </template>
    </BaseDialog>

    <!-- Setelah BaseDialog: sama-sama z-50, toast harus tetap di atas. -->
    <AlertToast :message="toastMessage" :variant="toastVariant" />
  </main>
</template>
