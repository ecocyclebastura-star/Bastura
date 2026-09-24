<script setup lang="ts">
import { computed, ref } from "vue";
import { useRouter } from "vue-router";
import AlertToast from "../../components/AlertToast.vue";
import AppIcon from "../../components/AppIcon.vue";
import BagiHasilSteps from "../../components/BagiHasilSteps.vue";
import BaseButton from "../../components/BaseButton.vue";
import BaseDialog from "../../components/BaseDialog.vue";
import EmptyState from "../../components/EmptyState.vue";
import PageHeader from "../../components/PageHeader.vue";
import AlokasiWargaCard from "../../components/cards/AlokasiWargaCard.vue";
import { resolveAuthError } from "../../constants/authErrors";
import { useToast } from "../../composables/useToast";
import { useSetoranStore } from "../../stores/setoranStore";
import type { AlokasiWarga } from "../../stores/setoranStore";
import { formatRupiah } from "../../utils/formatters";

const router = useRouter();
const setoranStore = useSetoranStore();
const { toastMessage, toastVariant, showToast } = useToast();

// Dibuka tanpa melewati Input Data (mis. lewat URL): tidak ada yang dibagi.
if (!setoranStore.draft) {
  router.replace({ name: "admin-setoran-bagi-hasil" });
}

const draft = computed(() => setoranStore.draft);
const warga = computed(() => draft.value?.warga ?? []);

const komisiLabel = computed(() => `${draft.value?.komisi_persen ?? 0}%`);

/** Pesan di bawah kartu dana selama pembagiannya belum pas. */
const sisaWarning = computed(() => {
  if (setoranStore.sisaDana > 0) return "Masih terdapat sisa dana yang belum dibagikan";
  if (setoranStore.sisaDana < 0) return "Dana terbagi melebihi dana yang tersedia";
  return "";
});

/** Semua dana harus terbagi habis, persis, sebelum boleh dikonfirmasi. */
const canConfirm = computed(() => warga.value.length > 0 && setoranStore.sisaDana === 0);

function openDetail(item: AlokasiWarga) {
  router.push({
    name: "admin-setoran-bagi-hasil-detail",
    params: { idUser: item.id_user },
  });
}

/* ================================= HAPUS ================================= */

const removeTarget = ref<AlokasiWarga | null>(null);

function confirmRemove() {
  const target = removeTarget.value;
  if (!target) return;

  // Cuma mengubah draft di memori, jadi tidak ada yang bisa gagal di sini.
  setoranStore.removeAlokasi(target.id_user);
  removeTarget.value = null;
  showToast("Perubahan berhasil disimpan.", "success");
}

/* =============================== KONFIRMASI =============================== */

const confirmOpen = ref(false);
const distributing = ref(false);

function closeConfirm() {
  if (!distributing.value) confirmOpen.value = false;
}

async function distribute() {
  if (!canConfirm.value || distributing.value) return;

  distributing.value = true;
  try {
    await setoranStore.distribute();
    setoranStore.setFlash("Hasil setoran sampah berhasil dibagikan.");
    // Alurnya selesai: kembali ke daftar Setoran, bukan ke langkah sebelumnya.
    router.replace({ name: "admin-setoran" });
  } catch (error) {
    // Admin tetap di sini supaya bisa memeriksa ulang pembagiannya.
    showToast(
      resolveAuthError(
        error,
        "Dana belum berhasil dibagikan. Coba periksa kembali data pembagian dan coba lagi.",
      ),
      "error",
    );
  } finally {
    distributing.value = false;
    confirmOpen.value = false;
  }
}
</script>

