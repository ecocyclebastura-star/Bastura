<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import AlertToast from "../../components/AlertToast.vue";
import BaseButton from "../../components/BaseButton.vue";
import BaseDialog from "../../components/BaseDialog.vue";
import EmptyState from "../../components/EmptyState.vue";
import FilterChips from "../../components/FilterChips.vue";
import PageHeader from "../../components/PageHeader.vue";
import SearchBar from "../../components/SearchBar.vue";
import TransactionList from "../../components/TransactionList.vue";
import WargaProfileCard from "../../components/cards/WargaProfileCard.vue";
import { resolveAuthError, toAppError } from "../../constants/authErrors";
import { TRANSACTION_FILTERS } from "../../constants/transactions";
import {
  canBlockWarga,
  canManageAdminRole,
  canSeeBlockedBadge,
  canSeeRoleBadge,
  normalizeRole,
} from "../../constants/wargaAccess";
import { useToast } from "../../composables/useToast";
import { useAuthStore } from "../../stores/authStore";
import { useAdminTransactionStore } from "../../stores/adminTransactionStore";
import type { Transaction } from "../../stores/transactionStore";
import { COMMAND_UNAVAILABLE, useWargaStore } from "../../stores/wargaStore";
import type { Warga } from "../../stores/wargaStore";

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
const wargaStore = useWargaStore();
const adminTransactionStore = useAdminTransactionStore();
const { toastMessage, toastVariant, showToast } = useToast();

const idUser = computed(() => String(route.params.id ?? ""));

/* ================================ PROFIL ================================ */

// Salinan dari halaman daftar langsung dipakai, jadi kartunya tidak kosong
// selama data terbarunya diambil.
const warga = ref<Warga | null>(wargaStore.findCached(idUser.value));
const loading = ref(!warga.value);
const loadError = ref("");

async function loadWarga() {
  loadError.value = "";
  if (!warga.value) loading.value = true;

  try {
    const detail = await wargaStore.fetchDetail(idUser.value);
    warga.value = detail;
    wargaStore.patch(detail);
  } catch (error) {
    const message = resolveAuthError(error, "Gagal memuat data warga.");
    if (warga.value) showToast(message, "error");
    else loadError.value = message;
  } finally {
    loading.value = false;
  }
}

const viewerRole = computed(() => authStore.role);
const viewerId = computed(() => authStore.user?.id ?? "");

const access = computed(() => {
  const target = warga.value;
  return {
    showRoleBadge: canSeeRoleBadge(viewerRole.value),
    showBlockedBadge: canSeeBlockedBadge(viewerRole.value),
    canManageRole: target
      ? canManageAdminRole(viewerRole.value, viewerId.value, target)
      : false,
    canBlock: target ? canBlockWarga(viewerRole.value, viewerId.value, target) : false,
  };
});

/* ============================ UBAH AKSES AKUN ============================ */

type AccessAction = "promote" | "demote" | "block" | "unblock";

interface ActionCopy {
  title: string;
  message: string;
  confirmLabel: string;
  success: string;
  run: (id: string) => Promise<unknown>;
  /** Perubahan yang diterapkan ke kartu setelah command berhasil. */
  apply: (target: Warga) => Warga;
}

const ACTIONS: Record<AccessAction, ActionCopy> = {
  promote: {
    title: "Jadikan pengguna sebagai admin?",
    message:
      "Sebelum menjadikan warga sebagai admin, pastikan saldo sudah Rp0 dan semua transaksi sudah selesai. Pastikan pengguna yang dipilih sudah sesuai.",
    confirmLabel: "Jadikan Admin",
    success: "Pengguna sekarang memiliki akses sebagai admin.",
    run: (id) => wargaStore.promoteToAdmin(id),
    apply: (target) => ({ ...target, role: "admin" }),
  },
  demote: {
    title: "Cabut akses admin dari user ini?",
    message:
      "Akses admin pengguna ini akan dicabut dan dikembalikan menjadi akses warga Bastura. Lanjutkan?",
    confirmLabel: "Cabut",
    success: "Pengguna sekarang memiliki akses sebagai warga.",
    run: (id) => wargaStore.demoteToWarga(id),
    apply: (target) => ({ ...target, role: "warga" }),
  },
  block: {
    title: "Blokir warga ini?",
    message:
      "Warga akan tidak dapat mengakses akun Bastura sampai aksesnya dibuka kembali.",
    confirmLabel: "Blokir",
    success: "Akses akun warga telah diblokir.",
    run: (id) => wargaStore.block(id),
    apply: (target) => ({ ...target, is_blocked: true }),
  },
  unblock: {
    title: "Buka blokir warga ini?",
    message: "Warga dapat kembali mengakses akun Bastura setelah blokir dibuka.",
    confirmLabel: "Buka Blokir",
    success: "Akun warga sekarang dapat kembali diakses.",
    run: (id) => wargaStore.unblock(id),
    apply: (target) => ({ ...target, is_blocked: false }),
  },
};

