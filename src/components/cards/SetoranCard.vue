<script setup lang="ts">
import { computed } from "vue";
import AppIcon from "../AppIcon.vue";
import AvatarPhoto from "../AvatarPhoto.vue";
import LihatDetailButton from "../LihatDetailButton.vue";
import { SETORAN_BADGES, formatBerat, resolveSetoranStage } from "../../constants/setoran";
import type { Setoran } from "../../stores/setoranStore";
import { formatRibuan } from "../../utils/formatters";

const props = withDefaults(
  defineProps<{
    setoran: Setoran;
    /** Kunci tombol selama setoran ini sedang dihapus. */
    busy?: boolean;
  }>(),
  { busy: false },
);

defineEmits<{ detail: []; edit: []; delete: [] }>();

/**
 * Setoran yang sudah selesai tidak bisa diubah atau dihapus lagi: nominalnya
 * sudah masuk ke saldo warga. Karena itu tombol Edit & hapus cuma ada saat
 * masih diproses.
 */
const isProses = computed(() => resolveSetoranStage(props.setoran.status) === "proses");
const badge = computed(() => SETORAN_BADGES[isProses.value ? "proses" : "selesai"]);

const jenisSampah = computed(
  () => props.setoran.deskripsi?.trim() || props.setoran.category_name || "-",
);
const berat = computed(() => formatBerat(props.setoran.berat));
</script>

<template>
  <article class="rounded-2xl border border-secondary-600 bg-secondary-50">
    <div class="flex items-center gap-3 px-4 pt-3 pb-4">
      <AvatarPhoto class="size-14" />

      <div class="min-w-0 flex-1">
        <div class="flex items-start justify-between gap-2">
          <h3 class="truncate text-h5 font-extrabold text-neutral-900">
            {{ setoran.nama_warga || "-" }}
          </h3>

          <div class="flex shrink-0 items-center gap-2 pt-1">
            <span
              class="rounded-full border px-2 py-px text-body-tiny leading-tight font-semibold"
              :class="badge.badgeClass"
            >
              {{ badge.label }}
            </span>

            <button
              v-if="isProses"
              type="button"
              class="-m-1 cursor-pointer rounded-lg p-1 text-orange-600 transition-colors duration-200 hover:bg-orange-50 hover:text-orange-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 disabled:pointer-events-none disabled:opacity-50"
              :aria-label="`Hapus setoran ${setoran.nama_warga}`"
              :disabled="busy"
              @click="$emit('delete')"
            >
              <AppIcon name="trashRounded" class="size-7" />
            </button>
          </div>
        </div>

        <div class="flex items-end justify-between gap-2">
          <div class="min-w-0">
            <p class="truncate text-body-reg text-neutral-900">{{ jenisSampah }}</p>
            <p class="flex gap-6 text-body-tiny font-bold text-neutral-900">
              <span class="truncate">{{ setoran.category_name || "-" }}</span>
              <span v-if="!isProses" class="shrink-0">{{ berat }}</span>
            </p>
          </div>

          <p
            class="shrink-0 pb-3 text-body-md leading-tight font-bold"
            :class="isProses ? 'text-primary-800' : 'text-primary-700'"
          >
            <template v-if="isProses">{{ berat }}</template>
            <template v-else>+Rp {{ formatRibuan(setoran.nominal) }}</template>
          </p>
        </div>
      </div>
    </div>

    <div
      class="flex items-center justify-between border-t border-secondary-600 px-4 py-2"
    >
      <LihatDetailButton @click="$emit('detail')" />

      <button
        v-if="isProses"
        type="button"
        class="cursor-pointer rounded-full bg-sky-400 px-6 py-1 text-body-sm font-semibold text-white transition-colors duration-200 hover:bg-sky-500 active:bg-sky-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
        :aria-label="`Edit setoran ${setoran.nama_warga}`"
        :disabled="busy"
        @click="$emit('edit')"
      >
        Edit
      </button>
    </div>
  </article>
</template>
