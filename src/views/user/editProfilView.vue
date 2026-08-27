<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { onBeforeRouteLeave } from "vue-router";
import AlertToast from "../../components/AlertToast.vue";
import AvatarCropper from "../../components/AvatarCropper.vue";
import AvatarPhoto from "../../components/AvatarPhoto.vue";
import AvatarSheet from "../../components/AvatarSheet.vue";
import BaseButton from "../../components/BaseButton.vue";
import BaseInput from "../../components/BaseInput.vue";
import PageHeader from "../../components/PageHeader.vue";
import { resolveAuthError } from "../../constants/authErrors";
import { useToast } from "../../composables/useToast";
import { useProfileStore } from "../../stores/profileStore";
import {
  DIGITS_RE,
  NAME_HINT,
  NAME_RE,
  PHONE_FORMAT_HINT,
  PHONE_HINT,
  PHONE_RE,
} from "../../utils/validators";

const profileStore = useProfileStore();
const { toastMessage, toastVariant, showToast } = useToast();

const name = ref("");
const phone = ref("");
const nameError = ref("");
const phoneError = ref("");
const saving = ref(false);

const sheetOpen = ref(false);
const fileInput = ref<HTMLInputElement | null>(null);
/** Object URL berkas mentah yang sedang dipotong. */
const cropSource = ref("");
/** Hasil crop yang belum dikirim ke backend. */
const pendingAvatar = ref<{ bytes: Uint8Array; name: string; preview: string } | null>(null);

onMounted(async () => {
  await profileStore.load();
  name.value = profileStore.profile?.name ?? "";
  phone.value = profileStore.profile?.phone ?? "";
});

const avatarSrc = computed(
  () => pendingAvatar.value?.preview || profileStore.avatarSrc,
);

const isDirty = computed(() => {
  const original = profileStore.profile;
  if (!original) return false;
  return (
    name.value.trim() !== original.name ||
    phone.value.trim() !== original.phone ||
    pendingAvatar.value !== null
  );
});

/**
 * Isi dua pesan sekaligus: kosong dan salah format dibedakan supaya toast di
 * atas bisa menyebut penyebabnya dengan tepat.
 */
function validate(): "ok" | "empty" | "invalid" {
  nameError.value = "";
  phoneError.value = "";

  const n = name.value.trim();
  const p = phone.value.trim();

  if (!n) nameError.value = "Nama tidak boleh kosong";
  if (!p) phoneError.value = "No. HP tidak boleh kosong";
  if (nameError.value || phoneError.value) return "empty";

  if (!NAME_RE.test(n)) nameError.value = NAME_HINT;
  if (!DIGITS_RE.test(p)) phoneError.value = PHONE_HINT;
  else if (!PHONE_RE.test(p)) phoneError.value = PHONE_FORMAT_HINT;

  return nameError.value || phoneError.value ? "invalid" : "ok";
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
    await profileStore.update({
      name: name.value.trim(),
      phone: phone.value.trim(),
      avatarName: pendingAvatar.value?.name,
      avatarBytes: pendingAvatar.value?.bytes,
    });

    pendingAvatar.value = null;
    name.value = profileStore.profile?.name ?? name.value;
    phone.value = profileStore.profile?.phone ?? phone.value;

    showToast("Perubahan berhasil disimpan.", "success");
  } catch (error) {
    showToast(resolveAuthError(error, "Perubahan gagal disimpan."), "error");
  } finally {
    saving.value = false;
  }
}

// --- Foto profil --------------------------------------------------------

function openPicker() {
  sheetOpen.value = false;
  fileInput.value?.click();
}

function onFileChosen(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  // Direset supaya memilih berkas yang sama dua kali tetap memicu change.
  input.value = "";
  if (!file) return;

  revokeCropSource();
  cropSource.value = URL.createObjectURL(file);
}

function revokeCropSource() {
  if (cropSource.value) {
    URL.revokeObjectURL(cropSource.value);
    cropSource.value = "";
  }
}

function onCropDone(file: { bytes: Uint8Array; name: string; preview: string }) {
  pendingAvatar.value = file;
  revokeCropSource();
}

function removePendingAvatar() {
  pendingAvatar.value = null;
  sheetOpen.value = false;
}

// --- Penjaga perubahan yang belum disimpan -------------------------------

/**
 * Percobaan keluar yang pertama ditahan dan diingatkan lewat toast; kalau
 * user menekan kembali sekali lagi berarti memang mau membuang perubahannya,
 * jadi dibiarkan pergi.
 */
const leaveWarned = ref(false);

onBeforeRouteLeave(() => {
  if (!isDirty.value || leaveWarned.value) return true;

  leaveWarned.value = true;
  showToast("Simpan perubahan sebelum meninggalkan halaman.", "warning");
  return false;
});
</script>

<template>
  <main class="mx-auto flex w-full max-w-sm flex-col px-6 pt-safe">
    <AlertToast :message="toastMessage" :variant="toastVariant" />

    <PageHeader title="Edit Profil" fallback="user-profil" />

    <section class="mt-6 flex flex-col items-center">
      <AvatarPhoto :src="avatarSrc" alt="Foto profil" class="size-30" />

      <button
        type="button"
        class="mt-3 cursor-pointer text-body-sm font-medium text-primary-700 underline underline-offset-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
        @click="sheetOpen = true"
      >
        Pasang/ganti foto profil
      </button>

      <!-- Pemilih berkas bawaan webview: di Android memunculkan galeri sistem,
           jadi tidak perlu plugin dialog tambahan. -->
      <input
        ref="fileInput"
        type="file"
        accept="image/*"
        class="hidden"
        @change="onFileChosen"
      />
    </section>

    <form class="mt-8 flex flex-col gap-5" @submit.prevent="handleSave">
      <BaseInput
        v-model="name"
        variant="line"
        label="Nama"
        placeholder="(Cth: Budi)"
        icon="none"
        autocomplete="name"
        :error="nameError"
      />

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

      <BaseButton
        class="mx-auto mt-6 w-4/5"
        label="Simpan"
        variant="accent"
        type="submit"
        :block="false"
        :loading="saving"
      />
    </form>

    <AvatarSheet
      :open="sheetOpen"
      :can-remove="pendingAvatar !== null"
      @close="sheetOpen = false"
      @pick="openPicker"
      @remove="removePendingAvatar"
    />

    <AvatarCropper
      v-if="cropSource"
      :source="cropSource"
      @cancel="revokeCropSource"
      @done="onCropDone"
    />
  </main>
</template>
