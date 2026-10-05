<script setup lang="ts">
import { computed, onMounted, ref, useId } from "vue";
import { useRoute, useRouter } from "vue-router";
import AlertToast from "../../components/AlertToast.vue";
import AvatarPhoto from "../../components/AvatarPhoto.vue";
import AppIcon from "../../components/AppIcon.vue";
import BaseButton from "../../components/BaseButton.vue";
import PageHeader from "../../components/PageHeader.vue";
import SearchBar from "../../components/SearchBar.vue";
import WargaListItem from "../../components/cards/WargaListItem.vue";
import { resolveAuthError } from "../../constants/authErrors";
import {
  formatJumlah,
  normalizeUnit,
  parseBerat,
  resolveSetoranStage,
} from "../../constants/setoran";
import type { SetoranUnit } from "../../constants/setoran";
import { resolveWasteCategory } from "../../constants/wasteCatalog";
import { useSearchableList } from "../../composables/useSearchableList";
import { useToast } from "../../composables/useToast";
import { PartialSetoranError, useSetoranStore } from "../../stores/setoranStore";
import type { SetoranItemInput } from "../../stores/setoranStore";
import { useWargaStore } from "../../stores/wargaStore";
import type { Warga } from "../../stores/wargaStore";
import { useWasteStore } from "../../stores/wasteStore";
import type { CatalogItem } from "../../stores/wasteStore";
import { formatRupiah } from "../../utils/formatters";

const route = useRoute();
const router = useRouter();
const setoranStore = useSetoranStore();
const wargaStore = useWargaStore();
const wasteStore = useWasteStore();
const { toastMessage, toastVariant, showToast } = useToast();

const uid = useId();

/** Form yang sama dipakai tambah & edit; edit selalu membawa :id. */
const isEdit = computed(() => route.name === "admin-setoran-edit");
const idSetoran = computed(() => String(route.params.id ?? ""));

/* ================================= WARGA ================================= */

/** Warga pemilik setoran. Saldo null = datanya belum/tidak bisa diambil. */
interface PickedWarga {
  id: string;
  name: string;
  phone: string;
  total_saldo: number | null;
}

const selectedWarga = ref<PickedWarga | null>(null);

const {
  searchTerm,
  items: wargaResults,
  loading: wargaLoading,
  errorMessage: wargaError,
  submit: submitWargaSearch,
  clearSearch: clearWargaSearch,
} = useSearchableList<Warga>((search) => wargaStore.list(search), {
  fallbackError: "Gagal memuat data warga. Coba lagi sebentar lagi.",
});

/** Hasil pencarian cuma muncul selama admin mengetik nama. */
const isSearchingWarga = computed(() => searchTerm.value.trim().length > 0);

/** Dibatasi supaya form di bawahnya tidak terdorong terlalu jauh. */
const MAX_RESULTS = 5;

function pickWarga(warga: Warga) {
  selectedWarga.value = {
    id: warga.id,
    name: warga.name,
    phone: warga.phone,
    total_saldo: warga.total_saldo,
  };
  clearWargaSearch();
}

/* ============================= JENIS SAMPAH ============================= */

/**
 * Pilihannya item katalog (`id_waste`), bukan kategori: server mencatat
 * setoran per jenis sampah spesifik, mis. "Botol Bersih Biru". Dikelompokkan
 * per kategori supaya daftarnya tetap mudah dicari.
 */
const catalog = ref<CatalogItem[]>([]);
const catalogLoading = ref(true);
/** Item setoran lama yang sudah tidak ada di katalog, supaya tetap terpilih. */
const extraOption = ref<{ id: string; label: string } | null>(null);

const catalogGroups = computed(() => {
  const groups = new Map<string, { id: string; label: string }[]>();
  for (const item of catalog.value) {
    const group = resolveWasteCategory(item.category_name);
    const list = groups.get(group) ?? [];
    list.push({ id: item.id_waste, label: item.name?.trim() || "Tanpa nama" });
    groups.set(group, list);
  }
  return [...groups]
    .sort(([a], [b]) => a.localeCompare(b, "id"))
    .map(([label, options]) => ({
      label,
      options: options.sort((a, b) => a.label.localeCompare(b.label, "id")),
    }));
});

