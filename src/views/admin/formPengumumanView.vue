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
  ANNOUNCEMENT_IMAGE_MAX_BYTES,
  parseAnnouncementText,
  useAnnouncementAdminStore,
} from "../../stores/announcementAdminStore";
import type { AnnouncementCategoryOption } from "../../stores/announcementAdminStore";
import { dataUriToImage } from "../../utils/imageFile";
import type { PreparedImage } from "../../utils/imageFile";

const route = useRoute();
const router = useRouter();
const store = useAnnouncementAdminStore();
const { toastMessage, toastVariant, showToast } = useToast();

const uid = useId();

/** Form yang sama dipakai tambah & edit; edit selalu membawa :id. */
const isEdit = computed(() => route.name === "admin-pengumuman-edit");
const idPengumuman = computed(() => String(route.params.id ?? ""));

/* ================================ ISIAN ================================ */

const title = ref("");
const categoryId = ref("");
const text = ref("");
const author = ref("");

const titleError = ref("");
const categoryError = ref("");
const textError = ref("");

// Pesan salah hilang begitu kolomnya mulai diisi lagi.
watch(title, () => (titleError.value = ""));
watch(categoryId, () => (categoryError.value = ""));
watch(text, () => (textError.value = ""));

const categories = ref<AnnouncementCategoryOption[]>([]);
const categoryName = computed(
  () => categories.value.find((item) => item.id_category === categoryId.value)?.name ?? "",
);

function validate(): boolean {
  titleError.value = title.value.trim() ? "" : "Judul tidak boleh kosong";
  // Edit: kategori lama yang tidak dikenali boleh dibiarkan kosong (tidak diubah).
  categoryError.value = categoryId.value || isEdit.value ? "" : "Pilih kategori pengumuman";
  textError.value = text.value.trim() ? "" : "Isi pengumuman tidak boleh kosong";
  return !titleError.value && !categoryError.value && !textError.value;
}

/* ============================= FOTO LAMPIRAN ============================= */

/** Foto yang sudah tersimpan di server (mode edit). */
const existingImage = ref("");
/** Foto baru yang belum dikirim (termasuk foto dari draft yang dipulihkan). */
const newImage = ref<PreparedImage | null>(null);

/* ================================ DRAFT ================================ */

const draft = useContentDraft({
  enabled: () => !isEdit.value,
  source: () => [title.value, categoryId.value, text.value],
  isEmpty: () => !title.value.trim() && !text.value.trim() && !categoryId.value && !newImage.value,
  image: newImage,
  save: (draftId, image, removeImage) =>
    store.saveDraft(
      draftId,
      {
        title: title.value,
        text: text.value,
        categoryId: categoryId.value,
        categoryName: categoryName.value,
      },
      image,
      removeImage,
    ),
  remove: (draftId) => store.deleteDraft(draftId),
});

async function restoreDraft() {
  try {
    await draft.restore(
      () => store.listDrafts(),
      (saved) => {
        title.value = saved.title ?? "";
        text.value = parseAnnouncementText(saved.content);
        categoryId.value = saved.category_id ?? "";
        newImage.value = saved.image_base64 ? dataUriToImage(saved.image_base64) : null;
      },
    );
  } catch {
    // Draft cuma pelengkap; gagal membacanya tidak perlu menahan form.
  }
}

async function discardDraft() {
  try {
    await draft.discard();
  } catch {
    // Kalaupun gagal terhapus, form tetap dikosongkan sesuai permintaan admin.
  }
  title.value = "";
  categoryId.value = "";
  text.value = "";
  newImage.value = null;
  showToast("Draf dibuang.", "success");
}

/* ================================= MUAT ================================= */

const loading = ref(false);
const loadError = ref("");

/** Nilai awal form, pembanding untuk penjaga perubahan yang belum disimpan. */
const initial = ref({ title: "", categoryId: "", text: "" });

async function load() {
  loading.value = true;
  loadError.value = "";

  try {
    categories.value = await store.loadCategories();

    if (!isEdit.value) {
      await restoreDraft();
      return;
    }

    const item = await store.find(idPengumuman.value);
    if (!item) {
      loadError.value = "Pengumuman tidak ditemukan. Mungkin sudah dihapus.";
      return;
    }

    // Id yang tidak ada di daftar pilihan (atau pengumuman lama tanpa
    // kategori) dibiarkan kosong = kategori lama tidak diubah.
    title.value = item.title;
    categoryId.value =
      categories.value.find((option) => option.id_category === item.category_id)?.id_category ??
      "";
    text.value = item.content.text;
    author.value = item.content.author;
    existingImage.value = item.image_base64 ?? item.image_url ?? "";
    initial.value = { title: title.value, categoryId: categoryId.value, text: text.value };
  } catch (error) {
    loadError.value = resolveAuthError(error, "Gagal memuat pengumuman.");
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
    categoryId.value !== initial.value.categoryId ||
    text.value !== initial.value.text ||
    newImage.value !== null,
);

/** Batal & simpan berhasil = memang mau pergi, jadi penjaganya dilewati. */
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
  else router.replace({ name: "admin-pengumuman" });
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
    categoryId: categoryId.value,
    categoryName: categoryName.value,
    text: text.value,
    author: author.value,
    image: newImage.value,
  };

  saving.value = true;
  try {
    if (isEdit.value) {
      await store.update(idPengumuman.value, input);
      store.setFlash("Perubahan berhasil disimpan.");
    } else {
      await store.create(input);
      // Sudah terbit; sisa draft-nya tidak dibutuhkan lagi.
      await draft.discard().catch(() => undefined);
      store.setFlash("Pengumuman berhasil dipublikasikan.");
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
            v-model="categoryId"
            :aria-invalid="Boolean(categoryError)"
            :class="[
              fieldClass,
              borderClass(categoryError),
              'cursor-pointer appearance-none pr-12',
              categoryId ? '' : 'text-neutral-400',
            ]"
          >
            <option value="" :disabled="!isEdit">
              {{ isEdit ? "Kategori lama (tidak diubah)" : "Pilih Kategori" }}
            </option>
            <option
              v-for="option in categories"
              :key="option.id_category"
              :value="option.id_category"
              class="text-neutral-900"
            >
              {{ option.name }}
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

      <ImageDropzone
        v-model:image="newImage"
        :existing="existingImage"
        :max-bytes="ANNOUNCEMENT_IMAGE_MAX_BYTES"
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
