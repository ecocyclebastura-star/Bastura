import { defineStore } from "pinia";
import type { ToastVariant } from "../composables/useToast";
import { danaUntukWarga, splitProportional } from "../constants/setoran";
import { invokeCommand } from "../utils/invokeCommand";

/**
 * Satu setoran sampah warga, dicatat admin waktu sampahnya diterima.
 *
 * Catatan: SEMUA command di store ini BELUM ADA di src-tauri. Bentuk data dan
 * nama command di bawah adalah usulan frontend -- samakan dengan backend
 * begitu command-nya dibuat. Selama belum ada, `invokeCommand` membalas
 * COMMAND_UNAVAILABLE dan halamannya menampilkan pesan "fitur belum tersedia".
 */
export interface Setoran {
  id_setoran: string;
  id_user: string;
  nama_warga: string;
  category_id: number | null;
  /** Nama kategori katalog, mis. "Plastik PET". */
  category_name: string | null;
  /** Keterangan bebas dari admin, mis. "Botol Bersih Biru". */
  deskripsi: string | null;
  /** Berat dalam kg. */
  berat: number;
  /** Bagian hasil penjualan dalam rupiah; kosong selama masih diproses. */
  nominal: number | null;
  status: string;
  tanggal_setoran: string;
}

/** Satu baris sampah di form Tambah/Edit Setoran. */
export interface SetoranItemInput {
  category_id: number;
  deskripsi: string;
  berat: number;
}

/** Balasan `get_bagi_hasil_preview_command`. */
interface BagiHasilPreview {
  /** Potongan bank sampah dalam persen, diatur super admin. */
  komisi_persen: number;
  /** Setoran berstatus diproses di rentang tanggal yang diminta. */
  setoran: Setoran[];
}

/** Satu warga di daftar pembagian beserta bagiannya. */
export interface AlokasiWarga {
  id_user: string;
  nama_warga: string;
  total_berat: number;
  setoran: Setoran[];
  /** Bagian warga ini dalam rupiah; bisa diubah admin lewat tombol +/-. */
  nominal: number;
}

/** Isian pembagian yang dibawa dari langkah Input Data sampai Konfirmasi. */
export interface BagiHasilDraft {
  total_dana: number;
  komisi_persen: number;
  /** "yyyy-mm-dd" */
  date_start: string;
  date_end: string;
  warga: AlokasiWarga[];
}

/** Kelompokkan setoran per warga, urut nama supaya daftarnya mudah dicari. */
function groupByWarga(items: readonly Setoran[]): Omit<AlokasiWarga, "nominal">[] {
  const groups = new Map<string, Omit<AlokasiWarga, "nominal">>();

  for (const item of items) {
    const group = groups.get(item.id_user) ?? {
      id_user: item.id_user,
      nama_warga: item.nama_warga,
      total_berat: 0,
      setoran: [],
    };
    group.total_berat += item.berat;
    group.setoran.push(item);
    groups.set(item.id_user, group);
  }

  return [...groups.values()].sort((a, b) => a.nama_warga.localeCompare(b.nama_warga, "id"));
}

/**
 * Bagi dana warga sebanding dengan berat setoran masing-masing. Dipakai
 * waktu daftar pembagian pertama dibuat dan tiap kali ada warga yang
 * dikeluarkan, supaya sisa dananya langsung terbagi habis lagi.
 */
function allocate<T extends { total_berat: number }>(
  warga: readonly T[],
  dana: number,
): (T & { nominal: number })[] {
  const shares = splitProportional(
    dana,
    warga.map((item) => item.total_berat),
  );
  return warga.map((item, index) => ({ ...item, nominal: shares[index] }));
}

