<script setup lang="ts">
import { ref, useId, watch } from "vue";

const props = withDefaults(
  defineProps<{
    label?: string;
    /** Jumlah kotak digit. */
    length?: number;
    /** Pesan error. Kalau terisi, border merah + teks error muncul. */
    error?: string;
  }>(),
  { label: "", length: 6, error: "" },
);

/** Berisi digit yang sudah diisi, misal "1234" kalau baru 4 kotak terisi. */
const model = defineModel<string>({ default: "" });

const uid = useId();
const boxes = ref<string[]>(Array.from({ length: props.length }, () => ""));
const inputRefs = ref<HTMLInputElement[]>([]);

// Sinkron kalau parent me-reset nilainya dari luar (misal setelah kirim ulang kode).
watch(model, (value) => {
  if (value === boxes.value.join("")) return;
  const chars = value.split("");
  boxes.value = Array.from({ length: props.length }, (_, i) => chars[i] ?? "");
});

function sync() {
  model.value = boxes.value.join("");
}

function focusBox(index: number) {
  const el = inputRefs.value[index];
  if (!el) return;
  el.focus();
  el.select();
}

function handleInput(event: Event, index: number) {
  const el = event.target as HTMLInputElement;
  // Ambil digit terakhir supaya mengetik di kotak terisi langsung menimpa.
  const digit = el.value.replace(/\D/g, "").slice(-1);

  boxes.value[index] = digit;
  el.value = digit;
  sync();

  if (digit && index < props.length - 1) focusBox(index + 1);
}

function handleKeydown(event: KeyboardEvent, index: number) {
  if (event.key === "Backspace" && !boxes.value[index] && index > 0) {
    event.preventDefault();
    boxes.value[index - 1] = "";
    sync();
    focusBox(index - 1);
    return;
  }

  if (event.key === "ArrowLeft" && index > 0) {
    event.preventDefault();
    focusBox(index - 1);
    return;
  }

  if (event.key === "ArrowRight" && index < props.length - 1) {
    event.preventDefault();
    focusBox(index + 1);
  }
}

function handlePaste(event: ClipboardEvent, index: number) {
  event.preventDefault();
  const pasted = (event.clipboardData?.getData("text") ?? "").replace(
    /\D/g,
    "",
  );
  if (!pasted) return;

  pasted
    .slice(0, props.length - index)
    .split("")
    .forEach((digit, offset) => (boxes.value[index + offset] = digit));

  sync();
  focusBox(Math.min(index + pasted.length, props.length - 1));
}
</script>

<template>
  <div class="flex flex-col">
    <span v-if="label" :id="`${uid}-label`" class="text-body-reg font-bold text-primary-900">
      {{ label }}
    </span>

    <div
      class="mt-2 flex justify-between gap-2"
      role="group"
      :aria-labelledby="label ? `${uid}-label` : undefined"
      :aria-describedby="error ? `${uid}-error` : undefined"
    >
      <input
        v-for="(digit, index) in boxes"
        :key="index"
        :ref="
          (el) => {
            if (el) inputRefs[index] = el as HTMLInputElement;
          }
        "
        :value="digit"
        type="text"
        inputmode="numeric"
        autocomplete="one-time-code"
        maxlength="1"
        :aria-label="`Digit ke-${index + 1}`"
        :aria-invalid="Boolean(error)"
        class="h-14 w-full min-w-0 rounded-xl border-2 bg-white text-center text-h5 font-bold text-neutral-900 focus:outline-none"
        :class="
          error
            ? 'border-red-500 focus:border-red-600'
            : 'border-transparent focus:border-blue-500'
        "
        @input="handleInput($event, index)"
        @keydown="handleKeydown($event, index)"
        @paste="handlePaste($event, index)"
        @focus="($event.target as HTMLInputElement).select()"
      />
    </div>

    <p
      v-if="error"
      :id="`${uid}-error`"
      class="mt-1.5 flex items-start gap-1.5 text-body-tiny font-medium text-red-600"
    >
      <svg
        class="mt-0.5 size-4 shrink-0"
        viewBox="0 0 24 24"
        fill="currentColor"
      >
        <path
          d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm-1 5h2v7h-2V7Zm0 9h2v2h-2v-2Z"
        />
      </svg>
      <span>{{ error }}</span>
    </p>
  </div>
</template>
