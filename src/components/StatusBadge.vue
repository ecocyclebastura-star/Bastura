<script setup lang="ts">
import { computed } from "vue";
import { resolveStatus } from "../constants/transactions";

const props = defineProps<{
  /** Status mentah dari backend; penerjemahannya di constants/transactions.ts. */
  status: string;
}>();

const style = computed(() => resolveStatus(props.status));
</script>

<template>
  <span
    class="inline-block shrink-0 rounded-full border px-2 py-0.5 text-body-tiny leading-tight font-semibold"
    :class="style.badgeClass"
  >
    {{ style.label }}
  </span>
</template>
