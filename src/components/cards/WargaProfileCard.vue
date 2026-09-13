<script setup lang="ts">
import { computed } from "vue";
import AccountBadge from "../AccountBadge.vue";
import type { AccountBadgeVariant } from "../AccountBadge.vue";
import AvatarPhoto from "../AvatarPhoto.vue";
import { normalizeRole } from "../../constants/wargaAccess";
import type { Warga } from "../../stores/wargaStore";
import { formatRupiah, formatTanggal } from "../../utils/formatters";
// Kedua ikon sudah membawa kotak & warnanya sendiri, jadi dipasang lewat <img>
// seperti ikon transaksi, bukan AppIcon yang satu warna.
import iconJadikanAdmin from "../../assets/icon-jadikan-admin.svg";
import iconBlokirWarga from "../../assets/icon-blokir-warga.svg";

const props = withDefaults(
  defineProps<{
    warga: Warga;
    /** Aturan tiap flag ada di constants/wargaAccess.ts. */
    showRoleBadge?: boolean;
    showBlockedBadge?: boolean;
    canManageRole?: boolean;
    canBlock?: boolean;
    /** Kunci tombol selama aksi sebelumnya masih diproses. */
    busy?: boolean;
  }>(),
  {
    showRoleBadge: false,
    showBlockedBadge: false,
    canManageRole: false,
    canBlock: false,
    busy: false,
  },
);

defineEmits<{ "toggle-role": []; "toggle-block": [] }>();

const role = computed(() => normalizeRole(props.warga.role));

const badges = computed(() => {
  const list: AccountBadgeVariant[] = [];
  if (props.showRoleBadge) list.push(role.value);
  if (props.showBlockedBadge && props.warga.is_blocked) list.push("diblokir");
  return list;
});

const BERAT_FORMATTER = new Intl.NumberFormat("id-ID", {
  maximumFractionDigits: 2,
});

const totalSampah = computed(
  () => `${BERAT_FORMATTER.format(props.warga.total_sampah ?? 0)} kg`,
);

const actionClass =
  "cursor-pointer rounded-[13px] transition-transform duration-200 active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-60";
</script>

<template>
  <section
    class="relative rounded-3xl border border-neutral-200 bg-secondary-50 px-4 pt-5 pb-6"
  >
    <div
      v-if="badges.length"
      class="absolute top-4 left-4 flex flex-col items-start gap-1.5"
    >
      <AccountBadge v-for="badge in badges" :key="badge" :variant="badge" />
    </div>

    <div
      v-if="canManageRole || canBlock"
      class="absolute top-4 right-4 flex flex-col gap-4"
    >
      <button
        v-if="canManageRole"
        type="button"
        :class="actionClass"
        :aria-label="role === 'admin' ? 'Cabut akses admin' : 'Jadikan admin'"
        :disabled="busy"
        @click="$emit('toggle-role')"
      >
        <img :src="iconJadikanAdmin" alt="" aria-hidden="true" class="size-11" />
      </button>

      <button
        v-if="canBlock"
        type="button"
        :class="actionClass"
        :aria-label="warga.is_blocked ? 'Buka blokir warga' : 'Blokir warga'"
        :disabled="busy"
        @click="$emit('toggle-block')"
      >
        <img :src="iconBlokirWarga" alt="" aria-hidden="true" class="size-11" />
      </button>
    </div>

    <div class="flex flex-col items-center text-center">
      <AvatarPhoto
        :src="warga.avatar_base64 ?? ''"
        :alt="`Foto ${warga.name}`"
        class="size-26"
      />

      <!-- px-12: jangan sampai nama panjang menabrak kolom badge & tombol. -->
      <div class="mt-2 w-full px-12">
        <h2 class="truncate text-h5 font-bold text-neutral-900">
          {{ warga.name }}
        </h2>
      </div>
      <p class="w-full truncate text-body-sm text-neutral-900">{{ warga.email }}</p>
      <p class="text-body-tiny font-semibold text-neutral-600">{{ warga.phone }}</p>

      <div
        class="mt-1 flex w-full justify-between gap-3 px-4 text-body-tiny text-neutral-500"
      >
        <span>Bergabung sejak</span>
        <span>{{ formatTanggal(warga.joined_at) || "-" }}</span>
      </div>

      <dl class="mt-3 flex w-full justify-center gap-4 text-left">
        <div
          class="w-28 rounded-lg border border-primary-800 bg-primary-700 px-2.5 py-1.5 text-white"
        >
          <dt class="text-body-tiny leading-tight">Total saldo</dt>
          <dd class="mt-0.5 truncate text-body-sm font-bold">
            {{ formatRupiah(warga.total_saldo) }}
          </dd>
        </div>

        <div
          class="w-28 rounded-lg border border-secondary-700 bg-secondary-600 px-2.5 py-1.5 text-white"
        >
          <dt class="text-body-tiny leading-tight">Total sampah</dt>
          <dd class="mt-0.5 truncate text-body-sm font-bold">{{ totalSampah }}</dd>
        </div>
      </dl>
    </div>
  </section>
</template>
