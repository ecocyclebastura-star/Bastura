<script setup lang="ts">
import { computed, ref } from "vue";
import { useRouter } from "vue-router";
import AlertToast from "../../components/AlertToast.vue";
import BaseButton from "../../components/BaseButton.vue";
import BaseDialog from "../../components/BaseDialog.vue";
import PageHeader from "../../components/PageHeader.vue";
import { resolveAuthError } from "../../constants/authErrors";
import { useToast } from "../../composables/useToast";
import { useBalanceStore } from "../../stores/balanceStore";
import {
  MIN_WITHDRAWAL,
  useTransactionStore,
} from "../../stores/transactionStore";
import { formatRibuan, formatRupiah } from "../../utils/formatters";

const router = useRouter();
const balanceStore = useBalanceStore();
const transactionStore = useTransactionStore();
const { toastMessage, toastVariant, showToast } = useToast();

/** Pilihan cepat sesuai desain. */
const PRESETS = [10_000, 20_000, 50_000, 100_000, 200_000, 500_000];

/** Nominal disimpan sebagai deretan angka murni; titik ribuan cuma tampilan. */
const digits = ref("");
const submitting = ref(false);
const successOpen = ref(false);

const saldo = computed(() => balanceStore.saldo ?? 0);
const amount = computed(() => Number(digits.value || 0));

const display = computed(() =>
  digits.value ? formatRibuan(amount.value) : "",
);

/**
 * Pesan error baru muncul setelah ada isinya: kotak kosong itu keadaan awal
 * yang wajar, bukan kesalahan user.
 */
const errorMessage = computed(() => {
  if (!digits.value) return "";
  if (amount.value < MIN_WITHDRAWAL) {
    return `Pastikan nominal saldo yang ditarik minimum ${formatRupiah(MIN_WITHDRAWAL)} ya.`;
  }
  if (amount.value > saldo.value) {
    return "Saldo kamu tidak mencukupi untuk transaksi ini.";
  }
  return "";
});

const isValid = computed(() => Boolean(digits.value) && !errorMessage.value);

function handleInput(event: Event) {
  const input = event.target as HTMLInputElement;

  // Maksimal 12 digit supaya nominalnya tetap muat di satu baris.
  digits.value = input.value.replace(/\D/g, "").replace(/^0+/, "").slice(0, 12);

  // Nilai yang diketik dan yang boleh tampil bisa beda (mis. huruf ikut
  // terketik), dan kalau hasilnya sama persis Vue tidak me-render ulang --
  // jadi isinya disamakan langsung ke elemennya.
  input.value = display.value;
}

function pick(value: number) {
  digits.value = String(value);
}

async function handleSubmit() {
  if (!isValid.value || submitting.value) return;

  submitting.value = true;
  try {
    await transactionStore.withdraw(amount.value);
    successOpen.value = true;
  } catch (error) {
    showToast(
      resolveAuthError(error, "Penarikan saldo gagal diajukan."),
      "error",
    );
  } finally {
    submitting.value = false;
  }
}

/** Halaman Dompet menarik ulang riwayatnya sendiri waktu dibuka lagi. */
function finish() {
  successOpen.value = false;
  router.push({ name: "user-dompet" });
}
</script>

<template>
  <main class="mx-auto flex w-full max-w-sm flex-col px-6 pt-safe">
    <AlertToast :message="toastMessage" :variant="toastVariant" />

    <PageHeader title="Tarik Saldo" fallback="user-dompet" />

    <p class="mt-6 text-body-reg font-semibold text-neutral-900">
      Saldo : {{ formatRupiah(saldo) }}
    </p>

    <label class="mt-4 text-body-sm text-neutral-700" for="nominal-penarikan">
      Nominal
    </label>

    <div
      class="mt-1 flex items-center gap-1 rounded-2xl border-2 bg-white px-4 py-3"
      :class="errorMessage ? 'border-red-500' : 'border-neutral-300'"
    >
      <span class="text-h4 font-extrabold text-neutral-900">Rp</span>
      <input
        id="nominal-penarikan"
        :value="display"
        type="text"
        inputmode="numeric"
        placeholder="0"
        autocomplete="off"
        aria-describedby="nominal-error"
        :aria-invalid="Boolean(errorMessage)"
        class="w-full bg-transparent text-h4 font-extrabold text-neutral-900 outline-none placeholder:text-neutral-400"
        @input="handleInput"
      />
    </div>

    <p
      v-if="errorMessage"
      id="nominal-error"
      class="mt-1.5 flex items-start gap-1.5 text-body-tiny font-medium text-red-600"
      role="alert"
    >
      <svg
        class="mt-0.5 size-4 shrink-0"
        viewBox="0 0 24 24"
        fill="currentColor"
        aria-hidden="true"
      >
        <path
          d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm-1 5h2v7h-2V7Zm0 9h2v2h-2v-2Z"
        />
      </svg>
      <span>{{ errorMessage }}</span>
    </p>

    <p class="mt-5 text-body-sm text-neutral-700">Pilih nominal</p>

    <div class="mt-2 grid grid-cols-2 gap-3">
      <button
        v-for="preset in PRESETS"
        :key="preset"
        type="button"
        class="cursor-pointer rounded-xl border py-3 text-body-reg font-bold transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
        :class="
          amount === preset
            ? 'border-primary-500 bg-primary-100 text-primary-700'
            : 'border-neutral-300 bg-white text-neutral-900 hover:bg-neutral-100'
        "
        @click="pick(preset)"
      >
        {{ formatRupiah(preset) }}
      </button>
    </div>

    <BaseButton
      class="mx-auto mt-10 w-4/5"
      label="Selesai"
      variant="accent"
      :block="false"
      :disabled="!isValid"
      :loading="submitting"
      @click="handleSubmit"
    />

    <!-- Sengaja tidak bisa ditutup lewat latar: penarikannya sudah tercatat di
         server, jadi user harus benar-benar diantar balik ke Dompet. -->
    <BaseDialog
      :open="successOpen"
      title="Penarikan Berhasil Diajukan"
      message="Permintaan penarikan saldo kamu sudah dikirim ke admin. Statusnya bisa dipantau di riwayat transaksi."
    >
      <template #actions>
        <BaseButton label="Selesai" variant="primary" @click="finish" />
      </template>
    </BaseDialog>
  </main>
</template>
