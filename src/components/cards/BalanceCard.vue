<script setup lang="ts">
import { computed } from "vue";
import AppIcon from "../AppIcon.vue";

const props = withDefaults(
  defineProps<{
    /**
     * Saldo dalam rupiah. Sengaja boleh null: nilainya nanti datang dari
     * event listener realtime, jadi sebelum data pertama masuk tampilkan Rp0.
     */
    balance?: number | null;
    /** Nyalakan selama nunggu data pertama dari backend. */
    loading?: boolean;
    /** Matikan tombol kalau saldo belum cukup / lagi diproses. */
    withdrawDisabled?: boolean;
  }>(),
  { balance: null, loading: false, withdrawDisabled: false },
);

defineEmits<{ withdraw: [] }>();

const rupiah = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 });

const formattedBalance = computed(() => `Rp${rupiah.format(props.balance ?? 0)}`);
</script>

<template>
  <section
    class="relative isolate overflow-hidden rounded-3xl bg-linear-to-r from-primary-700 to-primary-400 px-5 py-4 text-white shadow-lg shadow-primary-700/25"
  >
    <!-- Ikon dompet raksasa sebagai ornamen background, dipotong sisi kanan. -->
    <AppIcon
      name="wallet"
      class="pointer-events-none absolute -top-2 -right-8 -z-10 size-44 text-white/10"
    />

    <p class="text-body-sm font-semibold">Total Saldo Anda</p>

    <p
      v-if="loading"
      class="mt-1 h-10 w-40 animate-pulse rounded-lg bg-white/25"
      aria-hidden="true"
    />
    <p v-else class="mt-1 text-h3 font-extrabold">{{ formattedBalance }}</p>

    <button
      type="button"
      class="mx-auto mt-5 block w-4/5 cursor-pointer rounded-full bg-secondary-500 py-3 text-body-reg font-bold text-secondary-800 transition-colors duration-200 hover:bg-secondary-400 active:bg-secondary-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-white disabled:pointer-events-none disabled:opacity-60"
      :disabled="withdrawDisabled || loading"
      @click="$emit('withdraw')"
    >
      Tarik Saldo
    </button>
  </section>
</template>
