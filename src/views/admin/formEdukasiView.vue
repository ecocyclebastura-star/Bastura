<script setup lang="ts">
import { computed, onMounted, ref, useId, watch } from "vue";
import { onBeforeRouteLeave, useRoute, useRouter } from "vue-router";
import AlertToast from "../../components/AlertToast.vue";
import BaseButton from "../../components/BaseButton.vue";
import DraftBanner from "../../components/DraftBanner.vue";
import ImageDropzone from "../../components/ImageDropzone.vue";
import PageHeader from "../../components/PageHeader.vue";
import { resolveAuthError } from "../../constants/authErrors";
import { useContentDraft } from "../../composables/useContentDraft";
import { useToast } from "../../composables/useToast";
import {
  EDUCATION_IMAGE_MAX_BYTES,
  parseEducationText,
  useEducationAdminStore,
} from "../../stores/educationAdminStore";
import { dataUriToImage } from "../../utils/imageFile";
import type { PreparedImage } from "../../utils/imageFile";

const route = useRoute();
const router = useRouter();
const store = useEducationAdminStore();
const { toastMessage, toastVariant, showToast } = useToast();

const uid = useId();

/** Form yang sama dipakai tambah & edit; edit selalu membawa :id. */
const isEdit = computed(() => route.name === "admin-edukasi-edit");
const idEdukasi = computed(() => String(route.params.id ?? ""));

/* ================================ ISIAN ================================ */

/** Batas judul dari `add_education_service`. */
const TITLE_MAX = 200;

const title = ref("");
const text = ref("");
/** Tag lama dibawa saat edit; form-nya tidak punya kolom tag. */
const tags = ref<string[]>([]);

const titleError = ref("");
const textError = ref("");

// Pesan salah hilang begitu kolomnya mulai diisi lagi.
watch(title, () => (titleError.value = ""));
watch(text, () => (textError.value = ""));

function validate(): boolean {
  titleError.value = title.value.trim() ? "" : "Judul tidak boleh kosong";
  textError.value = text.value.trim() ? "" : "Isi edukasi tidak boleh kosong";
  return !titleError.value && !textError.value;
}

/* ============================= FOTO LAMPIRAN ============================= */

/** Foto yang sudah tersimpan di server (mode edit). */
const existingImage = ref("");
/** Foto baru yang belum dikirim (termasuk foto dari draft yang dipulihkan). */
const newImage = ref<PreparedImage | null>(null);

/* ================================ DRAFT ================================ */

const draft = useContentDraft({
  enabled: () => !isEdit.value,
  source: () => [title.value, text.value],
  isEmpty: () => !title.value.trim() && !text.value.trim() && !newImage.value,
  image: newImage,
  save: (draftId, image, removeImage) =>
    store.saveDraft(draftId, { title: title.value, text: text.value }, image, removeImage),
  remove: (draftId) => store.deleteDraft(draftId),
});

async function discardDraft() {
  try {
    await draft.discard();
  } catch {
    // Kalaupun gagal terhapus, form tetap dikosongkan sesuai permintaan admin.
  }
  title.value = "";
  text.value = "";
  newImage.value = null;
  showToast("Draf dibuang.", "success");
}

/* ================================= MUAT ================================= */

const loading = ref(false);
const loadError = ref("");

/** Nilai awal form, pembanding untuk penjaga perubahan yang belum disimpan. */
const initial = ref({ title: "", text: "" });

async function load() {
  if (!isEdit.value) {
    try {
      await draft.restore(
        () => store.listDrafts(),
        (saved) => {
          title.value = saved.title ?? "";
          text.value = parseEducationText(saved.content);
          newImage.value = saved.image_base64 ? dataUriToImage(saved.image_base64) : null;
        },
      );
    } catch {
      // Draft cuma pelengkap; gagal membacanya tidak perlu menahan form.
    }
    return;
  }

  loading.value = true;
  loadError.value = "";

  try {
    const item = await store.find(idEdukasi.value);
    if (!item) {
      loadError.value = "Materi edukasi tidak ditemukan. Mungkin sudah dihapus.";
      return;
    }

    title.value = item.title;
    text.value = item.content.text;
    tags.value = item.content.tags;
    existingImage.value = item.image_base64 ?? item.image_url ?? "";
    initial.value = { title: title.value, text: text.value };
  } catch (error) {
    loadError.value = resolveAuthError(error, "Gagal memuat materi edukasi.");
  } finally {
    loading.value = false;
  }
}

