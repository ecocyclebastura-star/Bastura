<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue";
import { useRouter } from "vue-router";
import AlertToast from "../../components/AlertToast.vue";
import AppIcon from "../../components/AppIcon.vue";
import { resolveAuthError } from "../../constants/authErrors";
import { useToast } from "../../composables/useToast";
import {
  DAILY_SCAN_LIMIT,
  SCAN_IMAGE_MAX_BYTES,
  SCAN_IMAGE_TYPES,
  classifyScan,
  useScanStore,
} from "../../stores/scanStore";
import { compressImage, imageErrorMessage } from "../../utils/imageFile";

const router = useRouter();
const scanStore = useScanStore();
const { toastMessage, toastVariant, showToast } = useToast(4500);

/* ================================ KAMERA ================================ */

const video = ref<HTMLVideoElement | null>(null);
const galleryInput = ref<HTMLInputElement | null>(null);
const cameraInput = ref<HTMLInputElement | null>(null);

let stream: MediaStream | null = null;
const cameraReady = ref(false);
/** Pesan kalau kamera live tidak bisa dipakai; tombol shutter jatuh ke kamera bawaan HP. */
const cameraError = ref("");

const torchSupported = ref(false);
const torchOn = ref(false);

/**
 * getUserMedia cuma ada di konteks aman. Build aplikasi (tauri.localhost)
 * termasuk aman, tapi `tauri android dev` yang memuat dev server lewat IP
 * LAN tidak -- di situ shutter otomatis memakai kamera bawaan HP.
 */
async function startCamera() {
  if (stream) return;
  if (!navigator.mediaDevices?.getUserMedia) {
    cameraError.value = "Kamera langsung tidak tersedia. Ketuk tombol untuk membuka kamera.";
    return;
  }

  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: "environment" }, width: { ideal: 1920 }, height: { ideal: 1080 } },
      audio: false,
    });
    if (video.value) {
      video.value.srcObject = stream;
      await video.value.play().catch(() => undefined);
    }
    cameraReady.value = true;
    cameraError.value = "";

    const track = stream.getVideoTracks()[0];
    // `torch` belum ada di tipe DOM bawaan TypeScript.
    const capabilities = (track?.getCapabilities?.() ?? {}) as unknown as { torch?: boolean };
    torchSupported.value = Boolean(capabilities.torch);
  } catch (error) {
    const name = (error as { name?: string })?.name;
    cameraError.value =
      name === "NotAllowedError"
        ? "Izin kamera ditolak. Izinkan akses kamera di pengaturan HP, atau pilih foto dari galeri."
        : "Kamera tidak bisa dibuka. Ketuk tombol untuk membuka kamera atau pilih foto dari galeri.";
  }
}

function stopCamera() {
  stream?.getTracks().forEach((track) => track.stop());
  stream = null;
  cameraReady.value = false;
  torchOn.value = false;
}

async function toggleFlash() {
  const track = stream?.getVideoTracks()[0];
  if (!track || !torchSupported.value) {
    showToast("Flash tidak didukung di perangkat ini.", "warning");
    return;
  }
  try {
    const next = !torchOn.value;
    await track.applyConstraints({ advanced: [{ torch: next } as unknown as MediaTrackConstraintSet] });
    torchOn.value = next;
  } catch {
    showToast("Flash tidak bisa dinyalakan.", "warning");
  }
}

// Kamera dimatikan selama aplikasi di belakang, supaya lampu indikatornya
// tidak menyala terus dan baterai tidak terkuras.
function onVisibilityChange() {
  if (document.hidden) stopCamera();
  else if (!scanning.value) startCamera();
}

/* ================================= SCAN ================================= */

const scanning = ref(false);
/** Foto yang sedang/baru saja di-scan, ditampilkan menimpa video. */
const frozenImage = ref("");
/** Scan barusan gagal: fotonya diburamkan sambil toast tampil. */
const failed = ref(false);
let failTimer: ReturnType<typeof setTimeout> | undefined;

const limitReached = computed(() => scanStore.remainingToday === 0);

function limitMessage(): string {
  const remaining = scanStore.remainingToday;
  if (remaining === 0) {
    return `Kamu sudah mencapai batas ${DAILY_SCAN_LIMIT} kali scan hari ini. Coba lagi besok.`;
  }
  if (remaining === DAILY_SCAN_LIMIT) {
    return `Kamu hanya memiliki batas ${DAILY_SCAN_LIMIT} kali untuk menggunakan fitur scan dalam sehari.`;
  }
  return `Kamu masih punya ${remaining} kali scan lagi hari ini.`;
}

