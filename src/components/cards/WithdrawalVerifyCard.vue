<script setup lang="ts">
import { computed } from "vue";
import { resolveStatus, resolveStatusKey } from "../../constants/transactions";
import type { PendingWithdrawal } from "../../stores/adminTransactionStore";
import { formatRupiah, formatTanggal } from "../../utils/formatters";
// Ikon berwarna (kotak hijau + gambar), jadi lewat <img> seperti di daftar transaksi.
import iconPenarikan from "../../assets/icon-transaksi-penarikan.svg";

const props = withDefaults(
  defineProps<{
    item: PendingWithdrawal;
    /** Kunci tombol selama keputusan untuk kartu ini masih dikirim. */
    busy?: boolean;
  }>(),
  { busy: false },
);

defineEmits<{ approve: []; reject: [] }>();

/** Selama masih diproses, tombol Tolak/Setuju yang tampil; sesudahnya badge status. */
const isPending = computed(() => resolveStatusKey(props.item.status) === "diproses");
const status = computed(() => resolveStatus(props.item.status));

const actionClass =
  "w-20 cursor-pointer rounded-full py-1 text-body-tiny font-bold text-white transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-60";
</script>

<template>
  <article class="flex items-center gap-3 rounded-2xl bg-neutral-100 px-3 py-4">
    <img :src="iconPenarikan" alt="" aria-hidden="true" class="size-11 shrink-0" />

    <div class="min-w-0 flex-1">
      <div class="flex items-start justify-between gap-3">
        <p class="truncate text-body-reg font-extrabold text-neutral-900">
          {{ item.nama_warga || "-" }}
        </p>
        <p class="shrink-0 text-body-md leading-tight font-bold text-orange-600">
          -{{ formatRupiah(Math.abs(item.nominal)) }}
        </p>
      </div>

      <p class="text-body-sm text-neutral-900">
        Total Saldo: {{ formatRupiah(item.total_saldo) }}
      </p>

      <div class="flex items-end justify-between gap-2">
        <p class="text-body-tiny text-neutral-600">
          {{ formatTanggal(item.tanggal_transaksi) }}
        </p>

        <div v-if="isPending" class="flex shrink-0 gap-3">
          <button
            type="button"
            :class="[actionClass, 'bg-orange-500 hover:bg-orange-600 focus-visible:ring-orange-500']"
            :disabled="busy"
            :aria-label="`Tolak penarikan ${item.nama_warga}`"
            @click="$emit('reject')"
          >
            Tolak
          </button>
          <button
            type="button"
            :class="[actionClass, 'bg-primary-500 hover:bg-primary-600 focus-visible:ring-primary-500']"
            :disabled="busy"
            :aria-label="`Setujui penarikan ${item.nama_warga}`"
            @click="$emit('approve')"
          >
            Setuju
          </button>
        </div>

        <span
          v-else
          class="inline-block w-20 shrink-0 rounded-full border py-0.5 text-center text-body-tiny font-semibold"
          :class="status.badgeClass"
        >
          {{ status.label }}
        </span>
      </div>
    </div>
  </article>
</template>
