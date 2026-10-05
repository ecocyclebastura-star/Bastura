<script setup lang="ts">
import { computed, onUnmounted, ref, useId, watch } from "vue";
import AppIcon from "./AppIcon.vue";
import AvatarSheet from "./AvatarSheet.vue";
import { imageErrorMessage, prepareImage } from "../utils/imageFile";
import type { PreparedImage } from "../utils/imageFile";

/**
 * Kolom "Foto Lampiran" di form admin (pengumuman, edukasi, katalog).
 *
 * Belum ada foto: klik langsung membuka galeri. Sudah ada: sheet "ganti /
 * hapus" yang muncul. Foto yang kebesaran diperkecil otomatis sampai muat
 * di batas command tujuannya (`maxBytes`).
 */
const props = withDefaults(
  defineProps<{
    label?: string;
    /** Batas ukuran dari backend untuk command tujuannya. */
    maxBytes: number;
    /** Foto yang sudah tersimpan (mode edit / draft), berupa URL atau data URI. */
    existing?: string;
    /**
     * Foto lama boleh dihapus tanpa diganti. Command edit di backend belum
     * punya opsi hapus foto, jadi cuma draft yang menyalakannya.
     */
    canRemoveExisting?: boolean;
  }>(),
  { label: "Foto Lampiran", existing: "", canRemoveExisting: false },
);

/** Foto baru yang belum dikirim. */
const image = defineModel<PreparedImage | null>("image", { default: null });
/** Foto lama dihapus tanpa diganti. */
const removed = defineModel<boolean>("removed", { default: false });

const emit = defineEmits<{ error: [message: string] }>();

const uid = useId();
const fileInput = ref<HTMLInputElement | null>(null);
const sheetOpen = ref(false);
const dragging = ref(false);
const processing = ref(false);

const previewSrc = computed(
  () => image.value?.preview || (removed.value ? "" : props.existing),
);

const canRemove = computed(
  () => Boolean(image.value) || (props.canRemoveExisting && Boolean(previewSrc.value)),
);

// Object URL lama dilepas begitu fotonya diganti atau dibuang.
watch(image, (_, old) => {
  if (old && old !== image.value) URL.revokeObjectURL(old.preview);
});

onUnmounted(() => {
  if (image.value) URL.revokeObjectURL(image.value.preview);
});

function handleClick() {
  if (processing.value) return;
  if (previewSrc.value) sheetOpen.value = true;
  else fileInput.value?.click();
}

function openPicker() {
  sheetOpen.value = false;
  fileInput.value?.click();
}

function removeImage() {
  sheetOpen.value = false;
  if (image.value) image.value = null;
  else if (props.canRemoveExisting) removed.value = true;
}

async function useFile(file: File | undefined) {
  if (!file) return;

  processing.value = true;
  try {
    image.value = await prepareImage(file, props.maxBytes);
  } catch (error) {
    emit("error", imageErrorMessage(error));
  } finally {
    processing.value = false;
  }
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
</script>

<template>
  <div class="flex flex-col gap-1.5">
    <span :id="`${uid}-label`" class="text-h6 font-medium text-neutral-900">{{ label }}</span>

    <button
      type="button"
      class="relative flex h-40 w-full cursor-pointer flex-col items-center justify-center overflow-hidden rounded-2xl border bg-white text-center transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
      :class="dragging ? 'border-2 border-dashed border-primary-500 bg-primary-100' : 'border-primary-700'"
      :aria-labelledby="`${uid}-label`"
      :aria-busy="processing"
      @click="handleClick"
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
        <span class="mt-3 text-body-sm text-neutral-400">
          {{ processing ? "Memproses foto..." : "Klik atau Taruh foto disini" }}
        </span>
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

    <AvatarSheet
      :open="sheetOpen"
      :title="label"
      :can-remove="canRemove"
      @close="sheetOpen = false"
      @pick="openPicker"
      @remove="removeImage"
    />
  </div>
</template>
