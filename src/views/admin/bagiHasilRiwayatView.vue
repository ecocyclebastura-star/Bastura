<script setup lang="ts">
import { onMounted, ref } from "vue";
import AppIcon from "../../components/AppIcon.vue";
import EmptyState from "../../components/EmptyState.vue";
import PageHeader from "../../components/PageHeader.vue";
import StatusBadge from "../../components/StatusBadge.vue";
import { resolveAuthError } from "../../constants/authErrors";
import { useSetoranStore } from "../../stores/setoranStore";
import type { BagiHasilRiwayat } from "../../stores/setoranStore";
import { formatPeriode, formatRupiah, formatTanggal } from "../../utils/formatters";

const setoranStore = useSetoranStore();

const items = ref<BagiHasilRiwayat[]>([]);
const loading = ref(true);
const errorMessage = ref("");

async function load() {
  loading.value = true;
  errorMessage.value = "";

  try {
    items.value = await setoranStore.fetchRiwayat();
  } catch (error) {
    errorMessage.value = resolveAuthError(
      error,
      "Gagal memuat riwayat pembagian. Coba lagi sebentar lagi.",
    );
  } finally {
    loading.value = false;
  }
}

onMounted(load);

/**
 * Server bisa mengirim tanggal periode sebagai "yyyy-mm-dd" maupun timestamp
 * lengkap; formatPeriode cuma butuh bagian tanggalnya.
 */
function periode(item: BagiHasilRiwayat): string {
  return formatPeriode(item.date_start.slice(0, 10), item.date_end.slice(0, 10));
}
</script>

<template>
  <main class="mx-auto flex w-full max-w-sm flex-col gap-4 px-6 pt-safe">
    <PageHeader title="Riwayat Pembagian" fallback="admin-setoran" />

    <div v-if="loading" class="flex flex-col gap-3" aria-hidden="true">
      <div v-for="n in 3" :key="n" class="h-24 animate-pulse rounded-2xl bg-neutral-200" />
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

    <EmptyState
      v-else-if="items.length === 0"
      title="Belum ada pembagian"
      message="Hasil penjualan yang sudah dibagikan ke warga akan tampil di sini."
    />

    <ul v-else class="flex flex-col gap-3 pb-4">
      <li
        v-for="item in items"
        :key="item.id_sb"
        class="flex items-start gap-3 rounded-2xl border border-primary-400 bg-secondary-100 px-4 py-3"
      >
        <AppIcon name="calendar" class="size-9 shrink-0 text-neutral-900" />

        <div class="min-w-0 flex-1">
          <div class="flex items-start justify-between gap-2">
            <p class="text-body-reg font-bold text-neutral-900">{{ periode(item) }}</p>
            <StatusBadge :status="item.status" />
          </div>

          <p class="mt-0.5 text-h6 font-extrabold text-primary-800">
            {{ formatRupiah(item.total_sb) }}
          </p>

          <p class="mt-1 text-body-tiny text-neutral-700">
            Dibagikan {{ formatTanggal(item.processed_at) || "-" }} oleh
            <span class="font-bold text-neutral-900">{{ item.processed_by_name || "-" }}</span>
          </p>
        </div>
      </li>
    </ul>
  </main>
</template>
