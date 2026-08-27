<script setup lang="ts">
import { ref } from "vue";
import AlertToast from "../../components/AlertToast.vue";
import BaseButton from "../../components/BaseButton.vue";
import BaseInput from "../../components/BaseInput.vue";
import PageHeader from "../../components/PageHeader.vue";
import { isMissingCommand, resolveAuthError } from "../../constants/authErrors";
import { useToast } from "../../composables/useToast";
import { useAuthStore } from "../../stores/authStore";
import { PASSWORD_HINT, PASSWORD_RE } from "../../utils/validators";

const authStore = useAuthStore();
const { toastMessage, toastVariant, showToast } = useToast();

const currentPassword = ref("");
const newPassword = ref("");
const confirmPassword = ref("");

const currentError = ref("");
const newError = ref("");
const confirmError = ref("");
const saving = ref(false);

const EMPTY_HINT = "Password tidak boleh kosong";

function validate(): "ok" | "empty" | "invalid" {
  currentError.value = "";
  newError.value = "";
  confirmError.value = "";

  if (!currentPassword.value) currentError.value = EMPTY_HINT;
  if (!newPassword.value) newError.value = EMPTY_HINT;
  if (!confirmPassword.value) confirmError.value = EMPTY_HINT;
  if (currentError.value || newError.value || confirmError.value) return "empty";

  // Password lama sengaja hanya dicek keberadaannya. Memaksanya lolos aturan
  // format yang berlaku sekarang bisa mengunci akun lama yang passwordnya
  // dibuat sebelum aturan itu ada -- dan yang berhak menilai benar/salahnya
  // password lama tetap server, bukan aplikasi.
  if (!PASSWORD_RE.test(newPassword.value)) newError.value = PASSWORD_HINT;
  if (!confirmPassword.value || confirmPassword.value !== newPassword.value) {
    confirmError.value = "Konfirmasi password tidak sama dengan password baru";
  }

  return newError.value || confirmError.value ? "invalid" : "ok";
}

async function handleSave() {
  const result = validate();

  if (result === "empty") {
    showToast("Lengkapi data yang masih kosong.", "warning");
    return;
  }
  if (result === "invalid") {
    showToast("Data yang di inputkan masih salah.", "warning");
    return;
  }

  saving.value = true;
  try {
    await authStore.changePassword({
      currentPassword: currentPassword.value,
      newPassword: newPassword.value,
      confirmPassword: confirmPassword.value,
    });

    currentPassword.value = "";
    newPassword.value = "";
    confirmPassword.value = "";
    showToast("Perubahan berhasil disimpan.", "success");
  } catch (error) {
    if (isMissingCommand(error)) {
      showToast(
        "Ganti password belum tersedia: command-nya belum ada di backend.",
        "error",
      );
    } else {
      showToast(resolveAuthError(error, "Perubahan gagal disimpan."), "error");
    }
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <main class="mx-auto flex w-full max-w-sm flex-col px-6 pt-safe">
    <AlertToast :message="toastMessage" :variant="toastVariant" />

    <PageHeader title="Ganti Password" fallback="user-profil" />

    <form class="mt-8 flex flex-col gap-5" @submit.prevent="handleSave">
      <BaseInput
        v-model="currentPassword"
        variant="line"
        type="password"
        icon="none"
        label="Password sebelumnya"
        placeholder="Masukkan password saat ini"
        autocomplete="current-password"
        :error="currentError"
      />

      <BaseInput
        v-model="newPassword"
        variant="line"
        type="password"
        icon="none"
        label="Password baru"
        placeholder="Masukkan password baru"
        autocomplete="new-password"
        :error="newError"
      />

      <BaseInput
        v-model="confirmPassword"
        variant="line"
        type="password"
        icon="none"
        label="Konfirmasi Password baru"
        placeholder="Masukkan kembali password baru"
        autocomplete="new-password"
        :error="confirmError"
      />

      <BaseButton
        class="mx-auto mt-10 w-4/5"
        label="Simpan"
        variant="accent"
        type="submit"
        :block="false"
        :loading="saving"
      />
    </form>
  </main>
</template>
