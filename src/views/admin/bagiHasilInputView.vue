<script setup lang="ts">
import { computed, ref, useId } from "vue";
import { useRouter } from "vue-router";
import AlertToast from "../../components/AlertToast.vue";
import AppIcon from "../../components/AppIcon.vue";
import BagiHasilSteps from "../../components/BagiHasilSteps.vue";
import BaseButton from "../../components/BaseButton.vue";
import DarkSheet from "../../components/DarkSheet.vue";
import PageHeader from "../../components/PageHeader.vue";
import { resolveAuthError } from "../../constants/authErrors";
import { useToast } from "../../composables/useToast";
import { useSetoranStore } from "../../stores/setoranStore";
import type { BagiHasilDraft } from "../../stores/setoranStore";
import { formatPeriode, formatRibuan, formatRupiah } from "../../utils/formatters";

const router = useRouter();
const setoranStore = useSetoranStore();
const { toastMessage, toastVariant, showToast } = useToast();

const uid = useId();

// Balik dari langkah Alokasi: isian sebelumnya dipakai lagi.
const previous = setoranStore.draft;

/* ============================== TOTAL DANA ============================== */

/** Nominal disimpan sebagai deretan angka murni; titik ribuan cuma tampilan. */
const digits = ref(previous ? String(previous.total_dana) : "");
const totalDana = computed(() => Number(digits.value || 0));
const display = computed(() => (digits.value ? `Rp${formatRibuan(totalDana.value)}` : ""));

function handleDanaInput(event: Event) {
  const input = event.target as HTMLInputElement;
  // Maksimal 13 digit (triliunan) supaya tetap muat satu baris.
  digits.value = input.value.replace(/\D/g, "").replace(/^0+/, "").slice(0, 13);
  // Sama seperti Tarik Saldo: disamakan langsung ke elemennya karena Vue
  // tidak me-render ulang kalau hasilnya kebetulan sama.
  input.value = display.value;
}

/* ============================ RENTANG TANGGAL ============================ */

const dateStart = ref(previous?.date_start ?? "");
const dateEnd = ref(previous?.date_end ?? "");

/** Setoran di masa depan belum mungkin ada, jadi hari ini batas atasnya. */
const today = (() => {
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
})();

// Format "yyyy-mm-dd" bisa dibandingkan langsung sebagai string.
const rangeError = computed(() =>
  dateStart.value && dateEnd.value && dateEnd.value < dateStart.value
    ? "Tanggal akhir tidak boleh sebelum tanggal awal."
    : "",
);

const isValid = computed(
  () => totalDana.value > 0 && Boolean(dateStart.value && dateEnd.value) && !rangeError.value,
);

/* ================================ RINGKASAN ================================ */

const loading = ref(false);
const summary = ref<BagiHasilDraft | null>(null);

async function handleSubmit() {
  if (!isValid.value || loading.value) return;

  loading.value = true;
  try {
    summary.value = await setoranStore.preview(totalDana.value, dateStart.value, dateEnd.value);
  } catch (error) {
    showToast(
      resolveAuthError(error, "Data setoran periode ini gagal dimuat. Coba lagi sebentar lagi."),
      "error",
    );
  } finally {
    loading.value = false;
  }
}

function proceed() {
  if (!summary.value || summary.value.warga.length === 0) return;
  setoranStore.startDraft(summary.value);
  summary.value = null;
  router.push({ name: "admin-setoran-bagi-hasil-alokasi" });
}

const fieldClass =
  "rounded-2xl border border-primary-700 bg-white text-body-reg text-neutral-900 focus-within:border-primary-500 focus-within:ring-1 focus-within:ring-primary-500";
const labelClass = "text-body-reg font-medium text-neutral-900";
</script>

