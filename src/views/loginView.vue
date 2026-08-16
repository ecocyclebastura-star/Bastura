<script setup lang="ts">
import { onMounted, reactive, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import AuthLayout from "../layouts/AuthLayout.vue";
import AlertToast from "../components/AlertToast.vue";
import BaseInput from "../components/BaseInput.vue";
import BaseButton from "../components/BaseButton.vue";
import { useToast } from "../composables/useToast";
import { resolveAuthError } from "../constants/authErrors";
import { homeRouteName } from "../constants/roleRoutes";
import { useAuthStore } from "../stores/authStore";
import { EMAIL_HINT, EMAIL_RE } from "../utils/validators";
import logoBastura from "../assets/Property 1=Logo Large.svg";

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
const { toastMessage, toastVariant, showToast } = useToast();

const form = reactive({ email: "", password: "" });
const errors = reactive({ email: "", password: "" });

const isSubmitted = ref(false);
const isLoading = ref(false);

// Datang dari halaman reset password -> kasih tahu kata sandinya sudah berganti.
onMounted(() => {
  if (route.query.reset !== "success") return;
  showToast("Kata sandi berhasil diubah. Silakan masuk kembali.", "success");
  router.replace({ name: "login" });
});

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

  if (!form.password) {
    errors.password = "Password tidak boleh kosong";
    emptyCount++;
  } else {
    errors.password = "";
  }

  const errorCount = Object.values(errors).filter(Boolean).length;
  return { emptyCount, errorCount };
}

// Setelah submit pertama, error ikut ter-update saat user membenahi isian.
watch(form, () => {
  if (isSubmitted.value) validate();
});

async function handleLogin() {
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
    const user = await authStore.login(form.email.trim(), form.password);
    router.push({ name: homeRouteName(user.role) });
  } catch (error) {
    // Pesan spesifik ("akun tidak ditemukan" / "akun anda telah diblokir")
    // datang dari field `message` milik AppError.
    showToast(
      resolveAuthError(
        error,
        "Gagal masuk. Periksa kembali email dan password.",
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
        Selamat Datang
      </h1>
      <p class="mt-1 max-w-[16rem] text-center text-body-sm text-primary-900">
        Login dengan akun anda untuk memulai
      </p>
    </header>

    <form class="mt-8 flex flex-col gap-4" @submit.prevent="handleLogin">
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
        autocomplete="current-password"
        :error="errors.password"
      />

      <button
        type="button"
        class="-mt-1 self-end text-body-sm text-blue-600 underline underline-offset-2"
        @click="router.push({ name: 'forgot-password' })"
      >
        Lupa kata sandi?
      </button>

      <BaseButton
        type="submit"
        label="Masuk"
        variant="primary"
        :loading="isLoading"
      />

      <p class="text-center text-body-sm text-primary-900">
        Belum punya akun?
        <button
          type="button"
          class="font-semibold text-blue-600"
          @click="router.push({ name: 'register' })"
        >
          Daftar sekarang
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
