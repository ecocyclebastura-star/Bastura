<script setup lang="ts">
import { computed, ref } from "vue";
import { useRouter } from "vue-router";
import BaseButton from "../components/BaseButton.vue";
import { useOnboardingStore } from "../stores/onboardingStore";
import ilustrasiKelolaSampah from "../assets/onboarding-kelola-sampah.webp";
import ilustrasiTabungan from "../assets/onboarding-tabungan.webp";
import ilustrasiLingkungan from "../assets/onboarding-lingkungan.webp";

const router = useRouter();
const onboardingStore = useOnboardingStore();

const slides = [
  {
    image: ilustrasiKelolaSampah,
    alt: "Ilustrasi orang memilah sampah ke dalam tempat sampah",
    title: "Kelola Sampah Jadi Lebih Mudah",
    description:
      "Sampah di rumah nggak selalu harus berakhir dibuang. Dengan dipilah dari sekarang, sampah bisa jadi sesuatu yang lebih bermanfaat untuk lingkungan dan juga untuk kita.",
  },
  {
    image: ilustrasiTabungan,
    alt: "Ilustrasi orang menabung lewat celengan",
    title: "Sampahmu Bisa Jadi Tabungan",
    description:
      "Botol plastik, kardus, dan kaleng bekas yang sering dianggap nggak berguna ternyata bisa jadi saldo tambahan lewat BASTURA.",
  },
  {
    image: ilustrasiLingkungan,
    alt: "Ilustrasi orang memeluk bumi",
    title: "Lingkungan Bersih Dimulai dari Kita",
    description:
      "Yuk, bangun RT yang lebih bersih, rapi, dan peduli lingkungan bersama BASTURA.",
  },
];

/** Lingkaran dekoratif di belakang ilustrasi. */
const circles = [
  { top: "5%", left: "0%", size: "3.25rem", color: "bg-primary-700" },
  { top: "2%", left: "33%", size: "1.1rem", color: "bg-neutral-100" },
  { top: "3%", left: "88%", size: "0.9rem", color: "bg-secondary-200" },
  { top: "10%", left: "62%", size: "1.6rem", color: "bg-secondary-700" },
  { top: "17%", left: "82%", size: "3.5rem", color: "bg-primary-700" },
  { top: "46%", left: "5%", size: "1.3rem", color: "bg-primary-700" },
  { top: "42%", left: "72%", size: "1rem", color: "bg-primary-400" },
  { top: "50%", left: "90%", size: "0.8rem", color: "bg-primary-300" },
  { top: "70%", left: "0%", size: "2.2rem", color: "bg-neutral-100" },
  { top: "64%", left: "18%", size: "1rem", color: "bg-primary-400" },
  { top: "70%", left: "76%", size: "1.4rem", color: "bg-secondary-700" },
];

const index = ref(0);
/** Menentukan arah animasi: maju ke kiri, mundur ke kanan. */
const direction = ref<"next" | "prev">("next");

const current = computed(() => slides[index.value]);
const isLast = computed(() => index.value === slides.length - 1);
const transitionName = computed(() => `slide-${direction.value}`);

function goNext() {
  if (isLast.value) {
    finish();
    return;
  }
  direction.value = "next";
  index.value++;
}

function goPrev() {
  if (index.value === 0) return;
  direction.value = "prev";
  index.value--;
}

/** Lewati / selesai: tandai sudah dilihat lalu lanjut ke login. */
function finish() {
  onboardingStore.markSeen();
  router.push({ name: "login" });
}
</script>

<template>
  <div class="min-h-screen w-full bg-white">
    <div
      class="mx-auto flex min-h-screen w-full max-w-sm flex-col px-6 pt-safe pb-safe"
    >
      <!-- Ilustrasi + lingkaran dekoratif -->
      <div class="relative mt-6">
        <span
          v-for="(circle, i) in circles"
          :key="i"
          aria-hidden="true"
          class="absolute rounded-full"
          :class="circle.color"
          :style="{
            top: circle.top,
            left: circle.left,
            width: circle.size,
            height: circle.size,
          }"
        />

        <!-- Tinggi ikut layar biar di HP pendek tidak mendorong tombol keluar. -->
        <div class="relative h-[38vh] max-h-80 min-h-48 w-full overflow-hidden">
          <Transition :name="transitionName">
            <img
              :key="index"
              :src="current.image"
              :alt="current.alt"
              class="absolute inset-0 size-full object-contain"
              width="1000"
              height="1000"
            />
          </Transition>
        </div>
      </div>

      <!-- Indikator halaman -->
      <div class="mt-2 flex gap-2">
        <span
          v-for="(slide, i) in slides"
          :key="slide.title"
          class="h-1.5 flex-1 rounded-full transition-colors duration-300"
          :class="i === index ? 'bg-primary-700' : 'bg-primary-300'"
        />
      </div>

      <!-- Judul + deskripsi -->
      <div class="relative mt-6 min-h-56 overflow-hidden">
        <Transition :name="transitionName">
          <div :key="index" class="absolute inset-x-0 top-0">
            <h1 class="text-h4 font-extrabold text-neutral-900">
              {{ current.title }}
            </h1>
            <p class="mt-3 text-body-reg text-neutral-700">
              {{ current.description }}
            </p>
          </div>
        </Transition>
      </div>

      <!-- Aksi -->
      <div class="mt-auto pb-6">
        <BaseButton
          :label="isLast ? 'Login' : 'Lanjut'"
          variant="primary"
          @click="goNext"
        />

        <div
          class="mt-5 flex items-center"
          :class="index === 0 ? 'justify-end' : 'justify-between'"
        >
          <button
            v-if="index > 0"
            type="button"
            class="flex items-center gap-2 text-body-reg font-medium text-neutral-900"
            @click="goPrev"
          >
            <svg
              class="size-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M19 12H5M11 6l-6 6 6 6" />
            </svg>
            Sebelumnya
          </button>

          <button
            type="button"
            class="flex items-center gap-2 text-body-reg font-medium text-neutral-900"
            @click="finish"
          >
            Lewati
            <svg
              class="size-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Slide masuk dari kanan saat "Lanjut", dari kiri saat "Sebelumnya". */
.slide-next-enter-active,
.slide-next-leave-active,
.slide-prev-enter-active,
.slide-prev-leave-active {
  transition:
    transform 350ms cubic-bezier(0.4, 0, 0.2, 1),
    opacity 300ms ease;
}

.slide-next-enter-from {
  transform: translateX(100%);
  opacity: 0;
}

.slide-next-leave-to {
  transform: translateX(-100%);
  opacity: 0;
}

.slide-prev-enter-from {
  transform: translateX(-100%);
  opacity: 0;
}

.slide-prev-leave-to {
  transform: translateX(100%);
  opacity: 0;
}

/* Hormati setelan "kurangi animasi" di perangkat: cukup fade tipis. */
@media (prefers-reduced-motion: reduce) {
  .slide-next-enter-active,
  .slide-next-leave-active,
  .slide-prev-enter-active,
  .slide-prev-leave-active {
    transition: opacity 150ms ease;
  }

  .slide-next-enter-from,
  .slide-next-leave-to,
  .slide-prev-enter-from,
  .slide-prev-leave-to {
    transform: none;
  }
}
</style>
