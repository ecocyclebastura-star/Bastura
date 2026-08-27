<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from "vue";
import BaseButton from "./BaseButton.vue";

const props = defineProps<{
  /** Object URL berkas yang baru dipilih user. */
  source: string;
  /** Sisi hasil akhir dalam piksel. */
  output?: number;
}>();

const emit = defineEmits<{
  cancel: [];
  done: [file: { bytes: Uint8Array; name: string; preview: string }];
}>();

/** Backend menolak avatar di atas 500KB (lihat upload_avatar_service). */
const MAX_BYTES = 500 * 1024;
const OUTPUT_SIZE = props.output ?? 512;

const image = ref<HTMLImageElement | null>(null);
const frame = ref<HTMLElement | null>(null);
const naturalWidth = ref(0);
const naturalHeight = ref(0);
const frameSize = ref(0);
const saving = ref(false);
const errorMessage = ref("");

// Geser (tx, ty) dalam piksel layar + perbesaran (zoom) relatif terhadap
// ukuran "pas menutupi frame".
const tx = ref(0);
const ty = ref(0);
const zoom = ref(1);

const MIN_ZOOM = 1;
const MAX_ZOOM = 5;

/** Skala supaya gambar minimal menutupi seluruh frame (mirip object-fit: cover). */
const baseScale = computed(() => {
  if (!naturalWidth.value || !frameSize.value) return 1;
  return Math.max(
    frameSize.value / naturalWidth.value,
    frameSize.value / naturalHeight.value,
  );
});

const displayWidth = computed(() => naturalWidth.value * baseScale.value * zoom.value);
const displayHeight = computed(() => naturalHeight.value * baseScale.value * zoom.value);

/**
 * Batasi geseran supaya frame tidak pernah keluar dari gambar -- kalau boleh
 * lewat, hasil cropnya bakal punya pinggiran kosong.
 */
function clamp() {
  const maxX = Math.max(0, (displayWidth.value - frameSize.value) / 2);
  const maxY = Math.max(0, (displayHeight.value - frameSize.value) / 2);
  tx.value = Math.min(maxX, Math.max(-maxX, tx.value));
  ty.value = Math.min(maxY, Math.max(-maxY, ty.value));
}

function onImageLoad(event: Event) {
  const el = event.target as HTMLImageElement;
  naturalWidth.value = el.naturalWidth;
  naturalHeight.value = el.naturalHeight;
  frameSize.value = frame.value?.clientWidth ?? 0;
  tx.value = 0;
  ty.value = 0;
  zoom.value = 1;
}

// --- Geser & cubit ------------------------------------------------------

const pointers = new Map<number, { x: number; y: number }>();
let pinchStartDistance = 0;
let pinchStartZoom = 1;
let lastX = 0;
let lastY = 0;

function distance() {
  const [a, b] = [...pointers.values()];
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function onPointerDown(event: PointerEvent) {
  (event.target as HTMLElement).setPointerCapture(event.pointerId);
  pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
  lastX = event.clientX;
  lastY = event.clientY;

  if (pointers.size === 2) {
    pinchStartDistance = distance();
    pinchStartZoom = zoom.value;
  }
}

function onPointerMove(event: PointerEvent) {
  if (!pointers.has(event.pointerId)) return;
  pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });

  if (pointers.size === 2 && pinchStartDistance > 0) {
    const ratio = distance() / pinchStartDistance;
    zoom.value = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, pinchStartZoom * ratio));
    clamp();
    return;
  }

  tx.value += event.clientX - lastX;
  ty.value += event.clientY - lastY;
  lastX = event.clientX;
  lastY = event.clientY;
  clamp();
}

function onPointerUp(event: PointerEvent) {
  pointers.delete(event.pointerId);
  if (pointers.size < 2) pinchStartDistance = 0;
}

function onWheel(event: WheelEvent) {
  event.preventDefault();
  const next = zoom.value * (event.deltaY < 0 ? 1.1 : 1 / 1.1);
  zoom.value = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, next));
  clamp();
}