async function loadCatalog() {
  catalogLoading.value = true;
  try {
    catalog.value = await wasteStore.listCatalog();
  } catch (error) {
    showToast(resolveAuthError(error, "Gagal memuat jenis sampah."), "error");
  } finally {
    catalogLoading.value = false;
  }
}

/** Form Edit menunggu katalog dulu supaya item setorannya bisa dicocokkan. */
const catalogReady = loadCatalog();

/** Cari id item katalog dari namanya; dipakai kalau detail setoran tidak tersedia. */
function findWasteIdByName(name: string | null): string {
  const target = name?.trim().toLowerCase();
  if (!target) return "";
  return catalog.value.find((item) => item.name?.trim().toLowerCase() === target)?.id_waste ?? "";
}

/* ================================ SAMPAH ================================ */

/** Isian mentah satu baris sampah; berat masih string supaya koma bisa diketik. */
interface ItemDraft {
  key: number;
  wasteId: string;
  deskripsi: string;
  berat: string;
  /** Satuan dari detail setoran; dipakai kalau item-nya tidak ada di katalog. */
  unit: SetoranUnit;
}

let nextKey = 0;
const emptyItem = (): ItemDraft => ({
  key: nextKey++,
  wasteId: "",
  deskripsi: "",
  berat: "",
  unit: "kg",
});

/** Satuan baris ini mengikuti item katalog yang dipilih: kg atau per buah (pc). */
function unitOf(item: ItemDraft): SetoranUnit {
  const found = catalog.value.find((entry) => entry.id_waste === item.wasteId);
  return found ? normalizeUnit(found.unit) : item.unit;
}

const items = ref<ItemDraft[]>([emptyItem()]);

function addItem() {
  items.value.push(emptyItem());
}

function removeItem(key: number) {
  items.value = items.value.filter((item) => item.key !== key);
}

/** Pesan salah berat baru muncul setelah ada isinya; kotak kosong itu wajar. */
function beratError(item: ItemDraft): string {
  if (!item.berat.trim()) return "";
  const value = parseBerat(item.berat);
  if (unitOf(item) === "pc") {
    if (!Number.isInteger(value) || value <= 0) return "Isi jumlah dengan bilangan bulat, mis. 3.";
    return "";
  }
  if (Number.isNaN(value)) return "Isi berat dengan angka, mis. 1,5.";
  if (value <= 0) return "Berat sampah harus lebih dari 0 kg.";
  return "";
}

function isItemValid(item: ItemDraft): boolean {
  return Boolean(item.wasteId) && Boolean(item.berat.trim()) && !beratError(item);
}

/** Total per satuan; item per buah tidak bisa dijumlah dengan kilogram. */
function totalOf(unit: SetoranUnit): number {
  return items.value.reduce((acc, item) => {
    if (unitOf(item) !== unit) return acc;
    const value = parseBerat(item.berat);
    return Number.isNaN(value) || value <= 0 ? acc : acc + value;
  }, 0);
}

const totalLabel = computed(() => {
  const kg = totalOf("kg");
  const pc = totalOf("pc");
  if (pc === 0) return formatJumlah(kg, "kg", true);
  if (kg === 0) return formatJumlah(pc, "pc", true);
  return `${formatJumlah(kg, "kg", true)} + ${formatJumlah(pc, "pc", true)}`;
});

const hasPcItem = computed(() => items.value.some((item) => unitOf(item) === "pc"));

/* ================================= EDIT ================================= */

const loadingSetoran = ref(false);
const loadError = ref("");
/** Setoran yang sudah selesai tidak boleh diubah lagi. */
const locked = ref(false);

