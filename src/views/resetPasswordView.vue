<script setup lang="ts">
import { computed, onUnmounted, reactive, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import AuthLayout from "../layouts/AuthLayout.vue";
import AlertToast from "../components/AlertToast.vue";
import BaseInput from "../components/BaseInput.vue";
import BaseButton from "../components/BaseButton.vue";
import OtpInput from "../components/OtpInput.vue";
import { useToast } from "../composables/useToast";
import { isOtpSessionExpired, resolveAuthError } from "../constants/authErrors";
import { useAuthStore } from "../stores/authStore";
import { PASSWORD_HINT, PASSWORD_RE } from "../utils/validators";
import logoBastura from "../assets/Property 1=Logo Large.svg";

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
const { toastMessage, toastVariant, showToast } = useToast();

const OTP_LENGTH = 6;
const RESEND_DELAY = 60; // detik

/** Email tujuan OTP, dibawa dari halaman lupa kata sandi lewat query. */
const email = computed(() => String(route.query.email ?? ""));

const form = reactive({ otp: "", password: "", confirmPassword: "" });
const errors = reactive({ otp: "", password: "", confirmPassword: "" });

const isSubmitted = ref(false);
const isLoading = ref(false);

function validate() {
  let emptyCount = 0;

  if (!form.otp) {
    errors.otp = "Kode OTP tidak boleh kosong";
    emptyCount++;
  } else if (form.otp.length < OTP_LENGTH) {
    errors.otp = `Kode OTP harus ${OTP_LENGTH} digit`;
  } else {
    errors.otp = "";
  }

  if (!form.password) {
    errors.password = "Password tidak boleh kosong";
    emptyCount++;
  } else if (!PASSWORD_RE.test(form.password)) {
    errors.password = PASSWORD_HINT;
  } else {
    errors.password = "";
  }

  if (!form.confirmPassword) {
    errors.confirmPassword = "Password tidak boleh kosong";
    emptyCount++;
  } else if (!PASSWORD_RE.test(form.confirmPassword)) {
    errors.confirmPassword = PASSWORD_HINT;
  } else if (form.confirmPassword !== form.password) {
    errors.confirmPassword = "Konfirmasi password tidak sama";
  } else {
    errors.confirmPassword = "";
  }

  const errorCount = Object.values(errors).filter(Boolean).length;
  return { emptyCount, errorCount };
}

// Setelah submit pertama, error ikut ter-update saat user membenahi isian.
watch(form, () => {
  if (isSubmitted.value) validate();
});

/* ---- Hitung mundur kirim ulang kode ---- */
const countdown = ref(RESEND_DELAY);
let countdownTimer: ReturnType<typeof setInterval> | undefined;

function startCountdown() {
  countdown.value = RESEND_DELAY;
  clearInterval(countdownTimer);
  countdownTimer = setInterval(() => {
    countdown.value--;
    if (countdown.value <= 0) clearInterval(countdownTimer);
  }, 1000);
}

const countdownLabel = computed(() => {
  const minutes = String(Math.floor(countdown.value / 60)).padStart(2, "0");
  const seconds = String(countdown.value % 60).padStart(2, "0");
  return `${minutes}:${seconds}`;
});

startCountdown();
onUnmounted(() => clearInterval(countdownTimer));

async function handleResend() {
  if (countdown.value > 0) return;

  try {
    await authStore.forgotPassword(email.value);

    form.otp = "";
    errors.otp = "";
    startCountdown();
    showToast("Kode OTP baru sudah dikirim ke email kamu.", "success");
  } catch (error) {
    showToast(
      resolveAuthError(error, "Gagal mengirim ulang kode. Coba lagi nanti."),
      "error",
    );
    console.error(error);
  }
}

async function handleReset() {
  isSubmitted.value = true;
  const { emptyCount, errorCount } = validate();

  if (errorCount > 0) {
    showToast(
      emptyCount > 0
        ? "Lengkapi data yang masih kosong."
        : "Data yang di inputkan masih salah.",
      "warning",
    );
    return;
  }

  isLoading.value = true;
  try {
    await authStore.resetPassword({
      email: email.value,
      otp: form.otp,
      newPassword: form.password,
      confirmPassword: form.confirmPassword,
    });

    // Login membaca query ini untuk menampilkan toast berhasil.
    router.push({ name: "login", query: { reset: "success" } });
  } catch (error) {
    showToast(
      resolveAuthError(
        error,
        "Gagal mengubah kata sandi. Coba lagi sebentar lagi.",
      ),
      "error",
    );

    // Backend menghapus sesi OTP-nya setiap kali reset dicoba, jadi percobaan
    // berikutnya pasti ditolak. Buka tombol "Kirim ulang kode" biar user bisa
    // langsung minta kode baru tanpa nunggu hitungan mundur.
    if (isOtpSessionExpired(error)) {
      form.otp = "";
      errors.otp = "";
      countdown.value = 0;
      clearInterval(countdownTimer);
    }

    console.error(error);
  } finally {
    isLoading.value = false;
  }
}
</script>

<template>
  <AuthLayout>
    <AlertToast :message="toastMessage" :variant="toastVariant" />

    <!-- Header: logo + judul -->
    <header class="flex flex-col items-center pt-10">
      <img
        :src="logoBastura"
        alt="Logo Bastura"
        class="h-auto w-28"
        width="148"
        height="152"
      />

      <h1 class="mt-4 text-center text-h4 font-extrabold text-primary-800">
        Atur Ulang Kata Sandi
      </h1>
      <p class="mt-1 max-w-[18rem] text-center text-body-sm text-primary-900">
        Masukkan kode OTP yang kami kirim ke
        <span class="font-semibold">{{ email }}</span>
        beserta kata sandi barumu.
      </p>
    </header>

    <form class="mt-6 flex flex-col gap-4" @submit.prevent="handleReset">
      <OtpInput
        v-model="form.otp"
        label="Kode OTP"
        :length="OTP_LENGTH"
        :error="errors.otp"
      />

      <p class="-mt-1 text-center text-body-sm text-primary-900">
        Belum menerima kode?
        <span v-if="countdown > 0" class="font-semibold text-primary-800">
          Kirim ulang {{ countdownLabel }}
        </span>
        <button
          v-else
          type="button"
          class="font-semibold text-blue-600"
          @click="handleResend"
        >
          Kirim ulang kode
        </button>
      </p>

      <BaseInput
        v-model="form.password"
        label="Password Baru"
        placeholder="Masukkan kata sandi baru"
        icon="password"
        autocomplete="new-password"
        :error="errors.password"
      />

      <BaseInput
        v-model="form.confirmPassword"
        label="Konfirmasi Password Baru"
        placeholder="Masukkan kembali kata sandi baru"
        icon="password"
        autocomplete="new-password"
        :error="errors.confirmPassword"
      />

      <BaseButton
        type="submit"
        label="Simpan Kata Sandi"
        variant="primary"
        :loading="isLoading"
        class="mt-2"
      />

      <p class="text-center text-body-sm text-primary-900">
        Salah memasukkan email?
        <button
          type="button"
          class="font-semibold text-blue-600"
          @click="router.push({ name: 'forgot-password' })"
        >
          Ubah email
        </button>
      </p>
    </form>

    <!-- Footer -->
    <footer class="mt-auto pb-6 pt-8">
      <p class="mx-auto max-w-[18rem] text-center text-body-sm text-primary-800">
        Mari jaga lingkungan bersama dengan langkah sederhana setiap hari
      </p>
    </footer>
  </AuthLayout>
</template>
