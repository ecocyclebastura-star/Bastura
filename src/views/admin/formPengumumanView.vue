<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, useId, watch } from "vue";
import { onBeforeRouteLeave, useRoute, useRouter } from "vue-router";
import AlertToast from "../../components/AlertToast.vue";
import AppIcon from "../../components/AppIcon.vue";
import AvatarSheet from "../../components/AvatarSheet.vue";
import BaseButton from "../../components/BaseButton.vue";
import PageHeader from "../../components/PageHeader.vue";
import {
  ALL_CATEGORIES,
  ANNOUNCEMENT_CATEGORIES,
  resolveCategory,
} from "../../constants/announcementCategories";
import { resolveAuthError } from "../../constants/authErrors";
import { useToast } from "../../composables/useToast";
import { useAnnouncementAdminStore } from "../../stores/announcementAdminStore";

const route = useRoute();
const router = useRouter();
const store = useAnnouncementAdminStore();
const { toastMessage, toastVariant, showToast } = useToast();

const uid = useId();

/** Form yang sama dipakai tambah & edit; edit selalu membawa :id. */
const isEdit = computed(() => route.name === "admin-pengumuman-edit");
const idPengumuman = computed(() => String(route.params.id ?? ""));

/** Pilihan kategori = chip filter tanpa "Semua". */
const CATEGORY_OPTIONS = ANNOUNCEMENT_CATEGORIES.filter(
  (item) => item.value !== ALL_CATEGORIES,
);

/* ================================ ISIAN ================================ */

const title = ref("");
const category = ref("");
const text = ref("");

const titleError = ref("");
const categoryError = ref("");
const textError = ref("");

// Pesan salah hilang begitu kolomnya mulai diisi lagi.
watch(title, () => (titleError.value = ""));
watch(category, () => (categoryError.value = ""));
watch(text, () => (textError.value = ""));

function validate(): boolean {
  titleError.value = title.value.trim() ? "" : "Judul tidak boleh kosong";
  categoryError.value = category.value ? "" : "Pilih kategori pengumuman";
  textError.value = text.value.trim() ? "" : "Isi pengumuman tidak boleh kosong";
  return !titleError.value && !categoryError.value && !textError.value;
}

/* ============================= FOTO LAMPIRAN ============================= */

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const IMAGE_TYPES = ["image/jpeg", "image/png"];

const fileInput = ref<HTMLInputElement | null>(null);
const sheetOpen = ref(false);
const dragging = ref(false);

/** Foto yang sudah tersimpan di server (mode edit). */
const existingImage = ref("");
/** Admin menghapus foto lama tanpa menggantinya. */
const removeExisting = ref(false);
/** Foto baru yang belum dikirim; `preview` berupa object URL. */
const newImage = ref<{ name: string; bytes: Uint8Array; preview: string } | null>(null);

const previewSrc = computed(
  () => newImage.value?.preview || (removeExisting.value ? "" : existingImage.value),
);

function clearNewImage() {
  if (newImage.value) URL.revokeObjectURL(newImage.value.preview);
  newImage.value = null;
}

/** Belum ada foto: langsung buka galeri. Sudah ada: tawarkan ganti atau hapus. */
function handleDropzoneClick() {
  if (previewSrc.value) sheetOpen.value = true;
  else fileInput.value?.click();
}

function openPicker() {
  sheetOpen.value = false;
  fileInput.value?.click();
}

function removeImage() {
  sheetOpen.value = false;
  if (newImage.value) clearNewImage();
  else removeExisting.value = true;
}

async function useFile(file: File | undefined) {
  if (!file) return;

  if (!IMAGE_TYPES.includes(file.type)) {
    showToast("Format foto harus JPG atau PNG.", "warning");
    return;
  }
  if (file.size > MAX_IMAGE_BYTES) {
    showToast("Ukuran foto maksimal 5 MB.", "warning");
    return;
  }

  clearNewImage();
  newImage.value = {
    name: file.name,
    bytes: new Uint8Array(await file.arrayBuffer()),
    preview: URL.createObjectURL(file),
  };
}

function onFileChosen(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  // Direset supaya memilih berkas yang sama dua kali tetap memicu change.
  input.value = "";
  useFile(file);
}

/**
 * "Taruh foto disini" cuma berlaku di webview yang meneruskan event drop.
 * Di aplikasi desktop Tauri, drag-drop bawaannya masih aktif dan menelan
 * event ini; di Android memang tidak ada drag-drop.
 */
