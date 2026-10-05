<script setup lang="ts">
import { computed, onMounted } from "vue";
import { useRouter } from "vue-router";
import AlertToast from "../../components/AlertToast.vue";
import AppIcon from "../../components/AppIcon.vue";
import BaseButton from "../../components/BaseButton.vue";
import PageHeader from "../../components/PageHeader.vue";
import { useToast } from "../../composables/useToast";
import { primaryItem, useScanStore } from "../../stores/scanStore";
import { formatRupiah } from "../../utils/formatters";

const router = useRouter();
const scanStore = useScanStore();
const { toastMessage, toastVariant, showToast } = useToast();

const result = computed(() => scanStore.result);
const item = computed(() => (result.value ? primaryItem(result.value) : null));
/** Barang lain yang ikut terdeteksi di foto yang sama. */
const others = computed(() =>
  result.value ? result.value.items.filter((entry) => entry !== item.value) : [],
);

onMounted(() => {
  // Halaman ini cuma berarti setelah scan; dibuka langsung = balik ke kamera.
  if (!item.value) {
    router.replace({ name: "user-scan" });
    return;
  }
  showToast("Scan berhasil! Jenis sampah berhasil dikenali.", "success");
});

function openCatalog(id: string) {
  router.push({ name: "user-jenis-sampah-detail", params: { id } });
}

const sectionClass = "border-t border-primary-400 px-5 py-3";
</script>

<template>
  <main class="mx-auto flex w-full max-w-sm flex-col gap-5 px-6 pt-safe pb-6">
    <PageHeader title="Hasil Scan" fallback="user-scan" />

    <template v-if="result && item">
      <img
        v-if="scanStore.resultImage"
        :src="scanStore.resultImage"
        alt="Foto sampah yang di-scan"
        class="mx-auto aspect-3/4 w-36 rounded-2xl object-cover shadow-md"
      />

      <section class="overflow-hidden rounded-3xl border border-primary-400 bg-secondary-50">
        <h2 class="px-5 py-3 text-h6 font-extrabold text-neutral-900">Detail Analysis AI</h2>

        <div :class="sectionClass">
          <p class="text-body-sm font-bold text-neutral-900">Jenis Sampah</p>
          <div class="mt-1 flex items-center gap-3">
            <AppIcon name="setoran" class="size-9 text-primary-700" />
            <p class="text-h6 font-extrabold text-neutral-900">{{ item.name }}</p>
          </div>
          <span
            v-if="!item.accepted"
            class="mt-2 inline-block rounded-full bg-orange-100 px-2.5 py-0.5 text-body-tiny font-bold text-orange-700"
          >
            Belum diterima bank sampah
          </span>
        </div>

        <div :class="sectionClass">
          <p class="text-body-sm font-bold text-neutral-900">Kondisi</p>
          <p class="mt-1 text-body-sm whitespace-pre-line text-neutral-800">
            {{ item.condition || "-" }}
          </p>
        </div>

        <div v-if="others.length" :class="sectionClass">
          <p class="text-body-sm font-bold text-neutral-900">Juga terdeteksi</p>
          <ul class="mt-1 flex flex-col gap-1">
            <li
              v-for="(other, index) in others"
              :key="index"
              class="flex justify-between gap-3 text-body-sm text-neutral-800"
            >
              <span>{{ other.name }}</span>
              <span class="shrink-0 font-semibold">{{ formatRupiah(other.price_per_kg) }}/kg</span>
            </li>
          </ul>
        </div>

        <div :class="[sectionClass, 'flex flex-col gap-4 pb-5']">
          <div class="flex items-center justify-between gap-3">
            <p class="text-body-sm font-bold text-neutral-900">Estimasi Harga</p>
            <p class="text-body-md font-bold text-primary-800">
              {{ formatRupiah(item.price_per_kg) }}/kg
            </p>
          </div>

          <button
            v-if="item.catalog_id"
            type="button"
            class="cursor-pointer self-start text-body-sm font-semibold text-primary-600 underline-offset-2 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
            @click="openCatalog(item.catalog_id)"
          >
            Lihat di katalog jenis sampah
          </button>

          <BaseButton
            class="mx-auto w-4/5"
            label="Kembali ke Beranda"
            variant="accent"
            size="lg"
            :block="false"
            @click="router.push({ name: 'dashboard-user' })"
          />
        </div>
      </section>

      <p v-if="result.disclaimer" class="text-center text-body-tiny text-neutral-500">
        {{ result.disclaimer }}
      </p>
    </template>

    <AlertToast :message="toastMessage" :variant="toastVariant" />
  </main>
</template>