const ACCESS_ERROR =
  "Akses pengguna belum berhasil diubah. Coba lagi atau periksa koneksi Anda.";

/** Pesan dari server (mis. saldo belum Rp0) lebih berguna daripada kalimat umum. */
const SPECIFIC_ERROR_CODES = [
  "API_ERROR",
  "FORBIDDEN",
  "VALIDATION_ERROR",
  COMMAND_UNAVAILABLE,
];

const pendingAction = ref<AccessAction | null>(null);
const submitting = ref(false);

const dialogCopy = computed(() =>
  pendingAction.value ? ACTIONS[pendingAction.value] : null,
);

function askToggleRole() {
  if (!warga.value) return;
  pendingAction.value =
    normalizeRole(warga.value.role) === "admin" ? "demote" : "promote";
}

function askToggleBlock() {
  if (!warga.value) return;
  pendingAction.value = warga.value.is_blocked ? "unblock" : "block";
}

function closeDialog() {
  if (!submitting.value) pendingAction.value = null;
}

async function confirmAction() {
  const action = pendingAction.value;
  const target = warga.value;
  if (!action || !target || submitting.value) return;

  submitting.value = true;
  const copy = ACTIONS[action];

  try {
    await copy.run(target.id);
    warga.value = copy.apply(target);
    wargaStore.patch(warga.value);
    showToast(copy.success, "success");
  } catch (error) {
    const code = toAppError(error)?.code ?? "";
    showToast(
      SPECIFIC_ERROR_CODES.includes(code)
        ? resolveAuthError(error, ACCESS_ERROR)
        : ACCESS_ERROR,
      "error",
    );
  } finally {
    submitting.value = false;
    pendingAction.value = null;
  }
}

/* ============================ RIWAYAT TRANSAKSI ============================ */

const PAGE_LIMIT = 20;

const chips = TRANSACTION_FILTERS.map(({ value, label }) => ({ value, label }));
// Desainnya selalu menyalakan satu chip, jadi dibuka di "Setoran".
const activeFilter = ref(TRANSACTION_FILTERS[0].value);

const transactions = ref<Transaction[]>([]);
const nextCursor = ref<string | null>(null);
const txLoading = ref(true);
const txLoadingMore = ref(false);
const txError = ref("");

let latestTxRequest = 0;

function filterQuery() {
  const filter = TRANSACTION_FILTERS.find((item) => item.value === activeFilter.value);
  return { jenis: filter?.jenis, status: filter?.status, limit: PAGE_LIMIT };
}

async function loadTransactions() {
  // Ganti chip cepat-cepat: respons yang datang telat dibuang.
  const requestId = ++latestTxRequest;
  txLoading.value = true;
  txError.value = "";

  try {
    const page = await wargaStore.fetchTransactions(idUser.value, filterQuery());
    if (requestId !== latestTxRequest) return;
    transactions.value = page.data;
    nextCursor.value = page.next_cursor;
  } catch (error) {
    if (requestId !== latestTxRequest) return;
    transactions.value = [];
    nextCursor.value = null;
    txError.value = resolveAuthError(
      error,
      "Gagal memuat riwayat transaksi. Coba lagi sebentar lagi.",
    );
  } finally {
    if (requestId === latestTxRequest) txLoading.value = false;
  }
}

