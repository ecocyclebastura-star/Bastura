<script setup lang="ts">
import { computed } from "vue";
import AppIcon from "./AppIcon.vue";

const props = defineProps<{ kind: "setoran" | "penarikan" }>();

/**
 * Kotak ikon transaksi. Gambarnya ikon satu warna (currentColor), jadi warna
 * kotak & ikonnya cukup diatur lewat kelas di sini, mengikuti desain.
 */
const STYLES = {
  setoran: "border-primary-500 bg-secondary-500 text-primary-700",
  penarikan: "border-secondary-400 bg-primary-500 text-secondary-200",
} as const;

const boxClass = computed(() => STYLES[props.kind]);
</script>

<template>
  <span
    class="flex size-11 shrink-0 items-center justify-center rounded-[10px] border"
    :class="boxClass"
    aria-hidden="true"
  >
    <AppIcon :name="kind" class="size-9.5" />
  </span>
</template>