function clearFrozen() {
  clearTimeout(failTimer);
  if (frozenImage.value) URL.revokeObjectURL(frozenImage.value);
  frozenImage.value = "";
  failed.value = false;
}

/** Ambil satu frame dari video sebagai JPEG. */
function captureFrame(): Promise<Blob | null> {
  const el = video.value;
  if (!el || !el.videoWidth) return Promise.resolve(null);

  const scale = Math.min(1, 1600 / Math.max(el.videoWidth, el.videoHeight));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(el.videoWidth * scale);
  canvas.height = Math.round(el.videoHeight * scale);
  canvas.getContext("2d")?.drawImage(el, 0, 0, canvas.width, canvas.height);

  return new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.85));
}

async function runScan(image: Blob, fileName: string) {
  clearFrozen();
  const imageUrl = URL.createObjectURL(image);
  frozenImage.value = imageUrl;
  scanning.value = true;

  try {
    const response = await scanStore.scan(image, fileName);
    const outcome = classifyScan(response);

    if (outcome === "recognized") {
      // Foto diserahkan ke halaman hasil; jangan di-revoke di sini.
      frozenImage.value = "";
      scanStore.setResult(response, imageUrl);
      router.push({ name: "user-scan-hasil" });
      return;
    }

    failed.value = true;
    showToast(
      outcome === "blurry"
        ? "Foto kurang jelas. Tahan kamera sejenak sebelum mengambil gambar."
        : "Maaf, kami belum bisa mengenali sampah ini. Coba ambil foto lagi, ya.",
      outcome === "blurry" ? "warning" : "error",
    );
  } catch (error) {
    failed.value = true;
    if (limitReached.value) showToast(limitMessage(), "info");
    else showToast(resolveAuthError(error, "Scan gagal. Coba lagi sebentar lagi."), "error");
  } finally {
    scanning.value = false;
  }

  // Foto buram ditahan selama toast tampil, lalu kembali ke kamera.
  failTimer = setTimeout(clearFrozen, 4500);
}

function ensureQuota(): boolean {
  if (!limitReached.value) return true;
  showToast(limitMessage(), "info");
  return false;
}

async function handleShutter() {
  if (scanning.value || !ensureQuota()) return;

  if (!cameraReady.value) {
    cameraInput.value?.click();
    return;
  }

  const frame = await captureFrame();
  if (!frame) {
    showToast("Kamera belum siap. Coba lagi sebentar.", "warning");
    return;
  }
  await runScan(frame, `scan-${Date.now()}.jpg`);
}

function openGallery() {
  if (scanning.value || !ensureQuota()) return;
  galleryInput.value?.click();
}

/** Foto dari galeri / kamera bawaan: diperkecil kalau kebesaran atau formatnya tidak diterima. */
async function onFileChosen(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = "";
  if (!file) return;

  try {
    const usable = SCAN_IMAGE_TYPES.includes(file.type) && file.size <= SCAN_IMAGE_MAX_BYTES;
    const image = usable ? file : await compressImage(file, SCAN_IMAGE_MAX_BYTES);
    const name = usable ? file.name || `scan-${Date.now()}.jpg` : `scan-${Date.now()}.jpg`;
    await runScan(image, name);
  } catch (error) {
    showToast(imageErrorMessage(error), "warning");
  }
}

/* ============================== SIKLUS HIDUP ============================== */

onMounted(() => {
  startCamera();
  document.addEventListener("visibilitychange", onVisibilityChange);
  showToast(limitMessage(), "info");
});

onUnmounted(() => {
  document.removeEventListener("visibilitychange", onVisibilityChange);
  stopCamera();
  clearFrozen();
});

function goBack() {
  if (window.history.state?.back) router.back();
  else router.push({ name: "dashboard-user" });
}
</script>

