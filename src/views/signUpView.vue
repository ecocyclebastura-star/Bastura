<script setup lang="ts">
import { reactive, ref, watch } from "vue";
import { useRouter } from "vue-router";
import AuthLayout from "../layouts/AuthLayout.vue";
import AlertToast from "../components/AlertToast.vue";
import BaseInput from "../components/BaseInput.vue";
import BaseButton from "../components/BaseButton.vue";
import { useToast } from "../composables/useToast";
import { resolveAuthError } from "../constants/authErrors";
import { homeRouteName } from "../constants/roleRoutes";
import { useAuthStore } from "../stores/authStore";
import {
  DIGITS_RE,
  EMAIL_HINT,
  EMAIL_RE,
  NAME_RE,
  PASSWORD_HINT,
  PASSWORD_RE,
} from "../utils/validators";

const router = useRouter();
const authStore = useAuthStore();
const { toastMessage, toastVariant, showToast } = useToast();

const form = reactive({
  name: "",
  email: "",
  password: "",
  confirmPassword: "",
  phone: "",
});

const errors = reactive({
  name: "",
  email: "",
  password: "",
  confirmPassword: "",
  phone: "",
});

const isSubmitted = ref(false);
const isLoading = ref(false);

/** Isi `errors` berdasarkan isi form. Return jumlah field kosong & field salah. */
function validate() {
  let emptyCount = 0;

  const name = form.name.trim();
  if (!name) {
    errors.name = "Nama tidak boleh kosong";
    emptyCount++;
  } else if (!NAME_RE.test(name)) {
    errors.name = "Nama tidak boleh menggunakan simbol atau angka";
  } else {
    errors.name = "";
  }

  const email = form.email.trim();
  if (!email) {
    errors.email = "Email tidak boleh kosong";
    emptyCount++;
  } else if (!EMAIL_RE.test(email)) {
    errors.email = EMAIL_HINT;
  } else {
    errors.email = "";
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

  const phone = form.phone.trim();
  if (!phone) {
    errors.phone = "No. HP tidak boleh kosong";
    emptyCount++;
  } else if (!DIGITS_RE.test(phone)) {
    errors.phone = "No. HP tidak boleh menggunakan simbol atau huruf";
  } else if (phone.length < 10 || phone.length > 15) {
    errors.phone = "No. HP harus 10-15 digit";
  } else {
    errors.phone = "";
  }

  const errorCount = Object.values(errors).filter(Boolean).length;
  return { emptyCount, errorCount };
}

// Setelah submit pertama, error ikut ter-update saat user membenahi isian.
watch(form, () => {
  if (isSubmitted.value) validate();
});

async function handleRegister() {
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
    // Signup sekaligus membuat sesi di backend (token ikut disimpan Rust),
    // jadi user tidak perlu login ulang setelah ini.
    const user = await authStore.signup({
      name: form.name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      password: form.password,
      confirmPassword: form.confirmPassword,
    });

    router.push({ name: homeRouteName(user.role) });
  } catch (error) {
    showToast(
      resolveAuthError(error, "Gagal mendaftar. Coba lagi sebentar lagi."),
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

    <header class="pt-10 text-center">
      <h1 class="text-h3 font-extrabold text-primary-800">Selamat Datang</h1>
      <p class="mx-auto mt-1 max-w-68 text-body-sm text-primary-900">
        Daftar untuk mulai menyetor sampah dan mengelola saldo kamu.
      </p>
    </header>

    <form class="mt-6 flex flex-col gap-4" @submit.prevent="handleRegister">
      <BaseInput
        v-model="form.name"
        label="Nama Lengkap"
        placeholder="Masukkan nama lengkap anda"
        icon="user"
        autocomplete="name"
        :error="errors.name"
      />

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

      <BaseInput
        v-model="form.password"
        label="Password"
        placeholder="Masukkan kata sandi anda"
        icon="password"
        autocomplete="new-password"
        :error="errors.password"
      />

      <BaseInput
        v-model="form.confirmPassword"
        label="Konfirmasi Password"
        placeholder="Masukkan kembali kata sandi anda"
        icon="password"
        autocomplete="new-password"
        :error="errors.confirmPassword"
      />

      <BaseInput
        v-model="form.phone"
        label="No. HP"
        type="tel"
        placeholder="Masukkan nomor hp anda"
        icon="phone"
        inputmode="numeric"
        autocomplete="tel"
        :error="errors.phone"
      />

      <BaseButton
        type="submit"
        label="Daftar"
        variant="primary"
        :loading="isLoading"
        class="mt-2"
      />

      <p class="text-center text-body-sm text-primary-900">
        Sudah punya akun?
        <button
          type="button"
          class="font-semibold text-blue-600"
          @click="router.push({ name: 'login' })"
        >
          Masuk
        </button>
      </p>
    </form>

    <div class="pb-6" />
  </AuthLayout>
</template>
