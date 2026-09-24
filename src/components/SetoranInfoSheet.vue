<script setup lang="ts">
import { computed, shallowRef, watch } from "vue";
import DarkSheet from "./DarkSheet.vue";
import { formatBerat, resolveSetoranStage } from "../constants/setoran";
import type { Setoran } from "../stores/setoranStore";
import { formatRupiah, formatTanggal } from "../utils/formatters";

const props = defineProps<{
  /** Setoran yang ditampilkan; null = sheet tertutup. */
  setoran: Setoran | null;
}>();

defineEmits<{ close: [] }>();

// Isi terakhir dipertahankan selama animasi tutup, jadi kartunya tidak
// sempat kosong sebelum hilang.
const shown = shallowRef<Setoran | null>(props.setoran);
watch(
  () => props.setoran,
  (value) => {
    if (value) shown.value = value;
  },
);

const isProses = computed(
  () => resolveSetoranStage(shown.value?.status) === "proses",
);
</script>

<template>
  <DarkSheet :open="setoran !== null" title="Informasi Setoran" @close="$emit('close')">
    <dl v-if="shown" class="grid grid-cols-2 gap-x-4 gap-y-5">
      <div class="col-span-2">
        <dt class="text-body-reg font-light">Jenis Sampah</dt>
        <dd class="text-body-md font-bold">
          {{ shown.deskripsi?.trim() || shown.category_name || "-" }}
        </dd>
      </div>

      <div class="min-w-0">
        <dt class="text-body-reg font-light">Kategori</dt>
        <dd class="truncate text-body-md font-bold">{{ shown.category_name || "-" }}</dd>
      </div>

      <div>
        <dt class="text-body-reg font-light">Berat</dt>
        <dd class="text-body-md font-bold">{{ formatBerat(shown.berat, true) }}</dd>
      </div>

      <div>
        <dt class="text-body-reg font-light">Tanggal Setoran</dt>
        <dd class="text-body-md font-bold">
          {{ formatTanggal(shown.tanggal_setoran) || "-" }}
        </dd>
      </div>

      <div class="min-w-0">
        <dt class="text-body-reg font-light">Saldo diterima</dt>
        <!-- Saldonya baru ada setelah hasil penjualan ke BSI dibagikan. -->
        <dd
          class="truncate text-body-md font-bold"
          :class="isProses ? 'text-orange-500' : 'text-primary-500'"
        >
          {{ isProses ? "Menunggu hasil..." : `+${formatRupiah(shown.nominal)}` }}
        </dd>
      </div>
    </dl>
  </DarkSheet>
</template>
