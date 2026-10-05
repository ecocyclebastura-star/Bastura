<script setup lang="ts">
import { computed, onMounted, ref, useId, watch } from "vue";
import { onBeforeRouteLeave, useRoute, useRouter } from "vue-router";
import AlertToast from "../../components/AlertToast.vue";
import BaseButton from "../../components/BaseButton.vue";
import ImageDropzone from "../../components/ImageDropzone.vue";
import PageHeader from "../../components/PageHeader.vue";
import { resolveAuthError } from "../../constants/authErrors";
import { useToast } from "../../composables/useToast";
import {
  CATALOG_IMAGE_MAX_BYTES,
  isPartialSuccess,
  useCatalogAdminStore,
} from "../../stores/catalogAdminStore";
import type { WasteCategoryOption } from "../../stores/catalogAdminStore";
import { useWasteStore } from "../../stores/wasteStore";
import { formatRibuan } from "../../utils/formatters";
import type { PreparedImage } from "../../utils/imageFile";

const route = useRoute();
const router = useRouter();
const store = useCatalogAdminStore();
const wasteStore = useWasteStore();
const { toastMessage, toastVariant, showToast } = useToast();

const uid = useId();

/** Form yang sama dipakai tambah & edit; edit selalu membawa :id. */
const isEdit = computed(() => route.name === "admin-jenis-sampah-edit");
const idWaste = computed(() => String(route.params.id ?? ""));

/* ================================ ISIAN ================================ */

const name = ref("");
/** Disimpan sebagai string karena <select> bekerja dengan string. */
const categoryId = ref("");
/** Cuma digit; tampilannya diberi titik ribuan lewat `priceDisplay`. */
const priceDigits = ref("");
const description = ref("");
/** Satuan lama dibawa saat edit; item baru selalu per kg sesuai desain. */
const unit = ref("kg");

const nameError = ref("");
const categoryError = ref("");
const priceError = ref("");

// Pesan salah hilang begitu kolomnya mulai diisi lagi.
watch(name, () => (nameError.value = ""));
watch(categoryId, () => (categoryError.value = ""));
watch(priceDigits, () => (priceError.value = ""));

const categories = ref<WasteCategoryOption[]>([]);

/** "1500" -> "Rp1.500"; kosong tetap kosong supaya placeholder-nya tampil. */
const priceDisplay = computed(() =>
  priceDigits.value ? `Rp${formatRibuan(Number(priceDigits.value))}` : "",
);

function onPriceInput(event: Event) {
  const input = event.target as HTMLInputElement;
  // Nol di depan dibuang, dan dibatasi 9 digit supaya tetap angka yang wajar.
  priceDigits.value = input.value.replace(/\D/g, "").replace(/^0+(?=\d)/, "").slice(0, 9);
  // Nilai input disamakan lagi, karena huruf yang diketik tidak mengubah state.
  input.value = priceDisplay.value;
}

function validate(): boolean {
  nameError.value = name.value.trim() ? "" : "Nama sampah tidak boleh kosong";
  categoryError.value = categoryId.value ? "" : "Pilih kategori sampah";
  priceError.value = priceDigits.value ? "" : "Estimasi harga tidak boleh kosong";
  return !nameError.value && !categoryError.value && !priceError.value;
}

/* ============================= FOTO LAMPIRAN ============================= */

const existingImage = ref("");
const newImage = ref<PreparedImage | null>(null);

/* ================================= MUAT ================================= */

const loading = ref(false);
const loadError = ref("");

/** Nilai awal form, pembanding untuk penjaga perubahan yang belum disimpan. */
const initial = ref({ name: "", categoryId: "", priceDigits: "", description: "" });

async function load() {
  loading.value = true;
  loadError.value = "";

  try {
    categories.value = await store.loadCategories();

    if (!isEdit.value) return;

    const item = await wasteStore.findCatalogItem(idWaste.value);
    if (!item) {
      loadError.value = "Jenis sampah tidak ditemukan. Mungkin sudah dihapus.";
      return;
    }

    name.value = item.name ?? "";
    categoryId.value = item.category_id != null ? String(item.category_id) : "";
    priceDigits.value = item.price != null ? String(Math.round(item.price)) : "";
    description.value = item.description ?? "";
    unit.value = item.unit?.trim() || "kg";
    existingImage.value = item.image_base64 ?? "";
    initial.value = {
      name: name.value,
      categoryId: categoryId.value,
      priceDigits: priceDigits.value,
      description: description.value,
    };
  } catch (error) {
    loadError.value = resolveAuthError(error, "Gagal memuat data jenis sampah.");
  } finally {
    loading.value = false;
  }
}

