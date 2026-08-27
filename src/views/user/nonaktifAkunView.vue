<script setup lang="ts">
import { ref } from "vue";
import { useRouter } from "vue-router";
import BaseButton from "../../components/BaseButton.vue";
import BaseDialog from "../../components/BaseDialog.vue";
import PageHeader from "../../components/PageHeader.vue";
import { useAuthStore } from "../../stores/authStore";
import { useProfileStore } from "../../stores/profileStore";

const router = useRouter();
const authStore = useAuthStore();
const profileStore = useProfileStore();

type Dialog = "none" | "confirm" | "success" | "error";

const dialog = ref<Dialog>("none");
const deleting = ref(false);

const CATATAN = [
  "Akun tidak dapat lagi digunakan untuk masuk setelah dinonaktifkan.",
  "Saldo yang belum ditarik tidak dapat digunakan selama akun nonaktif.",
  "Riwayat transaksi tetap tersimpan di sistem, tetapi tidak dapat Anda akses lagi.",
  "Jika masih memiliki proses penarikan yang sedang berlangsung, selesaikan terlebih dahulu sebelum menonaktifkan akun.",
  "Untuk mengaktifkan kembali akun atau meminta penghapusan data secara permanen, hubungi pengurus lewat Pusat Bantuan.",
];

async function handleDelete() {
  if (deleting.value) return;
  deleting.value = true;

  try {
    await profileStore.deactivate();
    dialog.value = "success";
  } catch {
    // Pesan aslinya sengaja tidak ditampilkan: layar ini sudah punya kalimat
    // sendiri dari desain, dan detail teknis tidak menolong user di sini.
    dialog.value = "error";
  } finally {
    deleting.value = false;
  }
}

/**
 * `deactivate_account_command` sudah membereskan sesi di sisi Rust (keyring,
 * token di RAM, dan cache SQLite). Yang tersisa cuma state di frontend, jadi
 * cukup dibersihkan lokal -- memanggil logout_command malah menembak server
 * dengan token yang sudah mati.
 */
function finish() {
  dialog.value = "none";
  authStore.clearSession();
  router.push({ name: "login" });
}
</script>

<template>
  <main class="mx-auto flex w-full max-w-sm flex-col px-6 pt-safe">
    <PageHeader title="Nonaktifkan Akun" fallback="user-profil" />

    <section class="mt-8">
      <h2 class="text-body-md font-extrabold text-neutral-900">
        Sebelum menonaktifkan akun
      </h2>

      <h3 class="mt-2 text-body-reg font-bold text-neutral-900">
        Hal-hal yang perlu diperhatikan
      </h3>

      <ul
        class="mt-2 list-disc space-y-2 pl-5 text-body-sm text-neutral-800 marker:text-neutral-800"
      >
        <li v-for="catatan in CATATAN" :key="catatan">{{ catatan }}</li>
      </ul>
    </section>

    <BaseButton
      class="mx-auto mt-12 w-4/5"
      label="Nonaktifkan akun"
      variant="warning"
      :block="false"
      @click="dialog = 'confirm'"
    />

    <!-- Konfirmasi -->
    <BaseDialog
      :open="dialog === 'confirm'"
      dismissible
      title="Nonaktifkan akun?"
      message="Apakah Anda yakin ingin menonaktifkan akun ini? Anda tidak akan bisa masuk lagi, dan saldo maupun riwayat transaksi tidak dapat diakses."
      @close="dialog = 'none'"
    >
      <template #actions>
        <BaseButton
          class="flex-1"
          label="Batal"
          variant="accent"
          :block="false"
          :disabled="deleting"
          @click="dialog = 'none'"
        />
        <BaseButton
          class="flex-1"
          label="Nonaktifkan"
          variant="warning"
          :block="false"
          :loading="deleting"
          @click="handleDelete"
        />
      </template>
    </BaseDialog>

    <!-- Berhasil: sengaja tidak bisa ditutup dengan menyentuh latar, karena
         sesinya sudah mati dan user wajib diantar keluar ke halaman login. -->
    <BaseDialog
      :open="dialog === 'success'"
      title="Akun Berhasil Dinonaktifkan"
      message="Akun Anda telah dinonaktifkan. Terima kasih telah menjadi bagian dari BASTURA."
    >
      <template #actions>
        <BaseButton label="Tutup" variant="primary" @click="finish" />
      </template>
    </BaseDialog>

    <!-- Gagal -->
    <BaseDialog
      :open="dialog === 'error'"
      dismissible
      title="Akun Belum Dapat Dinonaktifkan"
      message="Terjadi kendala saat menonaktifkan akun. Silakan coba beberapa saat lagi."
      @close="dialog = 'none'"
    >
      <template #actions>
        <BaseButton
          label="Coba lagi"
          variant="primary"
          :loading="deleting"
          @click="handleDelete"
        />
      </template>
    </BaseDialog>
  </main>
</template>
