<script setup lang="ts">
import { computed } from "vue";
import { useRoute } from "vue-router";
import EmptyState from "../../components/EmptyState.vue";
import PageHeader from "../../components/PageHeader.vue";
import { findWasteType, formatHargaPerKg } from "../../constants/wasteTypes";

const route = useRoute();

// Datanya masih konstanta di frontend, jadi tidak ada state loading/error:
// hasilnya langsung ada begitu route-nya dibuka.
const wasteType = computed(() => findWasteType(String(route.params.id)));
</script>

<template>
  <!-- min-h dikurangi 7rem, setinggi pb-28 di UserLayout, supaya kartu harga
       yang didorong mt-auto berhenti pas di atas bottom nav -- bukan
       ketutupan olehnya. -->
  <main
    class="mx-auto flex min-h-[calc(100dvh-7rem)] w-full max-w-sm flex-col px-6 pt-safe"
  >
    <PageHeader title="Detail" fallback="user-jenis-sampah" />

    <EmptyState
      v-if="!wasteType"
      title="Jenis sampah tidak ditemukan"
      message="Mungkin sudah dihapus atau namanya sudah diganti."
    />

    <template v-else>
      <img
        v-if="wasteType.image_base64 || wasteType.image_url"
        :src="wasteType.image_base64 ?? wasteType.image_url ?? ''"
        :alt="wasteType.name"
        class="mt-4 aspect-16/9 w-full rounded-2xl object-cover"
      />
      <!-- Placeholder selama gambar dari backend belum tersedia. -->
      <div
        v-else
        class="mt-4 aspect-16/9 w-full rounded-2xl bg-linear-to-br from-neutral-200 to-neutral-300"
        aria-hidden="true"
      />

      <h1 class="mt-4 text-h5 leading-tight font-extrabold text-neutral-900">
        {{ wasteType.name }}
      </h1>
      <p class="text-body-reg text-neutral-500">{{ wasteType.category }}</p>

      <h2 class="mt-4 text-body-reg font-bold text-neutral-900">Deskripsi</h2>

      <p
        v-if="wasteType.description"
        class="mt-1 text-body-sm whitespace-pre-line text-neutral-700"
      >
        {{ wasteType.description }}
      </p>
      <p v-else class="mt-1 text-body-sm text-neutral-400">
        Deskripsi untuk jenis sampah ini belum tersedia.
      </p>

      <!-- mt-auto: kartu harga turun ke dasar layar waktu isinya masih
           pendek, sesuai desain. -->
      <div
        class="mt-auto -mx-6 rounded-t-3xl border-t border-neutral-200 bg-white px-6 py-4 shadow-[0_-4px_16px_-8px_rgba(28,28,26,0.25)]"
      >
        <div class="flex items-center justify-between gap-3">
          <p class="text-body-reg text-neutral-500">Estimasi harga</p>
          <p class="text-h5 font-extrabold text-neutral-900">
            {{ formatHargaPerKg(wasteType.price_per_kg) }}
          </p>
        </div>
      </div>
    </template>
  </main>
</template>
