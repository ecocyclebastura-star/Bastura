<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import AppIcon from "../../components/AppIcon.vue";
import EmptyState from "../../components/EmptyState.vue";
import { resolveAuthError } from "../../constants/authErrors";
import { educationAuthor, useEducationAdminStore } from "../../stores/educationAdminStore";
import type { Education } from "../../stores/contentStore";
import { formatTanggal } from "../../utils/formatters";

const route = useRoute();
const router = useRouter();
const store = useEducationAdminStore();

const item = ref<Education | null>(null);
const loading = ref(true);
const errorMessage = ref("");

const image = computed(() => item.value?.image_base64 ?? item.value?.image_url ?? "");

async function load() {
  loading.value = true;
  errorMessage.value = "";

  try {
    item.value = await store.find(String(route.params.id));
  } catch (error) {
    errorMessage.value = resolveAuthError(
      error,
      "Gagal memuat materi edukasi. Coba lagi sebentar lagi.",
    );
  } finally {
    loading.value = false;
  }
}

onMounted(load);

function goBack() {
  if (window.history.state?.back) router.back();
  else router.push({ name: "admin-edukasi" });
}
</script>

<template>
  <main class="mx-auto flex w-full max-w-sm flex-col">
    <!-- Foto selebar layar; kartu isi di bawahnya naik menimpa ujungnya. -->
    <div class="relative h-80 w-full bg-neutral-300">
      <img v-if="image" :src="image" alt="" class="size-full object-cover" />

      <div class="absolute inset-x-0 top-0 px-4 pt-safe">
        <button
          type="button"
          class="mt-6 flex size-10 cursor-pointer items-center justify-center rounded-xl bg-white/60 text-neutral-900 backdrop-blur-sm transition-colors duration-200 hover:bg-white/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
          aria-label="Kembali"
          @click="goBack"
        >
          <svg
            class="size-7"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.2"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <path d="M20 12H4" />
            <path d="m10 6-6 6 6 6" />
          </svg>
        </button>
      </div>
    </div>

    <div class="relative -mt-10 min-h-[50dvh] rounded-t-4xl bg-white px-6 pt-6 pb-6">
      <div v-if="loading" class="flex flex-col gap-3" aria-hidden="true">
        <div class="h-7 w-full animate-pulse rounded-lg bg-neutral-200" />
        <div class="h-7 w-2/3 animate-pulse rounded-lg bg-neutral-200" />
        <div class="mt-2 h-40 w-full animate-pulse rounded-2xl bg-neutral-200" />
      </div>

      <div
        v-else-if="errorMessage"
        class="rounded-2xl border border-red-200 bg-red-50 p-4"
        role="alert"
      >
        <p class="text-body-sm text-red-700">{{ errorMessage }}</p>
        <button
          type="button"
          class="mt-3 cursor-pointer rounded-full bg-red-600 px-4 py-2 text-body-sm font-bold text-white transition-colors duration-200 hover:bg-red-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
          @click="load"
        >
          Coba Lagi
        </button>
      </div>

      <EmptyState
        v-else-if="!item"
        title="Materi tidak ditemukan"
        message="Mungkin sudah dihapus atau belum tersimpan di perangkat ini."
      />

      <article v-else>
        <h1 class="text-h4 leading-tight font-extrabold text-neutral-900">
          {{ item.title }}
        </h1>

        <div class="mt-3 flex items-center gap-2">
          <AppIcon name="account" class="size-8 text-primary-800" />
          <p class="text-body-reg font-bold text-neutral-900">
            {{ educationAuthor(item) || "Admin" }}
          </p>
          <p class="ml-2 text-body-sm text-neutral-600">{{ formatTanggal(item.created_at) }}</p>
        </div>

        <ul v-if="item.content.tags.length" class="mt-3 flex flex-wrap gap-1.5">
          <li
            v-for="tag in item.content.tags"
            :key="tag"
            class="rounded-full bg-primary-100 px-2 py-0.5 text-body-tiny font-medium text-primary-800"
          >
            {{ tag }}
          </li>
        </ul>

        <!-- Enter antar paragraf dari admin tetap kelihatan. -->
        <p class="mt-4 text-body-sm whitespace-pre-line text-justify text-neutral-800">
          {{ item.content.text }}
        </p>
      </article>
    </div>
  </main>
</template>
