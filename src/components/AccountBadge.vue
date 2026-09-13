<script setup lang="ts">
import { ROLE_LABELS } from "../constants/wargaAccess";
import type { AccountRole } from "../constants/wargaAccess";

export type AccountBadgeVariant = AccountRole | "diblokir";

defineProps<{ variant: AccountBadgeVariant }>();

const STYLES: Record<AccountBadgeVariant, { label: string; badgeClass: string }> = {
  warga: {
    label: ROLE_LABELS.warga,
    badgeClass: "border-secondary-600 text-secondary-600",
  },
  admin: {
    label: ROLE_LABELS.admin,
    badgeClass: "border-primary-600 text-primary-600",
  },
  "super admin": {
    label: ROLE_LABELS["super admin"],
    badgeClass: "border-primary-800 text-primary-800",
  },
  diblokir: {
    label: "Diblokir",
    badgeClass: "border-orange-600 text-orange-600",
  },
};
</script>

<template>
  <span
    class="inline-block shrink-0 rounded-full border bg-white px-2.5 py-px text-body-tiny leading-tight font-semibold"
    :class="STYLES[variant].badgeClass"
  >
    {{ STYLES[variant].label }}
  </span>
</template>
