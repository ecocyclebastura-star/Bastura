<script setup lang="ts">
import { computed, onMounted } from "vue";
import AppIcon from "../../components/AppIcon.vue";
import BaseButton from "../../components/BaseButton.vue";
import PageHeader from "../../components/PageHeader.vue";
import { useProfileStore } from "../../stores/profileStore";

const profileStore = useProfileStore();

onMounted(() => profileStore.loadAdminContact());

const phone = computed(() => profileStore.adminContact?.phone?.trim() || "");
const email = computed(() => profileStore.adminContact?.email?.trim() || "");

/**
 * Kontak admin cloud-only: tidak ada cache lokalnya, jadi kalau gagal diambil
 * (mis. sedang offline) memang tidak ada yang bisa ditampilkan. Lebih baik
 * halamannya bilang gagal daripada menampilkan kontak yang belum tentu benar.
 */
const isEmpty = computed(
  () =>
    !profileStore.contactLoading &&
    !profileStore.contactError &&
    !phone.value &&
    !email.value,
);

/** tel: tidak menerima spasi maupun tanda hubung. */
const phoneHref = computed(() => `tel:${phone.value.replace(/[^\d+]/g, "")}`);
const emailHref = computed(() => `mailto:${email.value}`);

/**
 * Dibuka lewat plugin opener, bukan `window.open`: di dalam webview Tauri
 * tautan tel:/mailto: tidak diteruskan ke aplikasi bawaan perangkat.
 */
async function open(url: string) {
  try {
    const { openUrl } = await import("@tauri-apps/plugin-opener");
    await openUrl(url);
  } catch (error) {
    // Di luar aplikasi Tauri (`npm run dev`) plugin-nya memang tidak ada.
    console.warn("Gagal membuka tautan di aplikasi bawaan.", error);
  }
}
</script>

<template>
  <main class="mx-auto flex w-full max-w-sm flex-col px-6 pt-safe">
    <PageHeader fallback="user-pusat-bantuan" />

    <h1 class="mt-2 text-h4 font-extrabold text-neutral-900">Hubungi kami</h1>

    <!-- Sedang dimuat -->
    <div
      v-if="profileStore.contactLoading"
      class="mt-4 flex flex-col gap-3"
      aria-hidden="true"
    >
      <div class="h-14 animate-pulse rounded-2xl bg-neutral-200" />
      <div class="h-14 animate-pulse rounded-2xl bg-neutral-200" />
    </div>

    <!-- Gagal dimuat -->
    <template v-else-if="profileStore.contactError">
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
        @click="profileStore.loadAdminContact()"
      />
    </template>

    <!-- Berhasil dimuat, tapi pengurus belum mengisi kontaknya -->
    <p v-else-if="isEmpty" class="mt-4 text-body-sm text-neutral-600">
      Kontak pengurus belum tersedia. Coba lagi beberapa saat lagi.
    </p>

    <div
      v-else
      class="mt-4 divide-y divide-neutral-200 overflow-hidden rounded-2xl border border-neutral-200 bg-white"
    >
      <button
        v-if="phone"
        type="button"
        class="flex w-full cursor-pointer items-center gap-4 px-4 py-3.5 text-left transition-colors duration-200 hover:bg-neutral-100 focus:outline-none focus-visible:bg-neutral-100"
        @click="open(phoneHref)"
      >
        <AppIcon name="phone" class="size-6 text-neutral-900" />
        <span class="text-body-reg text-neutral-900">{{ phone }}</span>
      </button>

      <button
        v-if="email"
        type="button"
        class="flex w-full cursor-pointer items-center gap-4 px-4 py-3.5 text-left transition-colors duration-200 hover:bg-neutral-100 focus:outline-none focus-visible:bg-neutral-100"
        @click="open(emailHref)"
      >
        <AppIcon name="mail" class="size-6 text-neutral-900" />
        <span class="text-body-reg break-all text-neutral-900">
          {{ email }}
        </span>
      </button>
    </div>
  </main>
</template>
