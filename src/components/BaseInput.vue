<script setup lang="ts">
import { computed, ref, useId } from "vue";

type IconName = "user" | "mail" | "phone" | "password" | "none";

const props = withDefaults(
  defineProps<{
    label?: string;
    placeholder?: string;
    /** Ikon di sisi kanan input. "password" otomatis jadi tombol show/hide. */
    icon?: IconName;
    type?: string;
    /** Pesan error. Kalau terisi, teks merah + ikon muncul di bawah input. */
    error?: string;
    autocomplete?: string;
    inputmode?: "text" | "email" | "tel" | "numeric";
  }>(),
  {
    label: "",
    placeholder: "",
    icon: "none",
    type: "text",
    error: "",
    autocomplete: "off",
    inputmode: "text",
  },
);

const model = defineModel<string>({ default: "" });

const uid = useId();
const showPassword = ref(false);

const isPassword = computed(() => props.icon === "password");
const inputType = computed(() => {
  if (!isPassword.value) return props.type;
  return showPassword.value ? "text" : "password";
});
</script>

<template>
  <div class="flex flex-col">
    <label
      v-if="label"
      :for="uid"
      class="text-body-reg font-bold text-primary-900"
    >
      {{ label }}
    </label>

    <div class="relative mt-2">
      <input
        :id="uid"
        v-model="model"
        :type="inputType"
        :placeholder="placeholder"
        :autocomplete="autocomplete"
        :inputmode="inputmode"
        :aria-invalid="Boolean(error)"
        :aria-describedby="error ? `${uid}-error` : undefined"
        class="w-full rounded-xl border-2 border-transparent bg-white py-3 pl-4 pr-12 text-body-reg text-neutral-900 placeholder:text-neutral-400 focus:border-blue-500 focus:outline-none"
      />

      <!-- Password: tombol show/hide -->
      <button
        v-if="isPassword"
        type="button"
        class="absolute inset-y-0 right-4 flex items-center text-neutral-400 transition-colors hover:text-neutral-600"
        :aria-label="
          showPassword ? 'Sembunyikan password' : 'Tampilkan password'
        "
        @click="showPassword = !showPassword"
      >
        <svg class="size-6" viewBox="0 0 24 24" fill="currentColor">
          <path
            d="M12 5c-5 0-9 4.5-10 7 1 2.5 5 7 10 7s9-4.5 10-7c-1-2.5-5-7-10-7Zm0 11a4 4 0 1 1 0-8 4 4 0 0 1 0 8Z"
          />
          <circle cx="12" cy="12" r="2" fill="white" />
          <path
            v-if="!showPassword"
            d="M4 3.5 20.5 20"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
          />
        </svg>
      </button>

      <!-- Ikon dekoratif lain -->
      <span
        v-else-if="icon !== 'none'"
        class="pointer-events-none absolute inset-y-0 right-4 flex items-center text-neutral-400"
      >
        <svg
          v-if="icon === 'user'"
          class="size-6"
          viewBox="0 0 24 24"
          fill="currentColor"
        >
          <circle cx="12" cy="8" r="4" />
          <path d="M4 20a8 8 0 0 1 16 0 1 1 0 0 1-1 1H5a1 1 0 0 1-1-1Z" />
        </svg>

        <svg
          v-else-if="icon === 'mail'"
          class="size-6"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="1.8"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <rect x="2.5" y="5" width="19" height="14" rx="2.5" />
          <path d="M3 7.5 12 13.5 21 7.5" />
        </svg>

        <svg
          v-else-if="icon === 'phone'"
          class="size-6"
          viewBox="0 0 24 24"
          fill="currentColor"
        >
          <path
            d="M6.6 2.9a1.8 1.8 0 0 1 2.5.6l1.6 2.6a1.8 1.8 0 0 1-.3 2.3l-1.2 1c.7 1.6 2 2.9 3.6 3.6l1-1.2a1.8 1.8 0 0 1 2.3-.3l2.6 1.6a1.8 1.8 0 0 1 .6 2.5l-1 1.5a3 3 0 0 1-3.4 1.2C10.6 18.7 5.3 13.4 3.9 7.7a3 3 0 0 1 1.2-3.4l1.5-1.4Z"
          />
        </svg>
      </span>
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
