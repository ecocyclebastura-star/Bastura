<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { onBeforeRouteLeave, useRouter } from "vue-router";
import AlertToast from "../../components/AlertToast.vue";
import BaseButton from "../../components/BaseButton.vue";
import BaseInput from "../../components/BaseInput.vue";
import PageHeader from "../../components/PageHeader.vue";
import { resolveAuthError } from "../../constants/authErrors";
import { useToast } from "../../composables/useToast";
import { useProfileStore } from "../../stores/profileStore";
import {
  DIGITS_RE,
  EMAIL_HINT,
  EMAIL_RE,
  PHONE_FORMAT_HINT,
  PHONE_HINT,
  PHONE_RE,
} from "../../utils/validators";

const router = useRouter();
const profileStore = useProfileStore();
const { toastMessage, toastVariant, showToast } = useToast();

const phone = ref("");
const email = ref("");
const phoneError = ref("");
const emailError = ref("");
const saving = ref(false);

// Pesan salah hilang begitu kolomnya mulai diisi lagi.
watch(phone, () => (phoneError.value = ""));
watch(email, () => (emailError.value = ""));

const original = computed(() => ({
  phone: profileStore.adminContact?.phone?.trim() ?? "",
  email: profileStore.adminContact?.email?.trim() ?? "",
}));

function fillForm() {
  phone.value = original.value.phone;
  email.value = original.value.email;
}

onMounted(async () => {
  // Dibuka langsung lewat URL: kontaknya belum ada di memori.
  if (!profileStore.adminContact) await profileStore.loadAdminContact();
  fillForm();
});

const phoneChanged = computed(() => phone.value.trim() !== original.value.phone);
const emailChanged = computed(() => email.value.trim() !== original.value.email);
const isDirty = computed(() => phoneChanged.value || emailChanged.value);

/**
 * Yang divalidasi cuma kolom yang diubah, supaya kontak lama berformat lain
 * (mis. +62...) tidak menghalangi admin mengganti kolom satunya.
 */
function validate(): "ok" | "empty" | "invalid" {
  phoneError.value = "";
  emailError.value = "";

  const p = phone.value.trim();
  const e = email.value.trim();

  if (phoneChanged.value && !p) phoneError.value = "No. HP tidak boleh kosong";
  if (emailChanged.value && !e) emailError.value = "Email tidak boleh kosong";
  if (phoneError.value || emailError.value) return "empty";

  if (phoneChanged.value) {
    if (!DIGITS_RE.test(p)) phoneError.value = PHONE_HINT;
    else if (!PHONE_RE.test(p)) phoneError.value = PHONE_FORMAT_HINT;
  }
  if (emailChanged.value && !EMAIL_RE.test(e)) emailError.value = EMAIL_HINT;

  return phoneError.value || emailError.value ? "invalid" : "ok";
}

function goBack() {
  if (window.history.state?.back) router.back();
  else router.replace({ name: "admin-hubungi-kami" });
}

let allowLeave = false;

async function handleSave() {
  if (saving.value) return;

  if (!isDirty.value) {
    showToast("Belum ada perubahan untuk disimpan.", "warning");
    return;
  }

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
    await profileStore.updateAdminContact({
      phone: phoneChanged.value ? phone.value.trim() : undefined,
      email: emailChanged.value ? email.value.trim() : undefined,
    });
    allowLeave = true;
    goBack();
  } catch (error) {
    showToast(resolveAuthError(error, "Perubahan gagal disimpan."), "error");
  } finally {
    saving.value = false;
  }
}

/* -------------------- Penjaga perubahan yang belum disimpan -------------------- */

const leaveWarned = ref(false);

onBeforeRouteLeave(() => {
  if (allowLeave || !isDirty.value || leaveWarned.value) return true;

  leaveWarned.value = true;
  showToast("Simpan perubahan sebelum meninggalkan halaman.", "warning");
  return false;
});
</script>

<template>
  <main class="mx-auto flex w-full max-w-sm flex-col px-6 pt-safe">
    <AlertToast :message="toastMessage" :variant="toastVariant" />

    <PageHeader title="Ubah Kontak" fallback="admin-hubungi-kami" />

    <p class="mt-2 text-body-sm text-neutral-600">
      Kontak ini tampil di halaman Hubungi Kami untuk semua warga.
    </p>

    <!-- Kontak lama gagal dimuat: lebih aman tidak menimpa kontak yang tidak terlihat. -->
    <template v-if="profileStore.contactError">
      <p
        class="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-body-sm text-red-700"
        role="alert"
      >
        {{ profileStore.contactError }}
      </p>

      <BaseButton
        class="mx-auto mt-6 w-4/5"
        label="Coba lagi"
        variant="accent"
        :block="false"
        :loading="profileStore.contactLoading"
        @click="profileStore.loadAdminContact().then(fillForm)"
      />
    </template>

    <form v-else class="mt-8 flex flex-col gap-5" novalidate @submit.prevent="handleSave">
      <BaseInput
        v-model="phone"
        variant="line"
        label="No. HP"
        placeholder="(08xxxxxxxxx)"
        icon="none"
        inputmode="numeric"
        autocomplete="tel"
        :error="phoneError"
      />

      <BaseInput
        v-model="email"
        variant="line"
        label="Email"
        placeholder="(example@gmail.com)"
        icon="none"
        inputmode="email"
        autocomplete="email"
        :error="emailError"
      />

      <BaseButton
        class="mx-auto mt-6 w-4/5"
        label="Simpan"
        variant="accent"
        type="submit"
        :block="false"
        :disabled="profileStore.contactLoading"
        :loading="saving"
      />
    </form>
  </main>
</template>
