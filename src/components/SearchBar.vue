<script setup lang="ts">
import { computed, useId } from "vue";

withDefaults(
  defineProps<{
    placeholder?: string;
    /** Dibaca screen reader; wajib diisi karena labelnya tidak tampil. */
    label?: string;
    /** Nyalakan selama hasil pencariannya masih ditunggu. */
    loading?: boolean;
  }>(),
  { placeholder: "Cari...", label: "Cari", loading: false },
);

const model = defineModel<string>({ default: "" });

const emit = defineEmits<{ submit: []; clear: [] }>();

const uid = useId();
const hasText = computed(() => model.value.length > 0);

function handleClear() {
  model.value = "";
  emit("clear");
}
</script>

<template>
  <div>
    <label :for="uid" class="sr-only">{{ label }}</label>

    <div class="relative">
      <input
        :id="uid"
        v-model="model"
        type="search"
        enterkeyhint="search"
        autocomplete="off"
        autocorrect="off"
        spellcheck="false"
        :placeholder="placeholder"
        :aria-busy="loading"
        class="search-input w-full rounded-full border border-neutral-900 bg-neutral-50 py-2.5 pl-5 pr-12 text-body-reg text-neutral-900 placeholder:text-neutral-400 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
        @keyup.enter="emit('submit')"
      />

      <!-- Satu slot ikon di kanan: kaca pembesar waktu kosong, tombol hapus
           begitu ada isinya, biar bentuk pill-nya tidak berubah. -->
      <button
        v-if="hasText"
        type="button"
        class="absolute inset-y-0 right-3.5 flex cursor-pointer items-center text-neutral-500 transition-colors duration-200 hover:text-neutral-900 focus:outline-none focus-visible:text-neutral-900"
        aria-label="Hapus pencarian"
        @click="handleClear"
      >
        <svg
          class="size-5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2.2"
          stroke-linecap="round"
          aria-hidden="true"
        >
          <path d="m6 6 12 12M18 6 6 18" />
        </svg>
      </button>

      <span
        v-else
        class="pointer-events-none absolute inset-y-0 right-3.5 flex items-center text-neutral-900"
        aria-hidden="true"
      >
        <svg
          class="size-5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2.2"
          stroke-linecap="round"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="m16.5 16.5 4 4" />
        </svg>
      </span>
    </div>
  </div>
</template>

<style scoped>
/* type="search" bawaan WebKit/Blink punya tombol silang & tombol dikte
   sendiri; dimatikan supaya tidak dobel dengan tombol hapus di atas. */
.search-input::-webkit-search-cancel-button,
.search-input::-webkit-search-decoration,
.search-input::-webkit-search-results-button {
  -webkit-appearance: none;
  appearance: none;
}
</style>