async function loadSetoran() {
  loadingSetoran.value = true;
  loadError.value = "";

  try {
    const setoran = await setoranStore.findSetoran(idSetoran.value);
    if (!setoran) {
      loadError.value = "Data setoran tidak ditemukan. Mungkin sudah dihapus.";
      return;
    }

    locked.value = resolveSetoranStage(setoran.status) === "selesai";

    // Daftar transaksi tidak membawa id warga & id item katalog; detail
    // setoran yang melengkapinya. Kalau detailnya gagal dimuat, item katalog
    // dicocokkan lewat nama yang tertulis di deskripsi transaksi.
    const [detail] = await Promise.all([
      setoranStore.fetchDetail(setoran.id_setoran).catch(() => null),
      catalogReady,
    ]);
    const idUser = detail?.id_user || setoran.id_user;
    const wasteId = detail?.id_waste || findWasteIdByName(setoran.category_name);

    // Item lama yang sudah dihapus dari katalog tetap bisa tampil terpilih.
    if (wasteId && !catalog.value.some((item) => item.id_waste === wasteId)) {
      extraOption.value = {
        id: wasteId,
        label: detail?.nama_sampah || setoran.category_name || "Jenis sampah lama",
      };
    }

    items.value = [
      {
        key: nextKey++,
        wasteId,
        deskripsi: detail?.deskripsi || setoran.deskripsi || "",
        berat: String(detail?.berat ?? setoran.berat).replace(".", ","),
        unit: detail?.unit ?? setoran.unit ?? "kg",
      },
    ];

    const cached = idUser ? wargaStore.findCached(idUser) : null;
    selectedWarga.value = cached
      ? { id: cached.id, name: cached.name, phone: cached.phone, total_saldo: cached.total_saldo }
      : {
          id: idUser,
          name: detail?.nama_warga || setoran.nama_warga,
          phone: detail?.phone ?? "",
          total_saldo: null,
        };

    // Nomor HP & saldo tidak ikut di data setoran, jadi dilengkapi belakangan.
    if (!cached && idUser) {
      wargaStore
        .fetchDetail(idUser)
        .then((warga) => {
          if (selectedWarga.value?.id === warga.id) pickWarga(warga);
        })
        .catch(() => {});
    }
  } catch (error) {
    loadError.value = resolveAuthError(error, "Gagal memuat data setoran.");
  } finally {
    loadingSetoran.value = false;
  }
}

/* ================================ SIMPAN ================================ */

const saving = ref(false);

const canSubmit = computed(
  () =>
    Boolean(selectedWarga.value) &&
    items.value.length > 0 &&
    items.value.every(isItemValid) &&
    !locked.value,
);

function toInput(item: ItemDraft): SetoranItemInput {
  return {
    id_waste: item.wasteId,
    deskripsi: item.deskripsi.trim(),
    berat: parseBerat(item.berat),
  };
}

function goBack() {
  if (window.history.state?.back) router.back();
  else router.replace({ name: "admin-setoran" });
}

async function handleSubmit() {
  const warga = selectedWarga.value;
  if (!warga || !canSubmit.value || saving.value) return;

  saving.value = true;
  try {
    if (isEdit.value) {
      await setoranStore.update(idSetoran.value, toInput(items.value[0]));
      setoranStore.setFlash("Perubahan berhasil disimpan.");
    } else {
      await setoranStore.create(warga.id, items.value.map(toInput));
      setoranStore.setFlash("Data setoran warga berhasil disimpan.");
    }
    goBack();
  } catch (error) {
    if (error instanceof PartialSetoranError) {
      // Baris yang sudah tersimpan dibuang dari form supaya tidak terkirim dua kali.
      items.value = items.value.slice(error.saved);
      const reason = resolveAuthError(error.cause, "Sisanya gagal disimpan, coba simpan lagi.");
      showToast(`${error.saved} jenis sampah sudah tersimpan. ${reason}`, "error");
      return;
    }
    // Admin tetap di form supaya isiannya tidak perlu diketik ulang.
    showToast(resolveAuthError(error, "Perubahan gagal disimpan."), "error");
  } finally {
    saving.value = false;
  }
}

onMounted(() => {
  if (isEdit.value) loadSetoran();
});

const fieldClass =
  "w-full rounded-xl border border-primary-700 bg-white px-4 py-3 text-body-sm text-neutral-900 placeholder:text-neutral-400 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 disabled:bg-neutral-100";
const labelClass = "text-body-reg font-medium text-neutral-900";
</script>