<template>
  <main class="fixed inset-0 z-40 flex flex-col bg-black text-white">
    <div class="relative flex-1 overflow-hidden">
      <video
        ref="video"
        class="absolute inset-0 size-full object-cover"
        autoplay
        muted
        playsinline
        aria-hidden="true"
      />

      <img
        v-if="frozenImage"
        :src="frozenImage"
        alt="Foto yang sedang di-scan"
        class="absolute inset-0 size-full object-cover transition duration-300"
        :class="failed ? 'scale-105 blur-md' : ''"
      />

      <!-- Gradien tipis supaya judul tetap terbaca di atas foto yang terang. -->
      <div
        class="pointer-events-none absolute inset-x-0 top-0 h-32 bg-linear-to-b from-black/50 to-transparent"
        aria-hidden="true"
      />

      <header class="absolute inset-x-0 top-0 mx-auto w-full max-w-sm px-6 pt-safe">
        <div class="relative flex items-center justify-center pt-6 pb-1">
          <button
            type="button"
            class="absolute left-0 flex size-10 cursor-pointer items-center justify-center rounded-full text-white transition-colors duration-200 hover:bg-white/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
            aria-label="Kembali"
            @click="goBack"
          >
            <svg
              class="size-7"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2.2"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <path d="M20 12H4" />
              <path d="m10 6-6 6 6 6" />
            </svg>
          </button>
          <h1 class="text-h5 font-extrabold">Scan Sampah</h1>
        </div>
      </header>

      <!-- Bingkai bidik. -->
      <div
        v-if="!scanning"
        class="pointer-events-none absolute inset-x-0 top-1/2 mx-auto h-72 w-72 max-w-[80%] -translate-y-1/2"
        aria-hidden="true"
      >
        <span class="absolute inset-x-10 top-0 h-1 rounded-full bg-primary-500" />
        <span class="absolute top-0 left-0 size-12 rounded-tl-3xl border-t-4 border-l-4 border-primary-500" />
        <span class="absolute top-0 right-0 size-12 rounded-tr-3xl border-t-4 border-r-4 border-primary-500" />
        <span class="absolute bottom-0 left-0 size-12 rounded-bl-3xl border-b-4 border-l-4 border-primary-500" />
        <span class="absolute right-0 bottom-0 size-12 rounded-br-3xl border-r-4 border-b-4 border-primary-500" />
      </div>

      <!-- Memproses. -->
      <div
        v-if="scanning"
        class="absolute inset-0 flex flex-col items-center justify-center gap-6"
        role="status"
        aria-live="polite"
      >
        <svg class="size-40 animate-spin" viewBox="0 0 100 100" aria-hidden="true">
          <defs>
            <linearGradient id="scan-spinner" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stop-color="#5FB828" stop-opacity="0" />
              <stop offset="100%" stop-color="#5FB828" />
            </linearGradient>
          </defs>
          <path
            d="M15 50a35 35 0 0 1 70 0"
            fill="none"
            stroke="url(#scan-spinner)"
            stroke-width="7"
            stroke-linecap="round"
          />
        </svg>
        <p class="text-body-lg font-bold text-neutral-400">Loading...</p>
      </div>

      <!-- Kamera tidak bisa dipakai langsung. -->
      <p
        v-if="cameraError && !frozenImage && !scanning"
        class="absolute inset-x-0 bottom-8 mx-auto max-w-xs px-6 text-center text-body-sm text-neutral-300"
      >
        {{ cameraError }}
      </p>
    </div>

    <div class="bg-neutral-900 pb-safe">
      <div class="mx-auto flex w-full max-w-sm items-center justify-between px-10 py-6">
        <button
          type="button"
          class="flex size-12 cursor-pointer items-center justify-center rounded-full text-white transition-colors duration-200 hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-white disabled:opacity-40"
          aria-label="Pilih foto dari galeri"
          :disabled="scanning"
          @click="openGallery"
        >
          <AppIcon name="galeriScan" class="size-9" />
        </button>

        <button
          type="button"
          class="flex size-24 cursor-pointer items-center justify-center rounded-full border-4 border-white p-1.5 transition-transform duration-150 active:scale-95 focus:outline-none focus-visible:ring-4 focus-visible:ring-primary-500 disabled:opacity-60"
          aria-label="Ambil foto dan scan"
          :disabled="scanning"
          @click="handleShutter"
        >
          <span class="block size-full rounded-full bg-neutral-50" />
        </button>

        <button
          type="button"
          class="flex size-12 cursor-pointer items-center justify-center rounded-full transition-colors duration-200 hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-white disabled:opacity-40"
          :class="torchOn ? 'text-amber-300' : 'text-white'"
          :aria-label="torchOn ? 'Matikan flash' : 'Nyalakan flash'"
          :aria-pressed="torchOn"
          :disabled="!cameraReady"
          @click="toggleFlash"
        >
          <AppIcon name="senter" class="size-8" />
        </button>
      </div>
    </div>

    <input
      ref="galleryInput"
      type="file"
      accept="image/jpeg,image/png,image/webp"
      class="hidden"
      @change="onFileChosen"
    />
    <!-- Cadangan saat kamera live tidak tersedia: buka kamera bawaan HP. -->
    <input
      ref="cameraInput"
      type="file"
      accept="image/*"
      capture="environment"
      class="hidden"
      @change="onFileChosen"
    />

    <AlertToast :message="toastMessage" :variant="toastVariant" />
  </main>
</template>
