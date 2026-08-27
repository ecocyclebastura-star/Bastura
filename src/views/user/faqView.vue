<script setup lang="ts">
import { ref } from "vue";
import PageHeader from "../../components/PageHeader.vue";
import { FAQ_ITEMS } from "../../constants/helpCenter";

/**
 * Akordeon satu-terbuka: membuka pertanyaan lain menutup yang sebelumnya,
 * supaya daftarnya tidak memanjang jauh dan mudah dipindai.
 */
const openIndex = ref<number | null>(null);

function toggle(index: number) {
  openIndex.value = openIndex.value === index ? null : index;
}
</script>

<template>
  <main class="mx-auto flex w-full max-w-sm flex-col px-6 pt-safe">
    <PageHeader fallback="user-pusat-bantuan" />

    <h1 class="mt-2 text-h4 font-extrabold text-neutral-900">FAQ</h1>
    <p class="mt-1 text-body-reg font-bold text-neutral-900">
      Pertanyaan yang biasanya ditanyakan
    </p>

    <ul class="mt-4 flex flex-col gap-3 pb-6">
      <li
        v-for="(item, index) in FAQ_ITEMS"
        :key="item.question"
        class="overflow-hidden rounded-2xl border border-neutral-300 bg-white"
      >
        <h2>
          <button
            type="button"
            class="flex w-full cursor-pointer items-center gap-3 px-4 py-3 text-left transition-colors duration-200 hover:bg-neutral-100 focus:outline-none focus-visible:bg-neutral-100"
            :aria-expanded="openIndex === index"
            :aria-controls="`faq-panel-${index}`"
            @click="toggle(index)"
          >
            <span class="flex-1 text-body-sm text-neutral-900">
              {{ item.question }}
            </span>

            <svg
              class="size-5 shrink-0 text-neutral-900 transition-transform duration-200"
              :class="openIndex === index ? 'rotate-180' : ''"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2.4"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <path d="m6 9 6 6 6-6" />
            </svg>
          </button>
        </h2>

        <p
          v-if="openIndex === index"
          :id="`faq-panel-${index}`"
          class="border-t border-neutral-200 px-4 py-3 text-body-sm text-justify text-neutral-700"
        >
          {{ item.answer }}
        </p>
      </li>
    </ul>
  </main>
</template>