function onDrop(event: DragEvent) {
  dragging.value = false;
  useFile(event.dataTransfer?.files?.[0]);
}

onUnmounted(clearNewImage);

/* ================================= EDIT ================================= */

const loading = ref(false);
const loadError = ref("");

/** Nilai awal form, pembanding untuk penjaga perubahan yang belum disimpan. */
const initial = ref({ title: "", category: "", text: "" });

async function loadAnnouncement() {
  loading.value = true;
  loadError.value = "";

  try {
    const item = await store.find(idPengumuman.value);
    if (!item) {
      loadError.value = "Pengumuman tidak ditemukan. Mungkin sudah dihapus.";
      return;
    }

    title.value = item.title;
    category.value = resolveCategory(item);
    text.value = item.content.text;
    existingImage.value = item.image_base64 ?? item.image_url ?? "";
    initial.value = { title: title.value, category: category.value, text: text.value };
  } catch (error) {
    loadError.value = resolveAuthError(error, "Gagal memuat pengumuman.");
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  if (isEdit.value) loadAnnouncement();
});

/* ================================ SIMPAN ================================ */

const saving = ref(false);

const isDirty = computed(
  () =>
    title.value !== initial.value.title ||
    category.value !== initial.value.category ||
    text.value !== initial.value.text ||
    newImage.value !== null ||
    removeExisting.value,
);

/** Batal & simpan berhasil = memang mau pergi, jadi penjaganya dilewati. */
let allowLeave = false;
const leaveWarned = ref(false);

onBeforeRouteLeave(() => {
  if (allowLeave || !isDirty.value || leaveWarned.value) return true;

  leaveWarned.value = true;
  showToast("Simpan perubahan sebelum meninggalkan halaman.", "warning");
  return false;
});

function goBack() {
  allowLeave = true;
  if (window.history.state?.back) router.back();
  else router.replace({ name: "admin-pengumuman" });
}

async function handleSubmit() {
  if (saving.value) return;
  if (!validate()) {
    showToast("Lengkapi data yang masih kosong.", "warning");
    return;
  }

  const input = {
    title: title.value,
    category: category.value,
    text: text.value,
    image: newImage.value,
    removeImage: removeExisting.value && !newImage.value,
  };

  saving.value = true;
  try {
    if (isEdit.value) {
      await store.update(idPengumuman.value, input);
      store.setFlash("Perubahan berhasil disimpan.");
    } else {
      await store.create(input);
      store.setFlash("Pengumuman berhasil dipublikasikan.");
    }
    goBack();
  } catch (error) {
    // Admin tetap di form supaya tulisannya tidak perlu diketik ulang.
    showToast(resolveAuthError(error, "Perubahan gagal disimpan."), "error");
  } finally {
    saving.value = false;
  }
}

const fieldClass =
  "w-full rounded-2xl border bg-white px-4 py-3 text-body-sm text-neutral-900 placeholder:text-neutral-400 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500";
const labelClass = "text-h6 font-medium text-neutral-900";
const errorClass = "text-body-tiny font-medium text-red-600";

const borderClass = (error: string) => (error ? "border-red-500" : "border-primary-700");
</script>