watch(zoom, clamp);

// --- Simpan -------------------------------------------------------------

function toBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
}

async function handleSave() {
  const el = image.value;
  if (!el || saving.value) return;

  saving.value = true;
  errorMessage.value = "";

  try {
    const scale = baseScale.value * zoom.value;

    // Posisi frame terhadap sudut kiri-atas gambar, dikembalikan ke koordinat
    // piksel asli gambar.
    const sx = (displayWidth.value / 2 - frameSize.value / 2 - tx.value) / scale;
    const sy = (displayHeight.value / 2 - frameSize.value / 2 - ty.value) / scale;
    const sSize = frameSize.value / scale;

    const canvas = document.createElement("canvas");
    canvas.width = OUTPUT_SIZE;
    canvas.height = OUTPUT_SIZE;

    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D tidak tersedia");

    ctx.drawImage(el, sx, sy, sSize, sSize, 0, 0, OUTPUT_SIZE, OUTPUT_SIZE);

    // Turunkan mutu bertahap kalau masih kebesaran; 500KB itu batas backend.
    let blob: Blob | null = null;
    for (const quality of [0.85, 0.7, 0.55, 0.4]) {
      blob = await toBlob(canvas, quality);
      if (blob && blob.size <= MAX_BYTES) break;
    }

    if (!blob) throw new Error("Gagal memproses gambar");
    if (blob.size > MAX_BYTES) {
      errorMessage.value = "Foto terlalu besar. Coba pilih foto lain.";
      return;
    }

    const bytes = new Uint8Array(await blob.arrayBuffer());
    emit("done", {
      bytes,
      name: `avatar-${Date.now()}.jpg`,
      preview: canvas.toDataURL("image/jpeg", 0.85),
    });
  } catch {
    errorMessage.value = "Gagal memproses foto. Coba pilih foto lain.";
  } finally {
    saving.value = false;
  }
}

onBeforeUnmount(() => pointers.clear());
</script>

<template>
  <div class="fixed inset-0 z-50 flex flex-col bg-neutral-800">
    <div class="flex flex-1 items-center justify-center overflow-hidden">
      <!-- Frame crop sekaligus jadi kerangka acuan geser: ukurannya persis
           area yang bakal dipotong. -->
      <div
        ref="frame"
        class="relative aspect-square w-72 max-w-[80vw] touch-none overflow-hidden select-none"
        @pointerdown="onPointerDown"
        @pointermove="onPointerMove"
        @pointerup="onPointerUp"
        @pointercancel="onPointerUp"
        @wheel="onWheel"
      >
        <img
          ref="image"
          :src="source"
          alt=""
          class="pointer-events-none absolute top-1/2 left-1/2 max-w-none"
          :style="{
            width: `${displayWidth}px`,
            height: `${displayHeight}px`,
            transform: `translate(-50%, -50%) translate(${tx}px, ${ty}px)`,
          }"
          @load="onImageLoad"
        />

        <!-- Lingkaran penanda hasil akhir; avatar tampil bulat di aplikasi. -->
        <div
          class="pointer-events-none absolute inset-0 rounded-2xl border-4 border-white"
          aria-hidden="true"
        >
          <div class="size-full rounded-full ring-1 ring-white/40" />
        </div>
      </div>
    </div>

    <p
      v-if="errorMessage"
      class="px-6 pb-2 text-center text-body-sm text-red-300"
      role="alert"
    >
      {{ errorMessage }}
    </p>

    <p class="px-6 pb-3 text-center text-body-tiny text-white/60">
      Geser untuk mengatur posisi, cubit atau scroll untuk memperbesar.
    </p>

    <div class="flex gap-3 px-6 pb-safe">
      <BaseButton
        class="flex-1"
        label="Batal"
        variant="outline"
        :block="false"
        :disabled="saving"
        @click="emit('cancel')"
      />
      <BaseButton
        class="flex-1"
        label="Simpan"
        variant="accent"
        :block="false"
        :loading="saving"
        @click="handleSave"
      />
    </div>
  </div>
</template>