async function loadMoreTransactions() {
  if (!nextCursor.value || txLoadingMore.value) return;

  const requestId = latestTxRequest;
  txLoadingMore.value = true;

  try {
    const page = await wargaStore.fetchTransactions(idUser.value, {
      ...filterQuery(),
      cursor: nextCursor.value,
    });
    if (requestId !== latestTxRequest) return;
    transactions.value.push(...page.data);
    nextCursor.value = page.next_cursor;
  } catch (error) {
    if (requestId !== latestTxRequest) return;
    showToast(resolveAuthError(error, "Gagal memuat transaksi berikutnya."), "error");
  } finally {
    txLoadingMore.value = false;
  }
}

watch(activeFilter, loadTransactions);

/**
 * Halaman detail transaksi admin membaca dari store-nya, jadi transaksinya
 * dititipkan dulu beserta nama pemiliknya.
 */
function openTransaction(item: Transaction) {
  adminTransactionStore.remember([
    { ...item, id_user: idUser.value, nama_warga: warga.value?.name ?? "" },
  ]);
  router.push({ name: "admin-riwayat-detail", params: { id: item.id_transaksi } });
}

/* ================================ PENCARIAN ================================ */

// Search bar di halaman detail mencari warga lain, jadi hasilnya dibuka di
// halaman daftar.
const searchTerm = ref("");

function searchWarga() {
  const q = searchTerm.value.trim();
  if (q) router.push({ name: "admin-warga", query: { q } });
}

onMounted(() => {
  loadWarga();
  loadTransactions();
});
</script>

<template>
  <main class="mx-auto flex w-full max-w-sm flex-col gap-4 px-6 pt-safe">
    <PageHeader title="Detail Warga" fallback="admin-warga" />

    <SearchBar
      v-model="searchTerm"
      placeholder="Cari nama warga"
      label="Cari nama warga"
      @submit="searchWarga"
    />

    <div
      v-if="loading"
      class="h-80 animate-pulse rounded-3xl bg-neutral-200"
      aria-hidden="true"
    />

    <div
      v-else-if="loadError || !warga"
      class="rounded-2xl border border-red-200 bg-red-50 p-4"
      role="alert"
    >
      <p class="text-body-sm text-red-700">
        {{ loadError || "Data warga tidak ditemukan." }}
      </p>
      <button
        type="button"
        class="mt-3 cursor-pointer rounded-full bg-red-600 px-4 py-2 text-body-sm font-bold text-white transition-colors duration-200 hover:bg-red-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
        @click="loadWarga"
      >
        Coba Lagi
      </button>
    </div>

    <WargaProfileCard
      v-else
      :warga="warga"
      :show-role-badge="access.showRoleBadge"
      :show-blocked-badge="access.showBlockedBadge"
      :can-manage-role="access.canManageRole"
      :can-block="access.canBlock"
      :busy="submitting"
      @toggle-role="askToggleRole"
      @toggle-block="askToggleBlock"
    />

    <section class="mt-2 flex flex-col gap-3 pb-4">
      <h2 class="text-body-md font-extrabold text-neutral-900">Riwayat Transaksi</h2>

      <FilterChips v-model="activeFilter" :chips="chips" />

      <p
        v-if="txError"
        class="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-body-sm text-red-700"
        role="alert"
      >
        {{ txError }}
      </p>

      <div v-else-if="txLoading" class="flex flex-col gap-3" aria-hidden="true">
        <div
          v-for="n in 3"
          :key="n"
          class="h-20 animate-pulse rounded-2xl bg-neutral-200"
        />
      </div>

      <EmptyState
        v-else-if="transactions.length === 0"
        title="Belum ada transaksi"
        message="Setorkan sampah pertamamu untuk mulai mengumpulkan tabungan"
      />

      <template v-else>
        <TransactionList :items="transactions" @open="openTransaction" />

        <button
          v-if="nextCursor"
          type="button"
          class="mx-auto cursor-pointer py-2 text-body-sm font-semibold text-primary-600 underline underline-offset-2 disabled:opacity-60"
          :disabled="txLoadingMore"
          @click="loadMoreTransactions"
        >
          {{ txLoadingMore ? "Memuat..." : "Muat lebih banyak" }}
        </button>
      </template>
    </section>

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
          @click="confirmAction"
        />
      </template>
    </BaseDialog>

    <!-- Setelah BaseDialog: sama-sama z-50, toast harus tetap di atas. -->
    <AlertToast :message="toastMessage" :variant="toastVariant" />
  </main>
</template>