<template>
  <main class="mx-auto flex w-full max-w-sm flex-col gap-4 px-6 pt-safe">
    <PageHeader
      :title="isEdit ? 'Edit Pengumuman' : 'Tambah Pengumuman'"
      fallback="admin-pengumuman"
    />

    <div v-if="loading" class="flex flex-col gap-4" aria-hidden="true">
      <div class="h-14 animate-pulse rounded-2xl bg-neutral-200" />
      <div class="h-14 animate-pulse rounded-2xl bg-neutral-200" />
      <div class="h-44 animate-pulse rounded-2xl bg-neutral-200" />
    </div>

    <div
      v-else-if="loadError"
      class="rounded-2xl border border-red-200 bg-red-50 p-4"
      role="alert"
    >
      <p class="text-body-sm text-red-700">{{ loadError }}</p>
      <button
        type="button"
        class="mt-3 cursor-pointer rounded-full bg-red-600 px-4 py-2 text-body-sm font-bold text-white transition-colors duration-200 hover:bg-red-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
        @click="loadAnnouncement"
      >
        Coba Lagi
      </button>
    </div>

    <form v-else class="flex flex-col gap-4 pb-4" novalidate @submit.prevent="handleSubmit">
      <div class="flex flex-col gap-1.5">
        <label :for="`${uid}-judul`" :class="labelClass">Judul</label>
        <input
          :id="`${uid}-judul`"
          v-model="title"
          type="text"
          maxlength="150"
          autocomplete="off"
          placeholder="Contoh: Kerja bakti di hari minggu"
          :aria-invalid="Boolean(titleError)"
          :class="[fieldClass, borderClass(titleError)]"
        />
        <p v-if="titleError" :class="errorClass">{{ titleError }}</p>
      </div>

      <div class="flex flex-col gap-1.5">
        <label :for="`${uid}-kategori`" :class="labelClass">Kategori</label>
        <div class="relative">
          <select
            :id="`${uid}-kategori`"
            v-model="category"
            :aria-invalid="Boolean(categoryError)"
            :class="[
              fieldClass,
              borderClass(categoryError),
              'cursor-pointer appearance-none pr-12',
              category ? '' : 'text-neutral-400',
            ]"
          >
            <option value="" disabled>Pilih Kategori</option>
            <option
              v-for="option in CATEGORY_OPTIONS"
              :key="option.value"
              :value="option.value"
              class="text-neutral-900"
            >
              {{ option.label }}
            </option>
          </select>
          <svg
            class="pointer-events-none absolute inset-y-0 right-4 my-auto size-6 text-neutral-900"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2.5"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        </div>
        <p v-if="categoryError" :class="errorClass">{{ categoryError }}</p>
      </div>

      <div class="flex flex-col gap-1.5">
        <label :for="`${uid}-isi`" :class="labelClass">Isi pengumuman</label>
        <!-- Enter antar paragraf ikut tersimpan; halaman detail menampilkannya
             dengan whitespace-pre-line. -->
        <textarea
          :id="`${uid}-isi`"
          v-model="text"
          rows="7"
          placeholder="Tuliskan detail dari pengumumannya disini..."
          :aria-invalid="Boolean(textError)"
          :class="[fieldClass, borderClass(textError), 'resize-none']"
        />
        <p v-if="textError" :class="errorClass">{{ textError }}</p>
      </div>

      <div class="flex flex-col gap-1.5">
        <span :id="`${uid}-foto`" :class="labelClass">Foto Lampiran</span>

        <button
          type="button"
          class="relative flex h-40 w-full cursor-pointer flex-col items-center justify-center overflow-hidden rounded-2xl border bg-white text-center transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
          :class="dragging ? 'border-2 border-dashed border-primary-500 bg-primary-100' : 'border-primary-700'"
          :aria-labelledby="`${uid}-foto`"
          @click="handleDropzoneClick"
          @dragover.prevent="dragging = true"
          @dragleave="dragging = false"
          @drop.prevent="onDrop"
        >
          <template v-if="previewSrc">
            <img :src="previewSrc" alt="Pratinjau foto lampiran" class="absolute inset-0 size-full object-cover" />
            <span
              class="absolute right-2 bottom-2 rounded-full bg-neutral-900/70 px-3 py-1 text-body-tiny font-semibold text-white"
            >
              Ganti / hapus foto
            </span>
          </template>

          <template v-else>
            <span class="flex size-16 items-center justify-center rounded-lg bg-neutral-300 text-neutral-50">
              <AppIcon name="gallery" class="size-12" />
            </span>
            <span class="mt-3 text-body-sm text-neutral-400">Klik atau Taruh foto disini</span>
            <span class="text-body-tiny text-neutral-700">Format: JPG, PNG (Maks. 5 MB)</span>
          </template>
        </button>

        <input
          ref="fileInput"
          type="file"
          accept="image/jpeg,image/png"
          class="hidden"
          @change="onFileChosen"
        />
      </div>

      <div class="mt-4 flex flex-col items-center gap-4">
        <BaseButton
          class="w-4/5"
          type="submit"
          label="Simpan"
          rounded="xl"
          :block="false"
          :loading="saving"
        />
        <BaseButton
          class="w-4/5"
          label="Batal"
          variant="outline"
          rounded="xl"
          :block="false"
          :disabled="saving"
          @click="goBack"
        />
      </div>
    </form>

    <AvatarSheet
      :open="sheetOpen"
      title="Foto Lampiran"
      :can-remove="Boolean(previewSrc)"
      @close="sheetOpen = false"
      @pick="openPicker"
      @remove="removeImage"
    />

    <AlertToast :message="toastMessage" :variant="toastVariant" />
  </main>
</template>
