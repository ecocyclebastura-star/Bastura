<script setup lang="ts">
import { computed, onMounted, ref, useId, watch } from "vue";
import { useRouter } from "vue-router";
import AlertToast from "../../components/AlertToast.vue";
import BaseButton from "../../components/BaseButton.vue";
import BaseDialog from "../../components/BaseDialog.vue";
import PageHeader from "../../components/PageHeader.vue";
import { resolveAuthError, serverErrorCode } from "../../constants/authErrors";
import { useToast } from "../../composables/useToast";
import { formatPersen, toNumber, useCommissionStore } from "../../stores/commissionStore";

const router = useRouter();
const store = useCommissionStore();
const { toastMessage, toastVariant, showToast } = useToast();

const uid = useId();

/**
 * Nilai mentah dari server, dikirim balik apa adanya sebagai `old_fee` --
 * server memakainya untuk menolak perubahan kalau tarifnya sudah keburu
 * diubah super admin lain.
 */
const currentRaw = computed(() => String(store.summary?.current_fee_percentage ?? ""));
const loading = ref(false);
const loadError = ref("");

async function loadCurrent() {
  loading.value = true;
  loadError.value = "";
  try {
    await store.fetchSummary(1);
  } catch (error) {
    loadError.value = resolveAuthError(error, "Gagal memuat persentase komisi saat ini.");
  } finally {
    loading.value = false;
  }
}

// Halaman dibuka langsung tanpa lewat ringkasan: tarik dulu nilainya.
onMounted(() => {
  if (!store.summary) loadCurrent();
});

/* ================================ ISIAN ================================ */

const newFee = ref("");
const feeError = ref("");
watch(newFee, () => (feeError.value = ""));

/** Angka 0-100, koma atau titik desimal sama-sama diterima. */
const parsedFee = computed(() => {
  const value = Number(newFee.value.trim().replace(",", "."));
  return newFee.value.trim() && Number.isFinite(value) ? value : null;
});

function onFeeInput(event: Event) {
  const input = event.target as HTMLInputElement;
  // Cuma digit dan satu pemisah desimal, maksimal dua angka di belakangnya.
  const cleaned = input.value
    .replace(/[^\d.,]/g, "")
    .replace(/^([^.,]*[.,])(.*)$/, (_, head: string, tail: string) => head + tail.replace(/[.,]/g, ""))
    .replace(/([.,]\d{2}).*$/, "$1")
    .slice(0, 6);
  newFee.value = cleaned;
  input.value = cleaned;
}

function validate(): boolean {
  if (parsedFee.value === null) feeError.value = "Masukkan persentase baru";
  else if (parsedFee.value < 0 || parsedFee.value > 100)
    feeError.value = "Persentase harus di antara 0 hingga 100";
  else if (parsedFee.value === toNumber(currentRaw.value))
    feeError.value = "Persentase baru sama dengan yang sekarang";
  else feeError.value = "";
  return !feeError.value;
}

/* ================================ SIMPAN ================================ */

const confirmOpen = ref(false);
const saving = ref(false);

function askConfirm() {
  if (!currentRaw.value) {
    showToast("Persentase saat ini belum termuat. Coba lagi.", "warning");
    return;
  }
  if (validate()) confirmOpen.value = true;
}

function closeConfirm() {
  if (!saving.value) confirmOpen.value = false;
}

async function save() {
  if (saving.value || parsedFee.value === null) return;
  saving.value = true;

  try {
    await store.updateFee(String(parsedFee.value), currentRaw.value);
    store.setFlash("Persentase komisi berhasil diubah.");
    confirmOpen.value = false;
    if (window.history.state?.back) router.back();
    else router.replace({ name: "admin-komisi" });
  } catch (error) {
    confirmOpen.value = false;
    showToast(resolveAuthError(error, "Perubahan gagal disimpan."), "error");
    // Tarif di server sudah berubah: tampilkan nilai terbarunya.
    if (serverErrorCode(error) === "OLD_FEE_MISMATCH") loadCurrent();
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <main class="mx-auto flex w-full max-w-sm flex-col gap-6 px-6 pt-safe">
    <PageHeader title="Komisi Setoran" fallback="admin-komisi" />

    <div
      v-if="loadError"
      class="rounded-2xl border border-red-200 bg-red-50 p-4"
      role="alert"
    >
      <p class="text-body-sm text-red-700">{{ loadError }}</p>
      <button
        type="button"
        class="mt-3 cursor-pointer rounded-full bg-red-600 px-4 py-2 text-body-sm font-bold text-white transition-colors duration-200 hover:bg-red-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
        @click="loadCurrent"
      >
        Coba Lagi
      </button>
    </div>

    <form v-else class="flex flex-col gap-10" novalidate @submit.prevent="askConfirm">
      <section
        class="flex flex-col gap-2 rounded-3xl bg-linear-to-r from-primary-500 to-secondary-400 p-4 text-white shadow-lg shadow-primary-900/15"
      >
        <h2 class="text-h5 font-extrabold">Persentase Komisi Saat ini</h2>

        <p class="mt-1 text-body-reg font-medium">Persentase Komisi Saat ini</p>
        <p
          class="rounded-2xl bg-linear-to-r from-white/80 to-white/40 px-4 py-3 text-h6 font-extrabold text-primary-800"
          :class="loading ? 'animate-pulse' : ''"
        >
          {{ loading ? "..." : formatPersen(currentRaw) }}
        </p>

        <label :for="`${uid}-baru`" class="mt-4 text-body-reg font-medium">Persentase Baru</label>
        <div class="relative">
          <input
            :id="`${uid}-baru`"
            :value="newFee"
            type="text"
            inputmode="decimal"
            autocomplete="off"
            placeholder="0"
            :aria-invalid="Boolean(feeError)"
            :aria-describedby="feeError ? `${uid}-error` : undefined"
            class="w-full rounded-2xl border bg-white px-4 py-3 pr-10 text-body-reg text-neutral-900 placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-white"
            :class="feeError ? 'border-red-500' : 'border-primary-700'"
            @input="onFeeInput"
          />
          <span
            class="pointer-events-none absolute inset-y-0 right-4 flex items-center text-body-reg font-bold text-neutral-400"
            aria-hidden="true"
          >
            %
          </span>
        </div>
        <p
          v-if="feeError"
          :id="`${uid}-error`"
          class="rounded-lg bg-white/90 px-2 py-0.5 text-body-tiny font-medium text-red-600"
        >
          {{ feeError }}
        </p>
      </section>

      <BaseButton
        class="mx-auto w-3/4"
        type="submit"
        label="Simpan"
        variant="accent"
        :block="false"
        :disabled="loading"
      />
    </form>

    <BaseDialog
      :open="confirmOpen"
      title="Ubah Persentase Komisi?"
      message="Persentase komisi akan diubah. Pastikan persentase sudah sesuai sebelum menyimpan."
      dismissible
      @close="closeConfirm"
    >
      <template #actions>
        <BaseButton
          class="flex-1"
          label="Batal"
          variant="warning"
          :block="false"
          :disabled="saving"
          @click="closeConfirm"
        />
        <BaseButton
          class="flex-1"
          label="Simpan"
          variant="accent"
          :block="false"
          :loading="saving"
          @click="save"
        />
      </template>
    </BaseDialog>

    <AlertToast :message="toastMessage" :variant="toastVariant" />
  </main>
</template>
