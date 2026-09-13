<script setup lang="ts">
import AccountBadge from "../AccountBadge.vue";
import AvatarPhoto from "../AvatarPhoto.vue";
import type { Warga } from "../../stores/wargaStore";
import { formatRupiah } from "../../utils/formatters";

defineProps<{
  warga: Warga;
  /** Badge "Diblokir"; aturan siapa yang boleh lihat ada di constants/wargaAccess.ts. */
  showBlockedBadge?: boolean;
}>();

defineEmits<{ open: [] }>();
</script>

<template>
  <button
    type="button"
    class="flex w-full cursor-pointer items-center gap-3 rounded-2xl border border-neutral-200 bg-secondary-50 px-3 py-3 text-left transition-colors duration-200 hover:bg-neutral-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
    @click="$emit('open')"
  >
    <AvatarPhoto :src="warga.avatar_base64 ?? ''" alt="" class="size-12" />

    <div class="min-w-0 flex-1">
      <p class="truncate text-body-sm font-bold text-neutral-900">
        {{ warga.name }}
      </p>
      <p class="truncate text-body-tiny text-neutral-600">{{ warga.phone }}</p>
    </div>

    <div class="flex shrink-0 flex-col items-end gap-1">
      <AccountBadge v-if="showBlockedBadge && warga.is_blocked" variant="diblokir" />
      <p class="text-body-sm font-bold text-primary-800">
        {{ formatRupiah(warga.total_saldo) }}
      </p>
    </div>
  </button>
</template>