onMounted(load);

/* ================================ SIMPAN ================================ */

const saving = ref(false);

const isDirty = computed(
  () =>
    title.value !== initial.value.title ||
    text.value !== initial.value.text ||
    newImage.value !== null,
);

/** Simpan berhasil = memang mau pergi, jadi penjaganya dilewati. */
let allowLeave = false;
const leaveWarned = ref(false);

onBeforeRouteLeave(async () => {
  if (allowLeave) return true;

  // Tambah: tulisan disimpan sebagai draf, jadi aman ditinggal.
  if (!isEdit.value) {
    try {
      if (await draft.flush()) store.setFlash("Tulisanmu disimpan sebagai draf.");
    } catch {
      store.setFlash("Draf gagal disimpan.", "warning");
    }
    return true;
  }

  if (!isDirty.value || leaveWarned.value) return true;
  leaveWarned.value = true;
  showToast("Simpan perubahan sebelum meninggalkan halaman.", "warning");
  return false;
});

function goBack() {
  if (window.history.state?.back) router.back();
  else router.replace({ name: "admin-edukasi" });
}

/** Batal di form Edit = memang mau membuang perubahan; di Tambah, draf tetap disimpan. */
function cancel() {
  if (isEdit.value) allowLeave = true;
  goBack();
}

async function handleSubmit() {
  if (saving.value) return;
  if (!validate()) {
    showToast("Lengkapi data yang masih kosong.", "warning");
    return;
  }

  const input = {
    title: title.value,
    text: text.value,
    tags: tags.value,
    image: newImage.value,
  };

  saving.value = true;
  try {
    if (isEdit.value) {
      await store.update(idEdukasi.value, input);
      store.setFlash("Perubahan berhasil disimpan.");
    } else {
      await store.create(input);
      // Sudah terbit; sisa draft-nya tidak dibutuhkan lagi.
      await draft.discard().catch(() => undefined);
      store.setFlash("Artikel edukasi sampah berhasil dipublikasikan.");
    }
    allowLeave = true;
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
    <PageHeader :title="isEdit ? 'Edit Edukasi' : 'Tambah Edukasi'" fallback="admin-edukasi" />

    <div v-if="loading" class="flex flex-col gap-4" aria-hidden="true">
      <div class="h-14 animate-pulse rounded-2xl bg-neutral-200" />
      <div class="h-44 animate-pulse rounded-2xl bg-neutral-200" />
      <div class="h-40 animate-pulse rounded-2xl bg-neutral-200" />
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
        @click="load"
      >
        Coba Lagi
      </button>
    </div>

    <form v-else class="flex flex-col gap-4 pb-4" novalidate @submit.prevent="handleSubmit">
      <DraftBanner v-if="draft.restored.value" @discard="discardDraft" />

      <div class="flex flex-col gap-1.5">
        <label :for="`${uid}-judul`" :class="labelClass">Judul</label>
        <input
          :id="`${uid}-judul`"
          v-model="title"
          type="text"
          :maxlength="TITLE_MAX"
          autocomplete="off"
          placeholder="Contoh: Cara Memilah Sampah Anorganik"
          :aria-invalid="Boolean(titleError)"
          :class="[fieldClass, borderClass(titleError)]"
        />
        <p v-if="titleError" :class="errorClass">{{ titleError }}</p>
      </div>

      <div class="flex flex-col gap-1.5">
        <label :for="`${uid}-isi`" :class="labelClass">Isi edukasi</label>
        <!-- Enter antar paragraf ikut tersimpan; halaman detail menampilkannya
             dengan whitespace-pre-line. -->
        <textarea
          :id="`${uid}-isi`"
          v-model="text"
          rows="8"
          placeholder="Tuliskan detail dari edukasi disini..."
          :aria-invalid="Boolean(textError)"
          :class="[fieldClass, borderClass(textError), 'resize-none']"
        />
        <p v-if="textError" :class="errorClass">{{ textError }}</p>
      </div>

      <ImageDropzone
        v-model:image="newImage"
        :existing="existingImage"
        :max-bytes="EDUCATION_IMAGE_MAX_BYTES"
        @error="showToast($event, 'warning')"
      />

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
          @click="cancel"
        />
      </div>
    </form>

    <AlertToast :message="toastMessage" :variant="toastVariant" />
  </main>
</template>
