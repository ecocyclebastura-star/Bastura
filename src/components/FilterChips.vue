<script setup lang="ts">
export type FilterChip = {
  /** Nilai yang dikirim ke pemanggil; string kosong berarti "semua". */
  value: string;
  label: string;
};

defineProps<{ chips: readonly FilterChip[] }>();

const model = defineModel<string>({ default: "" });
</script>

<template>
  <!-- -mx-6 px-6 supaya chip paling ujung bisa mepet tepi layar waktu digeser. -->
  <div
    class="no-scrollbar -mx-6 flex gap-2 overflow-x-auto px-6 py-1"
    role="group"
    aria-label="Filter kategori"
  >
    <button
      v-for="chip in chips"
      :key="chip.value"
      type="button"
      :aria-pressed="model === chip.value"
      :class="[
        'shrink-0 cursor-pointer rounded-full px-4 py-1.5 text-body-sm font-bold transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500',
        model === chip.value
          ? 'bg-primary-500 text-white'
          : 'border border-neutral-300 bg-white text-neutral-900 hover:bg-neutral-100',
      ]"
      @click="model = chip.value"
    >
      {{ chip.label }}
    </button>
  </div>
</template>
