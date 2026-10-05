<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import AlertToast from "../../components/AlertToast.vue";
import AppIcon from "../../components/AppIcon.vue";
import EmptyState from "../../components/EmptyState.vue";
import PageHeader from "../../components/PageHeader.vue";
import { resolveAuthError } from "../../constants/authErrors";
import { useToast } from "../../composables/useToast";
import {
  currentPeriode,
  formatPeriodeKomisi,
  formatPersen,
  toNumber,
  useCommissionStore,
} from "../../stores/commissionStore";
import type { CommissionHistoryItem } from "../../stores/commissionStore";
import { formatRupiah } from "../../utils/formatters";

const router = useRouter();
const store = useCommissionStore();
const { toastMessage, toastVariant, showToast } = useToast();

/** Jumlah riwayat per tarikan; tombol "lebih banyak" muncul kalau masih penuh. */
const PAGE_SIZE = 12;

// Ringkasan terakhir di store langsung tampil selama data baru dimuat.
const history = ref<CommissionHistoryItem[]>(store.summary?.history ?? []);
const loading = ref(true);
const loadingMore = ref(false);
const hasMore = ref(false);
const errorMessage = ref("");

const summary = computed(() => store.summary);

/** Riwayat cuma berisi bulan-bulan sebelumnya; bulan berjalan sudah ada di kartu atas. */
const previousMonths = computed(() =>
  history.value.filter((item) => item.periode !== currentPeriode()),
);

async function load() {
  loading.value = true;
  errorMessage.value = "";

  try {
    const data = await store.fetchSummary(PAGE_SIZE);
    history.value = data.history;
    hasMore.value = data.history.length >= PAGE_SIZE;
  } catch (error) {
    errorMessage.value = resolveAuthError(
      error,
      "Gagal memuat data komisi. Coba lagi sebentar lagi.",
    );
  } finally {
    loading.value = false;
  }
}

async function loadMore() {
  if (loadingMore.value) return;
  loadingMore.value = true;

  try {
    const data = await store.fetchSummary(PAGE_SIZE, history.value.length);
    history.value = [...history.value, ...data.history];
    hasMore.value = data.history.length >= PAGE_SIZE;
  } catch (error) {
    showToast(resolveAuthError(error, "Gagal memuat riwayat komisi."), "error");
  } finally {
    loadingMore.value = false;
  }
}

function openDetail(item: CommissionHistoryItem) {
  router.push({ name: "admin-komisi-detail", params: { periode: item.periode } });
}

onMounted(() => {
  load();
  // Titipan dari halaman ubah persentase.
  const flash = store.takeFlash();
  if (flash.message) showToast(flash.message, flash.variant);
});
</script>

<template>
  <main class="mx-auto flex w-full max-w-sm flex-col gap-5 px-6 pt-safe">
    <PageHeader title="Komisi Setoran" fallback="dashboard-admin" />

    <div v-if="loading && !summary" class="flex flex-col gap-4" aria-hidden="true">
      <div class="h-52 animate-pulse rounded-3xl bg-neutral-200" />
      <div v-for="n in 3" :key="n" class="h-20 animate-pulse rounded-2xl bg-neutral-200" />
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
        @click="load"
      >
        Coba Lagi
      </button>
    </div>

    <template v-else-if="summary">
      <section
        class="relative rounded-3xl bg-linear-to-r from-primary-500 to-secondary-400 p-5 text-white shadow-lg shadow-primary-900/15"
        aria-label="Ringkasan komisi bulan ini"
      >
        <p class="text-body-reg">Total Keuntungan Bulan ini</p>
        <p class="mt-1 text-h3 font-extrabold">
          {{ formatRupiah(toNumber(summary.current_month_profit)) }}
        </p>

        <p class="mt-5 text-body-reg">Persentase Komisi Saat ini</p>
        <p class="mt-1 text-h2 font-extrabold">
          {{ formatPersen(summary.current_fee_percentage) }}
        </p>

        <button
          type="button"
          class="absolute right-5 bottom-5 w-16 cursor-pointer rounded-full bg-sky-400 py-1 text-body-sm font-semibold text-white ring-1 ring-white/40 transition-colors duration-200 hover:bg-sky-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
          aria-label="Ubah persentase komisi"
          @click="router.push({ name: 'admin-komisi-edit' })"
        >
          Edit
        </button>
      </section>

      <section class="flex flex-col gap-3 pb-4">
        <h2 class="text-body-md font-extrabold text-neutral-900">
          Riwayat Keuntungan Bulan Sebelumnya
        </h2>

        <EmptyState
          v-if="previousMonths.length === 0"
          title="Belum ada riwayat"
          message="Keuntungan bulan-bulan sebelumnya akan tampil di sini."
        />

        <button
          v-for="item in previousMonths"
          :key="item.periode"
          type="button"
          class="flex w-full cursor-pointer items-center gap-3 rounded-2xl border border-primary-400 bg-secondary-100 px-4 py-3 text-left transition-colors duration-200 hover:bg-secondary-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
          @click="openDetail(item)"
        >
          <AppIcon name="calendar" class="size-9 text-neutral-900" />

          <span class="min-w-0 flex-1">
            <span class="block text-body-reg font-bold text-neutral-900">
              {{ formatPeriodeKomisi(item.periode) }}
            </span>
            <span class="block text-body-tiny text-neutral-700">
              Komisi diterapkan:
              <span class="font-bold text-neutral-900">{{ item.percentage_label || "-" }}</span>
            </span>
          </span>

          <span class="flex shrink-0 flex-col items-end">
            <span class="text-body-reg font-semibold text-neutral-900">
              {{ formatRupiah(toNumber(item.total_profit)) }}
            </span>
            <span class="flex items-center gap-0.5 text-body-sm font-bold text-amber-500">
              Lihat Detail
              <svg
                class="size-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2.6"
                stroke-linecap="round"
                stroke-linejoin="round"
                aria-hidden="true"
              >
                <path d="m9 6 6 6-6 6" />
              </svg>
            </span>
          </span>
        </button>

        <button
          v-if="hasMore"
          type="button"
          class="mx-auto cursor-pointer rounded-full px-4 py-2 text-body-sm font-bold text-primary-700 transition-colors duration-200 hover:bg-primary-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 disabled:opacity-60"
          :disabled="loadingMore"
          @click="loadMore"
        >
          {{ loadingMore ? "Memuat..." : "Tampilkan lebih banyak" }}
        </button>
      </section>
    </template>

    <AlertToast :message="toastMessage" :variant="toastVariant" />
  </main>
</template>