export const useSetoranStore = defineStore("setoran", {
  state: () => ({
    /** Hasil daftar terakhir, dipakai form Edit tanpa menarik ulang. */
    items: [] as Setoran[],
    /** Chip yang aktif, disimpan di sini supaya tetap sama waktu balik dari form. */
    activeFilter: "",

    draft: null as BagiHasilDraft | null,

    /** Toast titipan untuk halaman Setoran, mis. setelah form disimpan. */
    flashMessage: "",
    flashVariant: "success" as ToastVariant,
  }),

  getters: {
    /** Jatah seluruh warga setelah dipotong komisi. */
    danaWarga: (state) =>
      state.draft ? danaUntukWarga(state.draft.total_dana, state.draft.komisi_persen) : 0,

    danaTerbagi: (state) =>
      state.draft?.warga.reduce((acc, item) => acc + item.nominal, 0) ?? 0,

    /** Negatif berarti admin membagikan lebih dari dana yang ada. */
    sisaDana(): number {
      return this.danaWarga - this.danaTerbagi;
    },
  },

  actions: {
    /* ============================ DAFTAR SETORAN ============================ */

    async list(search: string) {
      const result = await invokeCommand<Setoran[]>("get_admin_deposits_command", {
        searchQuery: search.trim() || null,
      });
      // Terbaru di atas, sama seperti daftar transaksi.
      this.items = [...result].sort(
        (a, b) => (Date.parse(b.tanggal_setoran) || 0) - (Date.parse(a.tanggal_setoran) || 0),
      );
      return this.items;
    },

    /** Cek yang sudah ada di memori dulu; tarik ulang kalau form dibuka lewat URL. */
    async findSetoran(id: string): Promise<Setoran | null> {
      const cached = this.items.find((item) => item.id_setoran === id);
      if (cached) return cached;

      const all = await this.list("");
      return all.find((item) => item.id_setoran === id) ?? null;
    },

    /** Satu kali simpan bisa berisi beberapa jenis sampah milik satu warga. */
    create(idUser: string, items: SetoranItemInput[]) {
      return invokeCommand<unknown>("create_deposit_command", {
        payload: { id_user: idUser, items },
      });
    },

    update(idSetoran: string, idUser: string, item: SetoranItemInput) {
      return invokeCommand<unknown>("update_deposit_command", {
        payload: { id_setoran: idSetoran, id_user: idUser, ...item },
      });
    },

    async remove(idSetoran: string) {
      await invokeCommand<unknown>("delete_deposit_command", { idSetoran });
      this.items = this.items.filter((item) => item.id_setoran !== idSetoran);
    },

    /* ============================== BAGI HASIL ============================== */

    /**
     * Langkah Input Data: ambil setoran yang menunggu hasil di rentang
     * tanggal itu, lalu siapkan draft pembagiannya. Draft baru dipasang ke
     * store setelah admin menekan Lanjutkan di ringkasan (`startDraft`).
     */
    async preview(totalDana: number, dateStart: string, dateEnd: string): Promise<BagiHasilDraft> {
      const result = await invokeCommand<BagiHasilPreview>("get_bagi_hasil_preview_command", {
        dateStart,
        dateEnd,
      });

      const komisi = result.komisi_persen ?? 0;
      return {
        total_dana: totalDana,
        komisi_persen: komisi,
        date_start: dateStart,
        date_end: dateEnd,
        warga: allocate(groupByWarga(result.setoran), danaUntukWarga(totalDana, komisi)),
      };
    },

    startDraft(draft: BagiHasilDraft) {
      this.draft = draft;
    },

    findAlokasi(idUser: string): AlokasiWarga | null {
      return this.draft?.warga.find((item) => item.id_user === idUser) ?? null;
    },

    setNominal(idUser: string, nominal: number) {
      const target = this.findAlokasi(idUser);
      if (target) target.nominal = Math.max(0, Math.floor(nominal));
    },

    /**
     * Keluarkan warga dari pembagian periode ini. Setorannya tetap tersimpan
     * (masih berstatus diproses), cuma tidak ikut dibagi sekarang. Dana yang
     * ditinggalkannya dibagi ulang ke warga yang tersisa sesuai berat.
     */
    removeAlokasi(idUser: string) {
      if (!this.draft) return;
      const remaining = this.draft.warga.filter((item) => item.id_user !== idUser);
      this.draft.warga = allocate(remaining, this.danaWarga);
    },

    /**
     * Kirim hasil pembagian. Bagian tiap warga dipecah lagi per setoran
     * sebanding beratnya, supaya tiap kartu setoran punya nominal sendiri
     * begitu statusnya selesai.
     */
    async distribute() {
      const draft = this.draft;
      if (!draft) return;

      await invokeCommand<unknown>("distribute_bagi_hasil_command", {
        payload: {
          total_dana: draft.total_dana,
          komisi_persen: draft.komisi_persen,
          date_start: draft.date_start,
          date_end: draft.date_end,
          allocations: draft.warga.map((warga) => {
            const perSetoran = splitProportional(
              warga.nominal,
              warga.setoran.map((item) => item.berat),
            );
            return {
              id_user: warga.id_user,
              nominal: warga.nominal,
              setoran: warga.setoran.map((item, index) => ({
                id_setoran: item.id_setoran,
                nominal: perSetoran[index],
              })),
            };
          }),
        },
      });

      this.draft = null;
    },

    clearDraft() {
      this.draft = null;
    },

    /* ================================ TOAST ================================ */

    setFlash(message: string, variant: ToastVariant = "success") {
      this.flashMessage = message;
      this.flashVariant = variant;
    },

    takeFlash() {
      const flash = { message: this.flashMessage, variant: this.flashVariant };
      this.flashMessage = "";
      return flash;
    },

    reset() {
      this.items = [];
      this.activeFilter = "";
      this.draft = null;
      this.flashMessage = "";
    },
  },

  // Draft pembagian ikut bertahan kalau webview di-refresh di tengah alur,
  // dan dibersihkan authStore.clearCachedData waktu logout.
  persist: {
    storage: sessionStorage,
  },
});
