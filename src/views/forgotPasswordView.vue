<script setup lang="ts">
import { reactive, ref, watch } from "vue";
import { useRouter } from "vue-router";
import AuthLayout from "../layouts/AuthLayout.vue";
import AlertToast from "../components/AlertToast.vue";
import BaseInput from "../components/BaseInput.vue";
import BaseButton from "../components/BaseButton.vue";
import { useToast } from "../composables/useToast";
import { resolveAuthError } from "../constants/authErrors";
import { useAuthStore } from "../stores/authStore";
import { EMAIL_HINT, EMAIL_RE } from "../utils/validators";
import logoBastura from "../assets/Property 1=Logo Large.svg";

const router = useRouter();
const authStore = useAuthStore();
const { toastMessage, toastVariant, showToast } = useToast();

const form = reactive({ email: "" });
const errors = reactive({ email: "" });

const isSubmitted = ref(false);
const isLoading = ref(false);

function validate() {
  let emptyCount = 0;

  const email = form.email.trim();
  if (!email) {
    errors.email = "Email tidak boleh kosong";
    emptyCount++;
  } else if (!EMAIL_RE.test(email)) {
    errors.email = EMAIL_HINT;
  } else {
    errors.email = "";
  }

  const errorCount = Object.values(errors).filter(Boolean).length;
  return { emptyCount, errorCount };
}

// Setelah submit pertama, error ikut ter-update saat user membenahi isian.
watch(form, () => {
  if (isSubmitted.value) validate();
});

async function handleConfirm() {
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

  const email = form.email.trim();

  isLoading.value = true;
  try {
    // Server kirim OTP ke email, hash-nya disimpan Rust di otp_cache.
    await authStore.forgotPassword(email);

    // Email dibawa lewat query supaya halaman reset tetap tahu tujuan OTP
    // walaupun user refresh browser.
    router.push({ name: "reset-password", query: { email } });
  } catch (error) {
    // Misal email belum terdaftar -> pesannya datang dari server.
    showToast(
      resolveAuthError(
        error,
        "Gagal mengirim kode OTP. Coba lagi sebentar lagi.",
      ),
      "error",
    );
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
    <header class="flex flex-col items-center pt-12">
      <img
        :src="logoBastura"
        alt="Logo Bastura"
        class="h-auto w-32"
        width="148"
        height="152"
      />

      <h1 class="mt-4 text-h3 font-extrabold text-primary-800">
        Lupa Kata Sandi?
      </h1>
      <p class="mt-1 max-w-68 text-center text-body-sm text-primary-900">
        Masukkan email yang terdaftar untuk mengatur ulang kata sandi kamu.
      </p>
    </header>

    <form class="mt-8 flex flex-col gap-6" @submit.prevent="handleConfirm">
      <BaseInput
        v-model="form.email"
        label="Email"
        type="email"
        placeholder="Masukkan email anda"
        icon="mail"
        inputmode="email"
        autocomplete="email"
        :error="errors.email"
      />

      <BaseButton
        type="submit"
        label="Konfirmasi"
        variant="primary"
        :loading="isLoading"
      />

      <p class="text-center text-body-sm text-primary-900">
        Ingat kata sandi?
        <button
          type="button"
          class="font-semibold text-blue-600"
          @click="router.push({ name: 'login' })"
        >
          Masuk
        </button>
      </p>
    </form>

    <!-- Footer -->
    <footer class="mt-auto pb-6 pt-10">
      <p class="mx-auto max-w-[18rem] text-center text-body-sm text-primary-800">
        Mari jaga lingkungan bersama dengan langkah sederhana setiap hari
      </p>
    </footer>
  </AuthLayout>
</template>
