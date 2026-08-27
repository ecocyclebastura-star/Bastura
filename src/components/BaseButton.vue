<script setup lang="ts">
import { computed } from "vue";

type Variant =
  | "primary"
  | "accent"
  | "secondary"
  | "outline"
  | "ghost"
  | "danger"
  | "warning";
type Size = "sm" | "md" | "lg";
type Rounded = "md" | "lg" | "xl" | "full";

const props = withDefaults(
  defineProps<{
    /** Teks tombol. Bisa juga dioper lewat default slot. */
    label?: string;
    /** Preset warna. */
    variant?: Variant;
    size?: Size;
    rounded?: Rounded;
    /** Lebar penuh mengikuti parent. */
    block?: boolean;
    disabled?: boolean;
    loading?: boolean;
    type?: "button" | "submit" | "reset";
  }>(),
  {
    label: "",
    variant: "primary",
    size: "md",
    rounded: "full",
    block: true,
    disabled: false,
    loading: false,
    type: "button",
  },
);

const variantClasses: Record<Variant, string> = {
  primary:
    "bg-primary-700 text-white hover:bg-primary-800 active:bg-primary-900",
  // Hijau terang khas brand, dipakai buat aksi utama di halaman dalam.
  accent: "bg-primary-500 text-white hover:bg-primary-600 active:bg-primary-700",
  secondary:
    "bg-secondary-500 text-primary-900 hover:bg-secondary-600 active:bg-secondary-700",
  outline:
    "bg-transparent text-primary-700 border border-primary-700 hover:bg-primary-100 active:bg-primary-200",
  ghost:
    "bg-transparent text-primary-700 hover:bg-primary-100 active:bg-primary-200",
  danger: "bg-red-600 text-white hover:bg-red-700 active:bg-red-800",
  // Oranye: aksi merusak yang masih bisa dibatalkan, mis. hapus akun.
  warning: "bg-orange-500 text-white hover:bg-orange-600 active:bg-orange-700",
};

const sizeClasses: Record<Size, string> = {
  sm: "px-4 py-2 text-body-sm",
  md: "px-6 py-3 text-body-reg",
  lg: "px-8 py-4 text-body-md",
};

const roundedClasses: Record<Rounded, string> = {
  md: "rounded-md",
  lg: "rounded-lg",
  xl: "rounded-xl",
  full: "rounded-full",
};

const isDisabled = computed(() => props.disabled || props.loading);

const classes = computed(() => [
  "inline-flex items-center justify-center gap-2 font-semibold",
  "transition-colors duration-200 select-none cursor-pointer",
  "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2",
  variantClasses[props.variant],
  sizeClasses[props.size],
  roundedClasses[props.rounded],
  props.block ? "w-full" : "",
  isDisabled.value ? "opacity-60 pointer-events-none" : "",
]);
</script>

<template>
  <button :type="type" :disabled="isDisabled" :class="classes">
    <svg
      v-if="loading"
      class="size-5 animate-spin"
      viewBox="0 0 24 24"
      fill="none"
    >
      <circle
        class="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        stroke-width="4"
      />
      <path
        class="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
      />
    </svg>

    <slot>{{ label }}</slot>
  </button>
</template>
