<script setup lang="ts">
import { ref, useId, watch } from "vue";
import AppIcon from "./AppIcon.vue";
import BaseButton from "./BaseButton.vue";

const props = defineProps<{
  open: boolean;
  /** Nilai awal form, "yyyy-mm-dd". */
  date?: string;
  /** Nilai awal form, "HH:mm". */
  time?: string;
  /** Jadwal sedang dikirim ke server; sheet tidak bisa ditutup dulu. */
  saving?: boolean;
}>();

const emit = defineEmits<{
  close: [];
  confirm: [value: { date: string; time: string }];
}>();

const uid = useId();

const draftDate = ref("");
const draftTime = ref("");

// Isi ulang tiap kali sheet dibuka: perubahan yang tadi dibatalkan tidak
// boleh ikut nyangkut waktu form-nya dibuka lagi.
watch(
  () => props.open,
  (open) => {
    if (!open) return;
    draftDate.value = props.date ?? "";
    draftTime.value = props.time ?? "";
  },
  { immediate: true },
);

function handleClose() {
  if (!props.saving) emit("close");
}

function handleConfirm() {
  if (props.saving || !draftDate.value || !draftTime.value) return;
  emit("confirm", { date: draftDate.value, time: draftTime.value });
}

const fieldClass =
  "flex items-center gap-2 rounded-2xl border border-primary-700 px-4 py-2.5";
const inputClass =
  "min-w-0 bg-transparent text-body-reg text-neutral-900 focus:outline-none";
</script>

<template>
  <Transition
    enter-active-class="transition duration-200 ease-out"
    enter-from-class="opacity-0"
    leave-active-class="transition duration-150 ease-in"
    leave-to-class="opacity-0"
  >
    <div
      v-if="open"
      class="fixed inset-0 z-50 flex items-end justify-center bg-neutral-900/50"
      role="dialog"
      aria-modal="true"
      :aria-labelledby="`${uid}-title`"
      @click.self="handleClose"
    >
      <div
        class="w-full max-w-sm rounded-t-3xl bg-neutral-50 px-6 pt-3 pb-6 shadow-xl"
      >
        <!-- Gagang kecil khas bottom sheet; murni penanda visual. -->
        <div
          class="mx-auto h-1.5 w-10 rounded-full bg-primary-500"
          aria-hidden="true"
        />

        <h2
          :id="`${uid}-title`"
          class="mt-3 text-center text-h6 font-extrabold text-neutral-900"
        >
          Jadwal Setor
        </h2>

        <form class="mt-4 flex flex-col gap-4" @submit.prevent="handleConfirm">
          <div class="flex flex-col">
            <label
              :for="`${uid}-date`"
              class="text-body-reg font-bold text-neutral-900"
            >
              Tanggal
            </label>

            <div :class="['mt-1.5', fieldClass]">
              <input
                :id="`${uid}-date`"
                v-model="draftDate"
                type="date"
                required
                :class="['flex-1', inputClass]"
              />
              <AppIcon name="calendar" class="size-6 text-primary-800" />
            </div>
          </div>

          <div class="flex flex-col">
            <label
              :for="`${uid}-time`"
              class="text-body-reg font-bold text-neutral-900"
            >
              Jam
            </label>

            <div :class="['mt-1.5', fieldClass]">
              <input
                :id="`${uid}-time`"
                v-model="draftTime"
                type="time"
                required
                :class="inputClass"
              />
              <!-- Zona waktunya tetap, jadi ditulis sebagai label, bukan input. -->
              <span class="flex-1 text-body-reg text-neutral-500">WITA</span>
              <AppIcon name="clock" class="size-6 text-primary-800" />
            </div>
          </div>

          <div class="mt-2 flex gap-3">
            <BaseButton
              label="Batal"
              variant="warning"
              type="button"
              :disabled="saving"
              @click="handleClose"
            />
            <BaseButton
              label="Konfirmasi"
              variant="primary"
              type="submit"
              :disabled="!draftDate || !draftTime"
              :loading="saving"
            />
          </div>
        </form>

        <!-- Ruang buat gesture bar; kelas pb-safe dipisah supaya tidak
             menimpa pb-6 di pembungkusnya. -->
        <div class="pb-safe" aria-hidden="true" />
      </div>
    </div>
  </Transition>
</template>

<style scoped>
/* Ikon bawaan browser disembunyikan tapi dibentangkan sepenuh kolom, supaya
   ikon kita yang kelihatan sementara mengetuk di mana pun tetap membuka
   date/time picker bawaan sistem. */
input[type="date"],
input[type="time"] {
  position: relative;
}

input[type="date"]::-webkit-calendar-picker-indicator,
input[type="time"]::-webkit-calendar-picker-indicator {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  cursor: pointer;
  opacity: 0;
}
</style>