<template>
  <main class="mx-auto flex w-full max-w-sm flex-col gap-4 px-6 pt-safe">
    <PageHeader :title="isEdit ? 'Edit Setoran' : 'Tambah Setoran'" fallback="admin-setoran" />

    <div
      v-if="loadingSetoran"
      class="flex flex-col gap-4"
      aria-hidden="true"
    >
      <div class="h-20 animate-pulse rounded-2xl bg-neutral-200" />
      <div class="h-72 animate-pulse rounded-2xl bg-neutral-200" />
    </div>

    <div
      v-else-if="loadError"
      class="rounded-2xl border border-red-200 bg-red-50 p-4"
      role="alert"
    >
      <p class="text-body-sm text-red-700">{{ loadError }}</p>
      <button
        type="button"
        class="mt-3 cursor-pointer rounded-full bg-red-600 px-4 py-2 text-body-sm font-bold text-white transition-colors duration-200 hover:bg-red-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
        @click="loadSetoran"
      >
        Coba Lagi
      </button>
    </div>

    <form v-else class="flex flex-col gap-4" @submit.prevent="handleSubmit">
      <p
        v-if="locked"
        class="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-body-sm text-amber-800"
        role="status"
      >
        Hasil setoran ini sudah dibagikan ke saldo warga, jadi datanya tidak bisa diubah lagi.
      </p>

      <!-- ============================ WARGA ============================ -->
      <!-- Pemilik setoran tidak bisa dipindah lewat edit, jadi pencariannya
           cuma ada di mode tambah. -->
      <SearchBar
        v-if="!isEdit"
        v-model="searchTerm"
        placeholder="Cari nama warga"
        label="Cari nama warga pemilik setoran"
        :loading="wargaLoading"
        @submit="submitWargaSearch"
        @clear="clearWargaSearch"
      />

      <div v-if="isSearchingWarga" class="flex flex-col gap-2" aria-live="polite">
        <div v-if="wargaLoading" class="flex flex-col gap-2" aria-hidden="true">
          <div v-for="n in 2" :key="n" class="h-18 animate-pulse rounded-2xl bg-neutral-200" />
        </div>

        <p v-else-if="wargaError" class="text-body-sm text-red-700" role="alert">
          {{ wargaError }}
        </p>

        <p v-else-if="wargaResults.length === 0" class="px-1 text-body-sm text-neutral-600">
          Warga tidak ditemukan. Coba periksa lagi ejaan namanya.
        </p>

        <template v-else>
          <WargaListItem
            v-for="warga in wargaResults.slice(0, MAX_RESULTS)"
            :key="warga.id"
            :warga="warga"
            @open="pickWarga(warga)"
          />
        </template>
      </div>

      <section
        v-if="selectedWarga"
        class="flex items-center gap-3 rounded-2xl border border-neutral-200 bg-neutral-100 px-4 py-3"
        aria-label="Warga pemilik setoran"
      >
        <AvatarPhoto class="size-14" />
        <div class="min-w-0 flex-1">
          <p class="truncate text-body-sm font-bold text-neutral-900">{{ selectedWarga.name }}</p>
          <p class="truncate text-body-tiny text-neutral-600">{{ selectedWarga.phone || "-" }}</p>
        </div>
        <p class="shrink-0 text-body-sm font-bold text-primary-800">
          {{ selectedWarga.total_saldo === null ? "-" : formatRupiah(selectedWarga.total_saldo) }}
        </p>
      </section>

      <p
        v-else-if="!isSearchingWarga"
        class="rounded-2xl border border-dashed border-neutral-300 px-4 py-4 text-center text-body-sm text-neutral-600"
      >
        Cari lalu pilih warga yang menyetorkan sampah.
      </p>

      <!-- =========================== SAMPAH =========================== -->
      <header class="mt-2 flex items-center justify-between">
        <h2 class="text-h5 font-extrabold text-neutral-900">Detail Setoran</h2>

        <!-- Satu setoran yang diedit = satu jenis sampah, jadi tombolnya
             cuma ada di mode tambah. -->
        <button
          v-if="!isEdit"
          type="button"
          class="-mr-1 flex size-10 cursor-pointer items-center justify-center rounded-full text-primary-500 transition-colors duration-200 hover:bg-primary-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
          aria-label="Tambah jenis sampah"
          @click="addItem"
        >
          <svg class="size-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true">
            <path d="M12 5v14M5 12h14" />
          </svg>
        </button>
      </header>

      <fieldset
        v-for="(item, index) in items"
        :key="item.key"
        class="flex flex-col gap-4 rounded-2xl bg-neutral-100 px-4 pt-4 pb-6"
        :aria-label="`Sampah ${index + 1}`"
        :disabled="locked || saving"
      >
        <div v-if="items.length > 1" class="-mb-2 flex items-center justify-between">
          <p class="text-body-sm font-bold text-neutral-600" aria-hidden="true">
            Sampah {{ index + 1 }}
          </p>
          <button
            type="button"
            class="-m-1 cursor-pointer rounded-lg p-1 text-orange-600 transition-colors duration-200 hover:bg-orange-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
            :aria-label="`Hapus sampah ${index + 1}`"
            @click="removeItem(item.key)"
          >
            <AppIcon name="trashRounded" class="size-6" />
          </button>
        </div>

        <div class="flex flex-col gap-1.5">
          <label :for="`${uid}-jenis-${item.key}`" :class="labelClass">Jenis Sampah</label>
          <div class="relative">
            <select
              :id="`${uid}-jenis-${item.key}`"
              v-model="item.wasteId"
              :class="[fieldClass, 'cursor-pointer appearance-none pr-12', item.wasteId ? '' : 'text-neutral-400']"
              required
            >
              <option value="" disabled>
                {{ catalogLoading ? "Memuat jenis sampah..." : "Pilih Jenis Sampah" }}
              </option>
              <option v-if="extraOption" :value="extraOption.id" class="text-neutral-900">
                {{ extraOption.label }}
              </option>
              <optgroup
                v-for="group in catalogGroups"
                :key="group.label"
                :label="group.label"
                class="text-neutral-900"
              >
                <option v-for="option in group.options" :key="option.id" :value="option.id">
                  {{ option.label }}
                </option>
              </optgroup>
            </select>
            <svg
              class="pointer-events-none absolute inset-y-0 right-4 my-auto size-6 text-neutral-900"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2.5"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <path d="m6 9 6 6 6-6" />
            </svg>
          </div>
        </div>

        <div class="flex flex-col gap-1.5">
          <label :for="`${uid}-deskripsi-${item.key}`" :class="labelClass">Deskripsi</label>
          <input
            :id="`${uid}-deskripsi-${item.key}`"
            v-model="item.deskripsi"
            type="text"
            maxlength="100"
            autocomplete="off"
            placeholder="Tuliskan detailnya disini..."
            :class="fieldClass"
          />
        </div>

        <div class="flex flex-col gap-1.5">
          <label :for="`${uid}-berat-${item.key}`" :class="labelClass">
            {{ unitOf(item) === "pc" ? "Jumlah Sampah(pc)" : "Berat Sampah(kg)" }}
          </label>
          <div class="relative">
            <input
              :id="`${uid}-berat-${item.key}`"
              v-model="item.berat"
              type="text"
              :inputmode="unitOf(item) === 'pc' ? 'numeric' : 'decimal'"
              autocomplete="off"
              placeholder="0"
              required
              :aria-invalid="Boolean(beratError(item))"
              :aria-describedby="beratError(item) ? `${uid}-berat-error-${item.key}` : undefined"
              :class="[fieldClass, 'pr-14', beratError(item) ? 'border-red-500' : '']"
            />
            <span
              class="pointer-events-none absolute inset-y-0 right-4 flex items-center text-body-sm font-bold text-neutral-900"
              aria-hidden="true"
            >
              {{ unitOf(item) === "pc" ? "/Pc" : "/Kg" }}
            </span>
          </div>
          <p
            v-if="beratError(item)"
            :id="`${uid}-berat-error-${item.key}`"
            class="text-body-tiny font-medium text-red-600"
          >
            {{ beratError(item) }}
          </p>
        </div>
      </fieldset>

      <!-- ============================ SIMPAN ============================ -->
      <!-- Tab bar disembunyikan di halaman ini (meta hideTabBar), jadi bar
           Simpan menempati tempatnya. -->
      <div class="fixed inset-x-0 bottom-0 z-40">
        <div
          class="mx-auto flex w-full max-w-sm items-center justify-between gap-4 rounded-t-3xl border border-b-0 border-neutral-200 bg-white px-6 pt-4 pb-4 shadow-[0_-8px_24px_-12px_rgba(28,28,26,0.2)]"
        >
          <div>
            <p class="text-body-sm text-neutral-600">{{ hasPcItem ? "Total" : "Total Berat" }}</p>
            <p class="text-h5 font-extrabold text-neutral-900" aria-live="polite">
              {{ totalLabel }}
            </p>
          </div>

          <BaseButton
            class="w-40"
            type="submit"
            label="Simpan"
            rounded="xl"
            :block="false"
            :disabled="!canSubmit"
            :loading="saving"
          />
        </div>
        <div class="bg-white pb-safe" aria-hidden="true" />
      </div>
    </form>

    <AlertToast :message="toastMessage" :variant="toastVariant" />
  </main>
</template>
