<script setup lang="ts">
import { computed } from "vue";
import StatusBadge from "./StatusBadge.vue";
import TransactionKindIcon from "./TransactionKindIcon.vue";
import type { Transaction } from "../stores/transactionStore";
import {
  kindSign,
  kindSubtitle,
  kindTitle,
  resolveKind,
  resolveStatusKey,
} from "../constants/transactions";
import { formatRupiah, formatTanggal } from "../utils/formatters";

const props = defineProps<{
  item: Transaction;
  /** Menimpa judul bawaan jenis transaksi, mis. nama warga di riwayat admin. */
  title?: string;
}>();

defineEmits<{ open: [] }>();

const kind = computed(() => resolveKind(props.item.jenis_transaksi));

const iconKind = computed(() =>
  kind.value === "setoran" ? "setoran" : "penarikan",
);

const title = computed(
  () => props.title?.trim() || kindTitle(props.item.jenis_transaksi),
);
const subtitle = computed(() =>
  kindSubtitle(props.item.jenis_transaksi, props.item.deskripsi),
);

/**
 * Setoran yang masih diproses belum punya nominal: hasil penjualannya baru
 * diketahui setelah sampahnya laku, jadi kolom nominalnya dikosongkan.
 */
const showAmount = computed(() => {
  if (!props.item.nominal) return false;
  return !(
    kind.value === "setoran" &&
    resolveStatusKey(props.item.status) === "diproses"
  );
});

const amount = computed(
  () =>
    `${kindSign(props.item.jenis_transaksi)}${formatRupiah(Math.abs(props.item.nominal))}`,
);

const amountClass = computed(() =>
  kind.value === "setoran" ? "text-primary-700" : "text-orange-600",
);
</script>

<template>
  <button
    type="button"
    class="flex w-full cursor-pointer items-center gap-3 rounded-2xl bg-neutral-100 px-3 py-3 text-left transition-colors duration-200 hover:bg-neutral-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
    @click="$emit('open')"
  >
    <TransactionKindIcon :kind="iconKind" />

    <div class="min-w-0 flex-1">
      <p class="truncate text-body-sm font-extrabold text-neutral-900">
        {{ title }}
      </p>
      <p v-if="subtitle" class="truncate text-body-tiny text-neutral-700">
        {{ subtitle }}
      </p>
      <p class="text-body-tiny text-neutral-500">
        {{ formatTanggal(item.tanggal_transaksi) }}
      </p>
    </div>

    <div class="flex shrink-0 flex-col items-end gap-2">
      <StatusBadge :status="item.status" />
      <p
        v-if="showAmount"
        class="text-body-sm font-bold"
        :class="amountClass"
      >
        {{ amount }}
      </p>
    </div>
  </button>
</template>