onMounted(load);

/* ================================ SIMPAN ================================ */

const saving = ref(false);

const isDirty = computed(
  () =>
    name.value !== initial.value.name ||
    categoryId.value !== initial.value.categoryId ||
    priceDigits.value !== initial.value.priceDigits ||
    description.value !== initial.value.description ||
    newImage.value !== null,
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
  else router.replace({ name: "admin-jenis-sampah" });
}

async function handleSubmit() {
  if (saving.value) return;
  if (!validate()) {
    showToast("Lengkapi data yang masih kosong.", "warning");
    return;
  }

  const input = {
    name: name.value,
    categoryId: Number(categoryId.value),
    price: Number(priceDigits.value),
    unit: unit.value,
    description: description.value,
    image: newImage.value,
  };

  saving.value = true;
  try {
    const message = isEdit.value
      ? await store.update(idWaste.value, input)
      : await store.create(input);

    // Datanya tersimpan, tapi fotonya gagal terunggah: kabari apa adanya.
    if (isPartialSuccess(message)) store.setFlash(message, "warning");
    else if (isEdit.value) store.setFlash("Perubahan berhasil disimpan.");
    else store.setFlash("Jenis sampah berhasil ditambahkan ke daftar.");

    goBack();
  } catch (error) {
    // Admin tetap di form supaya isiannya tidak perlu diketik ulang.
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
      :title="isEdit ? 'Edit Jenis Sampah' : 'Tambah Jenis Sampah'"
      fallback="admin-jenis-sampah"
    />

    <div v-if="loading" class="flex flex-col gap-4" aria-hidden="true">
      <div v-for="n in 3" :key="n" class="h-14 animate-pulse rounded-2xl bg-neutral-200" />
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
      <div class="flex flex-col gap-1.5">
        <label :for="`${uid}-nama`" :class="labelClass">Nama sampah</label>
        <input
          :id="`${uid}-nama`"
          v-model="name"
          type="text"
          maxlength="100"
          autocomplete="off"
          placeholder="Contoh: Besi"
          :aria-invalid="Boolean(nameError)"
          :class="[fieldClass, borderClass(nameError)]"
        />
        <p v-if="nameError" :class="errorClass">{{ nameError }}</p>
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
            <option value="" disabled>Pilih Kategori</option>
            <option
              v-for="option in categories"
              :key="option.id_waste_category"
              :value="String(option.id_waste_category)"
              class="text-neutral-900"
            >
              {{ option.category_name }}
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
        <label :for="`${uid}-harga`" :class="labelClass">Estimasi harga</label>
        <div class="relative">
          <input
            :id="`${uid}-harga`"
            :value="priceDisplay"
            type="text"
            inputmode="numeric"
            autocomplete="off"
            placeholder="Rp0"
            :aria-invalid="Boolean(priceError)"
            :aria-describedby="`${uid}-satuan`"
            :class="[fieldClass, borderClass(priceError), 'pr-14']"
            @input="onPriceInput"
          />
          <span
            :id="`${uid}-satuan`"
            class="pointer-events-none absolute inset-y-0 right-4 flex items-center text-body-sm font-bold text-neutral-900"
          >
            /{{ unit === "kg" ? "Kg" : unit }}
          </span>
        </div>
        <p v-if="priceError" :class="errorClass">{{ priceError }}</p>
      </div>

      <div class="flex flex-col gap-1.5">
        <label :for="`${uid}-deskripsi`" :class="labelClass">Deskripsi</label>
        <textarea
          :id="`${uid}-deskripsi`"
          v-model="description"
          rows="6"
          maxlength="1000"
          placeholder="Tuliskan detail dari jenis sampah disini..."
          :class="[fieldClass, 'resize-none border-primary-700']"
        />
      </div>

      <ImageDropzone
        v-model:image="newImage"
        :existing="existingImage"
        :max-bytes="CATALOG_IMAGE_MAX_BYTES"
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
          @click="goBack"
        />
      </div>
    </form>

    <AlertToast :message="toastMessage" :variant="toastVariant" />
  </main>
</template>