<template>
  <main class="mx-auto flex w-full max-w-sm flex-col gap-4 px-6 pt-safe">
    <PageHeader title="Bagi Hasil Setoran" fallback="admin-setoran" />

    <BagiHasilSteps :current="0" />

    <form class="flex flex-col" @submit.prevent="handleSubmit">
      <section class="flex flex-col gap-4 rounded-2xl border border-neutral-200 bg-neutral-100 px-4 pt-4 pb-10">
        <h2 class="flex items-center gap-3 text-h5 font-extrabold text-neutral-900">
          <AppIcon name="bank" class="size-8 text-primary-800" />
          Data Penerimaan Dana
        </h2>

        <div class="flex flex-col gap-1.5">
          <label :for="`${uid}-dana`" :class="labelClass">Total dana dari BSI</label>
          <input
            :id="`${uid}-dana`"
            :value="display"
            type="text"
            inputmode="numeric"
            autocomplete="off"
            placeholder="Rp0"
            required
            :class="[fieldClass, 'w-full px-4 py-3 placeholder:text-neutral-400 focus:outline-none']"
            @input="handleDanaInput"
          />
        </div>

        <fieldset class="flex flex-col gap-1.5">
          <legend :class="[labelClass, 'mb-1.5']">Rentang Tanggal Setoran</legend>

          <div class="flex items-center gap-2">
            <div :class="[fieldClass, 'flex min-w-0 flex-1 items-center gap-1 px-3 py-3']">
              <input
                v-model="dateStart"
                type="date"
                required
                :max="dateEnd || today"
                aria-label="Tanggal awal"
                class="min-w-0 flex-1 bg-transparent text-body-sm focus:outline-none"
              />
              <AppIcon name="calendar" class="size-6 text-primary-800" />
            </div>

            <span class="h-0.5 w-3 shrink-0 bg-neutral-900" aria-hidden="true" />

            <div :class="[fieldClass, 'flex min-w-0 flex-1 items-center gap-1 px-3 py-3']">
              <input
                v-model="dateEnd"
                type="date"
                required
                :min="dateStart || undefined"
                :max="today"
                aria-label="Tanggal akhir"
                class="min-w-0 flex-1 bg-transparent text-body-sm focus:outline-none"
              />
              <AppIcon name="calendar" class="size-6 text-primary-800" />
            </div>
          </div>

          <p v-if="rangeError" class="text-body-tiny font-medium text-red-600" role="alert">
            {{ rangeError }}
          </p>
        </fieldset>
      </section>

      <BaseButton
        class="mx-auto mt-16 w-4/5"
        type="submit"
        label="Lanjutkan"
        rounded="xl"
        :block="false"
        :disabled="!isValid"
        :loading="loading"
      />
    </form>

    <DarkSheet
      :open="summary !== null"
      title="Ringkasan Penerimaan Dana"
      @close="summary = null"
    >
      <template v-if="summary">
        <p class="text-body-sm">Total Dana</p>
        <p class="text-h4 font-extrabold">{{ formatRupiah(summary.total_dana) }}</p>

        <dl class="mt-5 grid grid-cols-2 gap-4">
          <div>
            <dt class="text-body-sm">Periode Setoran</dt>
            <dd class="text-body-reg font-bold">
              {{ formatPeriode(summary.date_start, summary.date_end) }}
            </dd>
          </div>
          <div>
            <dt class="text-body-sm">Warga Ditemukan</dt>
            <dd class="text-body-reg font-bold">{{ summary.warga.length }} warga</dd>
          </div>
        </dl>

        <p
          v-if="summary.warga.length === 0"
          class="mt-4 rounded-xl bg-scheme-fg px-3 py-2 text-body-sm text-secondary-300"
        >
          Belum ada setoran yang menunggu hasil pada periode ini. Coba pilih rentang tanggal lain.
        </p>
      </template>

      <template #actions>
        <BaseButton
          class="w-4/5"
          label="Lanjutkan"
          variant="accent"
          rounded="xl"
          :block="false"
          :disabled="!summary || summary.warga.length === 0"
          @click="proceed"
        />
      </template>
    </DarkSheet>

    <AlertToast :message="toastMessage" :variant="toastVariant" />
  </main>
</template>

<style scoped>
/* Sama seperti ScheduleSheet: ikon kalender bawaan browser disembunyikan
   tapi dibentangkan sepenuh kolom, jadi ketukan di mana pun tetap membuka
   date picker sistem sementara yang terlihat ikon kita. */
input[type="date"] {
  position: relative;
}

input[type="date"]::-webkit-calendar-picker-indicator {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  cursor: pointer;
  opacity: 0;
}
</style>
