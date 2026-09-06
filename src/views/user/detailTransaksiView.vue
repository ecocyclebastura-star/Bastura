<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import BaseButton from "../../components/BaseButton.vue";
import BaseDialog from "../../components/BaseDialog.vue";
import PageHeader from "../../components/PageHeader.vue";
import { resolveAuthError } from "../../constants/authErrors";
import {
  detailCopy,
  isCancelable,
  parseSetoranDeskripsi,
  resolveKind,
  resolveStatusKey,
} from "../../constants/transactions";
import { useTransactionStore } from "../../stores/transactionStore";
import type { Transaction } from "../../stores/transactionStore";
import {
  formatJamWita,
  formatRupiah,
  formatTanggal,
} from "../../utils/formatters";
import logoBastura from "../../assets/Property 1=Logo Large.svg";

const route = useRoute();
const router = useRouter();
const transactionStore = useTransactionStore();

const transaction = ref<Transaction | null>(null);
const loading = ref(true);
const loadError = ref("");
const confirmOpen = ref(false);
const canceling = ref(false);

const kind = computed(() => resolveKind(transaction.value?.jenis_transaksi));

const copy = computed(() =>
  detailCopy(transaction.value?.jenis_transaksi, transaction.value?.status),
);

const setoran = computed(() =>
  parseSetoranDeskripsi(transaction.value?.deskripsi),
);

/** Setoran yang masih diproses belum punya nominal untuk ditampilkan. */
const isWaitingResult = computed(
  () =>
    kind.value === "setoran" &&
    resolveStatusKey(transaction.value?.status) === "diproses",
);

const amount = computed(() =>
  formatRupiah(Math.abs(transaction.value?.nominal ?? 0)),
);

const canCancel = computed(() =>
  isCancelable(transaction.value?.jenis_transaksi, transaction.value?.status),
);

const waktu = computed(() =>
  formatJamWita(transaction.value?.tanggal_transaksi),
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

    <template v-else-if="transaction">
      <!-- Ringkasan -->
      <section class="flex flex-col items-center text-center">
        <img
          :src="logoBastura"
          alt=""
          aria-hidden="true"
          class="size-20 object-contain"
        />

        <h1 class="mt-2 text-h5 font-extrabold text-neutral-900">
          {{ copy.heading }}
        </h1>

        <p class="mt-1 text-h3 font-extrabold text-neutral-900">
          {{ isWaitingResult ? "Menunggu..." : amount }}
        </p>

        <p class="mt-2 text-body-sm text-neutral-500">
          {{ formatTanggal(transaction.tanggal_transaksi) }}
          <template v-if="waktu">&middot; {{ waktu }}</template>
        </p>
      </section>

      <!-- Rincian -->
      <section class="mt-8">
        <h2
          class="border-b border-neutral-300 pb-1 text-body-reg font-extrabold text-neutral-900"
        >
          Detail transaksi
        </h2>

        <dl class="mt-3 flex flex-col gap-2 text-body-sm">
          <template v-if="kind === 'setoran'">
            <div class="flex justify-between gap-4">
              <dt class="text-neutral-700">Jenis Sampah</dt>
              <dd class="text-right font-medium text-neutral-900">
                {{ setoran.jenisSampah || "-" }}
              </dd>
            </div>

            <div v-if="setoran.berat" class="flex justify-between gap-4">
              <dt class="text-neutral-700">Berat</dt>
              <dd class="text-right font-medium text-neutral-900">
                {{ setoran.berat }}
              </dd>
            </div>

            <div
              v-if="!isWaitingResult && transaction.nominal"
              class="flex justify-between gap-4"
            >
              <dt class="text-neutral-700">Hasil setoran</dt>
              <dd class="text-right font-medium text-neutral-900">
                {{ amount }}
              </dd>
            </div>
          </template>

          <div v-else class="flex justify-between gap-4">
            <dt class="text-neutral-700">Nominal</dt>
            <dd class="text-right font-medium text-neutral-900">{{ amount }}</dd>
          </div>

          <div v-if="copy.jenisLabel" class="flex justify-between gap-4">
            <dt class="text-neutral-700">Jenis transaksi</dt>
            <dd class="text-right font-medium text-neutral-900">
              {{ copy.jenisLabel }}
            </dd>
          </div>

          <div class="flex justify-between gap-4">
            <dt class="text-neutral-700">Status</dt>
            <dd class="text-right font-medium text-neutral-900">
              {{ copy.statusText }}
            </dd>
          </div>
        </dl>
      </section>

      <!-- Catatan -->
      <section v-if="copy.note" class="mt-6">
        <h2
          class="border-b border-neutral-300 pb-1 text-body-reg font-extrabold text-neutral-900"
        >
          Catatan
        </h2>
        <p class="mt-3 text-justify text-body-sm text-neutral-800">
          {{ copy.note }}
        </p>
      </section>

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
    </template>
  </main>
</template>
