<script setup lang="ts">
import { computed } from "vue";
import LihatDetailButton from "../LihatDetailButton.vue";
import { ALOKASI_STEP, formatBerat } from "../../constants/setoran";
import type { AlokasiWarga } from "../../stores/setoranStore";
import { formatRupiah } from "../../utils/formatters";

const props = defineProps<{
  alokasi: AlokasiWarga;
  /** Sisa dana yang belum terbagi; tombol + tidak boleh melewatinya. */
  sisaDana: number;
}>();

const emit = defineEmits<{
  change: [nominal: number];
  detail: [];
  remove: [];
}>();

const canDecrease = computed(() => props.alokasi.nominal > 0);
const canIncrease = computed(() => props.sisaDana > 0);

function decrease() {
  emit("change", Math.max(0, props.alokasi.nominal - ALOKASI_STEP));
}

/** Kalau sisa dananya kurang dari satu langkah, cukup ambil sisanya saja. */
function increase() {
  emit("change", props.alokasi.nominal + Math.min(ALOKASI_STEP, props.sisaDana));
}

/**
 * Nominal juga bisa diketik langsung, lebih cepat daripada menekan +/-
 * berkali-kali. Sama seperti form Tarik Saldo: yang disimpan angka murni,
 * titik ribuan cuma tampilan.
 */
function handleInput(event: Event) {
  const input = event.target as HTMLInputElement;
  const digits = input.value.replace(/\D/g, "").slice(0, 12);
  const nominal = Number(digits || 0);

  emit("change", nominal);
  input.value = formatRupiah(nominal);
}

const stepperClass =
  "flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-full bg-secondary-600 text-white transition-colors duration-200 hover:bg-secondary-700 active:bg-secondary-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-1 disabled:pointer-events-none disabled:opacity-40";
</script>

<template>
  <article class="rounded-2xl border border-secondary-600 bg-secondary-50">
    <div class="flex items-center gap-2 px-4 pt-2 pb-2">
      <div class="min-w-0 flex-1">
        <h3 class="truncate text-h6 font-extrabold text-neutral-900">
          {{ alokasi.nama_warga || "-" }}
        </h3>
        <p class="text-body-tiny text-neutral-900">
          Total Setoran :
          <span class="font-bold">{{ formatBerat(alokasi.total_berat) }}</span>
        </p>
      </div>

      <div class="flex shrink-0 items-center gap-1">
        <button
          type="button"
          :class="stepperClass"
          :disabled="!canDecrease"
          :aria-label="`Kurangi bagian ${alokasi.nama_warga}`"
          @click="decrease"
        >
          <svg class="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" aria-hidden="true">
            <path d="M5 12h14" />
          </svg>
        </button>

        <input
          :value="formatRupiah(alokasi.nominal)"
          type="text"
          inputmode="numeric"
          autocomplete="off"
          :aria-label="`Bagian ${alokasi.nama_warga}`"
          class="w-24 rounded-lg bg-transparent py-1 text-center text-body-md font-medium text-neutral-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-primary-500"
          @input="handleInput"
          @focus="($event.target as HTMLInputElement).select()"
        />

        <button
          type="button"
          :class="stepperClass"
          :disabled="!canIncrease"
          :aria-label="`Tambah bagian ${alokasi.nama_warga}`"
          @click="increase"
        >
          <svg class="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" aria-hidden="true">
            <path d="M12 5v14M5 12h14" />
          </svg>
        </button>
      </div>
    </div>

    <div
      class="flex items-center justify-between border-t border-secondary-600 px-4 py-1.5"
    >
      <LihatDetailButton @click="emit('detail')" />

      <button
        type="button"
        class="cursor-pointer rounded-full bg-orange-500 px-4 py-0.5 text-body-tiny font-bold text-white transition-colors duration-200 hover:bg-orange-600 active:bg-orange-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-1"
        :aria-label="`Hapus ${alokasi.nama_warga} dari daftar pembagian`"
        @click="emit('remove')"
      >
        Hapus
      </button>
    </div>
  </article>
</template>
