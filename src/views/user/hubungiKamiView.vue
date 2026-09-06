<script setup lang="ts">
import { computed, onMounted } from "vue";
import AppIcon from "../../components/AppIcon.vue";
import PageHeader from "../../components/PageHeader.vue";
import { CONTACT_EMAIL, CONTACT_PHONE } from "../../constants/helpCenter";
import { useProfileStore } from "../../stores/profileStore";

const profileStore = useProfileStore();

onMounted(() => profileStore.loadAdminContact());

/**
 * Nomor dari server dipakai duluan; kalau command-nya gagal (mis. sedang
 * offline -- kontak admin cloud-only, tidak ada cache-nya) halaman tetap
 * berguna dengan nomor bawaan aplikasi.
 */
const phone = computed(
  () => profileStore.adminContact?.phone_number?.trim() || CONTACT_PHONE,
);

const contactName = computed(
  () => profileStore.adminContact?.name_contact?.trim() || "",
);

/** tel: tidak menerima spasi maupun tanda hubung. */
const phoneHref = computed(() => `tel:${phone.value.replace(/[^\d+]/g, "")}`);
const emailHref = `mailto:${CONTACT_EMAIL}`;

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

    <div
      class="mt-4 divide-y divide-neutral-200 overflow-hidden rounded-2xl border border-neutral-200 bg-white"
    >
      <button
        type="button"
        class="flex w-full cursor-pointer items-center gap-4 px-4 py-3.5 text-left transition-colors duration-200 hover:bg-neutral-100 focus:outline-none focus-visible:bg-neutral-100"
        @click="open(phoneHref)"
      >
        <AppIcon name="phone" class="size-6 text-neutral-900" />

        <span
          v-if="profileStore.contactLoading"
          class="h-5 w-40 animate-pulse rounded bg-neutral-200"
          aria-hidden="true"
        />
        <span v-else>
          <span class="block text-body-reg text-neutral-900">{{ phone }}</span>
          <span
            v-if="contactName"
            class="block text-body-tiny text-neutral-600"
          >
            {{ contactName }}
          </span>
        </span>
      </button>

      <button
        type="button"
        class="flex w-full cursor-pointer items-center gap-4 px-4 py-3.5 text-left transition-colors duration-200 hover:bg-neutral-100 focus:outline-none focus-visible:bg-neutral-100"
        @click="open(emailHref)"
      >
        <AppIcon name="mail" class="size-6 text-neutral-900" />
        <span class="text-body-reg break-all text-neutral-900">
          {{ CONTACT_EMAIL }}
        </span>
      </button>
    </div>

    <!-- Nomornya tetap tampil (memakai kontak bawaan), jadi ini cuma
         pemberitahuan bahwa yang terbaru belum sempat diambil. -->
    <p
      v-if="profileStore.contactError"
      class="mt-3 text-body-tiny text-neutral-600"
      role="status"
    >
      {{ profileStore.contactError }} Sementara ini ditampilkan kontak bawaan
      aplikasi.
    </p>
  </main>
</template>
