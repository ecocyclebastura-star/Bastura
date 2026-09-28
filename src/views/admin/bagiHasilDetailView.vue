<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import AvatarPhoto from "../../components/AvatarPhoto.vue";
import EmptyState from "../../components/EmptyState.vue";
import PageHeader from "../../components/PageHeader.vue";
import StatusBadge from "../../components/StatusBadge.vue";
import TransactionKindIcon from "../../components/TransactionKindIcon.vue";
import { resolveAuthError } from "../../constants/authErrors";
import { formatBerat } from "../../constants/setoran";
import { useSetoranStore } from "../../stores/setoranStore";
import type { RincianSetoran } from "../../stores/setoranStore";
import { formatPeriode, formatRibuan, formatRupiah, formatTanggal } from "../../utils/formatters";

const route = useRoute();
const router = useRouter();
const setoranStore = useSetoranStore();

const alokasi = computed(() => setoranStore.findAlokasi(String(route.params.idUser ?? "")));

// Halaman ini cuma membaca draft pembagian; tanpa draft/warganya, kembali.
if (!alokasi.value) {
  router.replace({
    name: setoranStore.draft ? "admin-setoran-bagi-hasil-alokasi" : "admin-setoran-bagi-hasil",
  });
}

const periode = computed(() =>
  setoranStore.draft
    ? formatPeriode(setoranStore.draft.date_start, setoranStore.draft.date_end)
    : "",
);

/**
 * Bagian warga dipecah per setoran oleh backend, dari nominal yang sedang
 * diatur admin -- jadi angkanya ikut berubah kalau nominalnya diubah.
 */
const riwayat = ref<RincianSetoran[]>([]);
const loading = ref(false);
const errorMessage = ref("");

async function loadRiwayat() {
  const target = alokasi.value;
  if (!target || loading.value) return;

  loading.value = true;
  errorMessage.value = "";
  try {
    riwayat.value = await setoranStore.fetchRincian(target.id_user);
  } catch (error) {
    errorMessage.value = resolveAuthError(
      error,
      "Gagal memuat riwayat setoran. Coba lagi sebentar lagi.",
    );
  } finally {
    loading.value = false;
  }
}

onMounted(loadRiwayat);
</script>

<template>
  <main v-if="alokasi" class="mx-auto flex w-full max-w-sm flex-col gap-4 px-6 pt-safe">
    <PageHeader title="Detail Setoran" fallback="admin-setoran-bagi-hasil-alokasi" />

    <header class="flex items-center gap-3">
      <AvatarPhoto class="size-16" />
      <div class="min-w-0">
        <h2 class="truncate text-h5 font-extrabold text-neutral-900">{{ alokasi.nama_warga }}</h2>
        <p class="text-body-reg text-neutral-900">Periode {{ periode }}</p>
      </div>
    </header>

    <dl class="grid grid-cols-2 gap-6 px-6">
      <div class="rounded-xl border border-secondary-700 bg-secondary-600 px-2.5 py-2 text-white">
        <dt class="text-body-tiny">Total sampah</dt>
        <dd class="text-body-reg font-bold">{{ formatBerat(alokasi.total_berat, true) }}</dd>
      </div>
      <div class="rounded-xl border border-primary-800 bg-primary-700 px-2.5 py-2 text-white">
        <!-- Bagian warga ini di pembagian periode ini, bukan saldo dompetnya. -->
        <dt class="text-body-tiny">Total saldo</dt>
        <dd class="truncate text-body-reg font-bold">{{ formatRupiah(alokasi.nominal) }}</dd>
      </div>
    </dl>

    <section class="mt-2 flex flex-col gap-4 pb-4">
      <h2 class="text-body-md font-extrabold text-neutral-900">Riwayat Setoran</h2>

      <div v-if="loading" class="flex flex-col gap-4" aria-hidden="true">
        <div v-for="n in 2" :key="n" class="h-24 animate-pulse rounded-2xl bg-neutral-200" />
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
          @click="loadRiwayat"
        >
          Coba Lagi
        </button>
      </div>

      <EmptyState
        v-else-if="riwayat.length === 0"
        title="Riwayat setoran kosong"
        message="Setoran warga ini di periode tersebut belum ditemukan."
      />

      <template v-else>
        <article
          v-for="item in riwayat"
          :key="item.id_transaksi"
          class="flex items-center gap-3 rounded-2xl bg-neutral-100 px-3 py-4"
        >
          <TransactionKindIcon kind="setoran" />

          <div class="min-w-0 flex-1">
            <p class="truncate text-body-sm font-extrabold text-neutral-900">Setoran Sampah</p>
            <p class="truncate text-body-sm text-neutral-900">
              {{ item.jenis_sampah || "-" }}<template v-if="item.berat"
                >/<span class="font-bold">{{ item.berat }}</span></template
              >
            </p>
            <p class="text-body-tiny text-neutral-400">{{ formatTanggal(item.tanggal_transaksi) }}</p>
          </div>

          <div class="flex shrink-0 flex-col items-end gap-2">
            <StatusBadge :status="item.status" />
            <p class="text-body-reg font-bold text-primary-700">+Rp {{ formatRibuan(item.bagian) }}</p>
          </div>
        </article>
      </template>
    </section>
  </main>
</template>
