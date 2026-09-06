<script setup lang="ts">
import { computed } from "vue";
import TransactionListItem from "./TransactionListItem.vue";
import type { Transaction } from "../stores/transactionStore";
import { formatBulanTahun } from "../utils/formatters";

const props = defineProps<{ items: Transaction[] }>();

defineEmits<{ open: [item: Transaction] }>();

/**
 * Kelompokkan per bulan. Datanya sudah urut dari yang terbaru (backend
 * mengurutkan `tanggal_transaksi` DESC), jadi cukup ditumpuk berurutan tanpa
 * perlu diurutkan ulang di sini.
 */
const groups = computed(() => {
  const result: Array<{ label: string; items: Transaction[] }> = [];

  for (const item of props.items) {
    const label = formatBulanTahun(item.tanggal_transaksi);
    const last = result[result.length - 1];

    if (last?.label === label) last.items.push(item);
    else result.push({ label, items: [item] });
  }

  return result;
});
</script>

<template>
  <div class="flex flex-col gap-4">
    <section v-for="group in groups" :key="group.label">
      <h3 class="text-body-sm font-bold text-neutral-900">{{ group.label }}</h3>

      <div class="mt-2 flex flex-col gap-3">
        <TransactionListItem
          v-for="item in group.items"
          :key="item.id_transaksi"
          :item="item"
          @open="$emit('open', item)"
        />
      </div>
    </section>
  </div>
</template>
