<script setup lang="ts">
import { computed } from "vue";
import {
  detailCopy,
  parseSetoranDeskripsi,
  resolveKind,
  resolveStatusKey,
} from "../constants/transactions";
import type { Transaction } from "../stores/transactionStore";
import { formatJamWita, formatRupiah, formatTanggal } from "../utils/formatters";
import logoBastura from "../assets/Property 1=Logo Large.svg";

/**
 * Isi halaman detail transaksi, dipakai bareng halaman warga dan admin.
 * Tombol tambahan (mis. batalkan penarikan) dipasang lewat default slot.
 */
const props = defineProps<{
  transaction: Transaction;
  /** Nama pemilik transaksi. Bagian "Penerima" cuma tampil kalau diisi. */
  recipient?: string;
}>();

const kind = computed(() => resolveKind(props.transaction.jenis_transaksi));

const copy = computed(() =>
  detailCopy(props.transaction.jenis_transaksi, props.transaction.status),
);

const setoran = computed(() => parseSetoranDeskripsi(props.transaction.deskripsi));

/** Setoran yang masih diproses belum punya nominal untuk ditampilkan. */
const isWaitingResult = computed(
  () =>
    kind.value === "setoran" &&
    resolveStatusKey(props.transaction.status) === "diproses",
);

const amount = computed(() => formatRupiah(Math.abs(props.transaction.nominal ?? 0)));

const waktu = computed(() => formatJamWita(props.transaction.tanggal_transaksi));
</script>

<template>
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

  <!-- Penerima -->
  <section v-if="recipient" class="mt-8">
    <h2
      class="border-b border-neutral-300 pb-1 text-body-reg font-extrabold text-neutral-900"
    >
      Penerima
    </h2>
    <p class="mt-3 text-body-sm text-neutral-900">{{ recipient }}</p>
  </section>

  <!-- Rincian -->
  <section :class="recipient ? 'mt-6' : 'mt-8'">
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

  <slot />
</template>
