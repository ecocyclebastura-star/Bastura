<script setup lang="ts">
import { computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import AvatarPhoto from "../../components/AvatarPhoto.vue";
import PageHeader from "../../components/PageHeader.vue";
import StatusBadge from "../../components/StatusBadge.vue";
import TransactionKindIcon from "../../components/TransactionKindIcon.vue";
import { formatBerat, splitProportional } from "../../constants/setoran";
import { useSetoranStore } from "../../stores/setoranStore";
import { formatPeriode, formatRibuan, formatRupiah, formatTanggal } from "../../utils/formatters";

const route = useRoute();
const router = useRouter();
const setoranStore = useSetoranStore();

const alokasi = computed(() => setoranStore.findAlokasi(String(route.params.idUser ?? "")));

// Halaman ini cuma membaca draft pembagian; tanpa draft/warganya, kembali.
if (!alokasi.value) {
  router.replace({
    name: setoranStore.draft ? "admin-setoran-bagi-hasil-alokasi" : "admin-setoran-bagi-hasil",
  });
}

const periode = computed(() =>
  setoranStore.draft
    ? formatPeriode(setoranStore.draft.date_start, setoranStore.draft.date_end)
    : "",
);

/**
 * Bagian warga dipecah per setoran sebanding beratnya -- cara yang sama
 * dengan yang dikirim waktu dana dibagikan, jadi angkanya pasti cocok.
 */
const riwayat = computed(() => {
  const target = alokasi.value;
  if (!target) return [];

  const shares = splitProportional(
    target.nominal,
    target.setoran.map((item) => item.berat),
  );
  return target.setoran.map((item, index) => ({ ...item, bagian: shares[index] }));
});
</script>

<template>
  <main v-if="alokasi" class="mx-auto flex w-full max-w-sm flex-col gap-4 px-6 pt-safe">
    <PageHeader title="Detail Setoran" fallback="admin-setoran-bagi-hasil-alokasi" />

    <header class="flex items-center gap-3">
      <AvatarPhoto class="size-16" />
      <div class="min-w-0">
        <h2 class="truncate text-h5 font-extrabold text-neutral-900">{{ alokasi.nama_warga }}</h2>
        <p class="text-body-reg text-neutral-900">Periode {{ periode }}</p>
      </div>
    </header>

    <dl class="grid grid-cols-2 gap-6 px-6">
      <div class="rounded-xl border border-secondary-700 bg-secondary-600 px-2.5 py-2 text-white">
        <dt class="text-body-tiny">Total sampah</dt>
        <dd class="text-body-reg font-bold">{{ formatBerat(alokasi.total_berat, true) }}</dd>
      </div>
      <div class="rounded-xl border border-primary-800 bg-primary-700 px-2.5 py-2 text-white">
        <!-- Bagian warga ini di pembagian periode ini, bukan saldo dompetnya. -->
        <dt class="text-body-tiny">Total saldo</dt>
        <dd class="truncate text-body-reg font-bold">{{ formatRupiah(alokasi.nominal) }}</dd>
      </div>
    </dl>

    <section class="mt-2 flex flex-col gap-4 pb-4">
      <h2 class="text-body-md font-extrabold text-neutral-900">Riwayat Setoran</h2>

      <article
        v-for="item in riwayat"
        :key="item.id_setoran"
        class="flex items-center gap-3 rounded-2xl bg-neutral-100 px-3 py-4"
      >
        <TransactionKindIcon kind="setoran" />

        <div class="min-w-0 flex-1">
          <p class="truncate text-body-sm font-extrabold text-neutral-900">Setoran Sampah</p>
          <p class="truncate text-body-sm text-neutral-900">
            {{ item.deskripsi?.trim() || item.category_name || "-" }}/<span class="font-bold">{{
              formatBerat(item.berat)
            }}</span>
          </p>
          <p class="text-body-tiny text-neutral-400">{{ formatTanggal(item.tanggal_setoran) }}</p>
        </div>

        <div class="flex shrink-0 flex-col items-end gap-2">
          <StatusBadge :status="item.status" />
          <p class="text-body-reg font-bold text-primary-700">+Rp {{ formatRibuan(item.bagian) }}</p>
        </div>
      </article>
    </section>
  </main>
</template>