<template>
  <main v-if="draft" class="mx-auto flex w-full max-w-sm flex-col gap-4 px-6 pt-safe">
    <PageHeader title="Bagi Hasil Setoran" fallback="admin-setoran-bagi-hasil" />

    <BagiHasilSteps :current="confirmOpen ? 2 : 1" />

    <section class="rounded-2xl border border-neutral-200 bg-neutral-100 px-4 pt-4 pb-5">
      <h2 class="flex items-center gap-3 text-h5 font-extrabold text-neutral-900">
        <AppIcon name="bank" class="size-8 text-primary-800" />
        Pembagian Dana
      </h2>

      <p class="mt-3 text-body-sm text-neutral-900">Total Dana dari BSI</p>
      <div class="flex items-end justify-between gap-3 border-b-2 border-neutral-400 pb-1">
        <p class="min-w-0 truncate text-h3 font-extrabold text-neutral-900">
          {{ formatRupiah(draft.total_dana) }}
        </p>
        <!-- Potongan komisi bank sampah; sisanya yang dibagi ke warga. -->
        <p
          class="shrink-0 pb-1 text-h5 font-extrabold text-primary-600"
          :aria-label="`Komisi ${komisiLabel}`"
          title="Komisi bank sampah"
        >
          {{ komisiLabel }}
        </p>
      </div>

      <dl class="mt-4 grid grid-cols-2 gap-4">
        <div>
          <dt class="text-body-sm text-neutral-900">Dana Terbagi</dt>
          <dd class="text-h6 font-extrabold text-neutral-900">
            {{ formatRupiah(setoranStore.danaTerbagi) }}
          </dd>
        </div>
        <div>
          <dt class="text-body-sm text-neutral-900">Sisa Dana</dt>
          <dd
            class="text-h6 font-extrabold"
            :class="setoranStore.sisaDana < 0 ? 'text-red-600' : 'text-neutral-900'"
          >
            {{ setoranStore.sisaDana < 0 ? "-" : "" }}{{ formatRupiah(Math.abs(setoranStore.sisaDana)) }}
          </dd>
        </div>
      </dl>
    </section>

    <p
      v-if="sisaWarning && warga.length > 0"
      class="-mt-2 flex items-center gap-1.5 text-body-tiny font-medium text-orange-600"
      role="status"
    >
      <svg class="size-4 shrink-0" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm-1 5h2v7h-2V7Zm0 9h2v2h-2v-2Z" />
      </svg>
      {{ sisaWarning }}
    </p>

    <section class="flex flex-col gap-3">
      <h2 class="text-body-md font-extrabold text-neutral-900">Daftar Warga</h2>

      <EmptyState
        v-if="warga.length === 0"
        title="Daftar pembagian kosong"
        message="Semua warga sudah dikeluarkan. Kembali ke Input Data untuk memilih periode lagi."
      />

      <AlokasiWargaCard
        v-for="item in warga"
        :key="item.id_user"
        :alokasi="item"
        :sisa-dana="setoranStore.sisaDana"
        @change="(nominal) => setoranStore.setNominal(item.id_user, nominal)"
        @detail="openDetail(item)"
        @remove="removeTarget = item"
      />
    </section>

    <BaseButton
      class="mx-auto mt-4 mb-4 w-4/5"
      label="Konfirmasi"
      rounded="xl"
      :block="false"
      :disabled="!canConfirm"
      @click="confirmOpen = true"
    />

    <BaseDialog
      :open="removeTarget !== null"
      title="Hapus dari Daftar Pembagian?"
      message="Warga ini akan dikeluarkan dari daftar pembagian hasil setoran. Data setoran tetap tersimpan dan tidak akan dihapus."
      dismissible
      @close="removeTarget = null"
    >
      <template #actions>
        <BaseButton
          class="flex-1"
          label="Batal"
          variant="warning"
          :block="false"
          @click="removeTarget = null"
        />
        <BaseButton
          class="flex-1"
          label="Hapus"
          variant="accent"
          :block="false"
          @click="confirmRemove"
        />
      </template>
    </BaseDialog>

    <BaseDialog
      :open="confirmOpen"
      title="Dana Siap Dibagikan"
      message="Seluruh dana hasil penjualan sudah dibagikan kepada warga yang melakukan setoran pada periode ini."
      dismissible
      @close="closeConfirm"
    >
      <template #actions>
        <BaseButton
          class="flex-1"
          label="Batal"
          variant="warning"
          :block="false"
          :disabled="distributing"
          @click="closeConfirm"
        />
        <BaseButton
          class="flex-1"
          label="Bagikan Dana"
          variant="accent"
          :block="false"
          :loading="distributing"
          @click="distribute"
        />
      </template>
    </BaseDialog>

    <!-- Setelah BaseDialog: sama-sama z-50, toast harus tetap di atas. -->
    <AlertToast :message="toastMessage" :variant="toastVariant" />
  </main>
</template>
