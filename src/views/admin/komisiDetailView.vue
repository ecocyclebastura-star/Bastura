<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useRoute } from "vue-router";
import AppIcon from "../../components/AppIcon.vue";
import PageHeader from "../../components/PageHeader.vue";
import { resolveAuthError } from "../../constants/authErrors";
import {
  formatPeriodeKomisi,
  formatPersen,
  toNumber,
  useCommissionStore,
} from "../../stores/commissionStore";
import type { CommissionDetail } from "../../stores/commissionStore";
import { formatRupiah } from "../../utils/formatters";

const route = useRoute();
const store = useCommissionStore();

const periode = computed(() => String(route.params.periode ?? ""));

const detail = ref<CommissionDetail | null>(null);
const loading = ref(true);
const errorMessage = ref("");

/**
 * Tarif bisa berubah di tengah bulan, jadi satu periode bisa punya beberapa
 * segmen. Satu segmen ditampilkan persis seperti desain (satu baris
 * persentase); lebih dari itu, tiap segmen dapat barisnya sendiri.
 */
const singleSegment = computed(() =>
  detail.value && detail.value.segments.length <= 1 ? (detail.value.segments[0] ?? null) : null,
);

async function load() {
  loading.value = true;
  errorMessage.value = "";

  try {
    detail.value = await store.fetchDetail(periode.value);
  } catch (error) {
    errorMessage.value = resolveAuthError(
      error,
      "Gagal memuat rincian komisi. Coba lagi sebentar lagi.",
    );
  } finally {
    loading.value = false;
  }
}

onMounted(load);

const rowClass = "flex items-center justify-between gap-3 text-body-sm text-neutral-800";
</script>

<template>
  <main class="mx-auto flex w-full max-w-sm flex-col gap-5 px-6 pt-safe">
    <PageHeader title="Detail Keuntungan" fallback="admin-komisi" />

    <div class="text-center">
      <p class="text-body-md text-neutral-900">Periode</p>
      <p class="text-h4 font-extrabold text-neutral-900">{{ formatPeriodeKomisi(periode) }}</p>
    </div>

    <div v-if="loading" class="flex flex-col gap-5" aria-hidden="true">
      <div class="h-32 animate-pulse rounded-2xl bg-neutral-200" />
      <div class="h-36 animate-pulse rounded-2xl bg-neutral-200" />
    </div>

    <div
      v-else-if="errorMessage || !detail"
      class="rounded-2xl border border-red-200 bg-red-50 p-4"
      role="alert"
    >
      <p class="text-body-sm text-red-700">{{ errorMessage || "Rincian komisi tidak ditemukan." }}</p>
      <button
        type="button"
        class="mt-3 cursor-pointer rounded-full bg-red-600 px-4 py-2 text-body-sm font-bold text-white transition-colors duration-200 hover:bg-red-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
        @click="load"
      >
        Coba Lagi
      </button>
    </div>

    <template v-else>
      <section
        class="flex flex-col items-center rounded-2xl border border-secondary-500 bg-secondary-100 px-4 py-5"
      >
        <AppIcon name="penarikan" class="size-9 text-primary-700" />
        <p class="mt-1 text-body-reg text-neutral-900">Total Keuntungan</p>
        <p class="text-h3 font-extrabold text-primary-800">
          {{ formatRupiah(toNumber(detail.total_profit)) }}
        </p>
      </section>

      <section class="overflow-hidden rounded-2xl border border-primary-400 bg-primary-100">
        <h2 class="border-b-2 border-primary-400 px-3 py-2 text-body-reg font-extrabold text-neutral-900">
          Rincian Perhitungan
        </h2>

        <dl class="flex flex-col gap-2 px-3 py-3">
          <div :class="rowClass">
            <dt>Total Dana dari BSI</dt>
            <dd>{{ formatRupiah(toNumber(detail.total_dana)) }}</dd>
          </div>

          <div v-if="singleSegment" :class="rowClass">
            <dt>Persentase Komisi</dt>
            <dd>{{ formatPersen(singleSegment.percentage) }}</dd>
          </div>

          <template v-else>
            <div
              v-for="(segment, index) in detail.segments"
              :key="index"
              :class="rowClass"
            >
              <dt>
                Komisi {{ formatPersen(segment.percentage) }}
                <span class="text-neutral-500">
                  × {{ formatRupiah(toNumber(segment.total_fund)) }}
                </span>
              </dt>
              <dd>{{ formatRupiah(toNumber(segment.commission)) }}</dd>
            </div>
          </template>

          <div :class="[rowClass, 'font-bold text-neutral-900']">
            <dt>Nominal komisi</dt>
            <dd>{{ formatRupiah(toNumber(detail.total_profit)) }}</dd>
          </div>
        </dl>
      </section>
    </template>
  </main>
</template>
