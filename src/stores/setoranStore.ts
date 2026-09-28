import { defineStore } from "pinia";
import type { ToastVariant } from "../composables/useToast";
import { serverErrorCode } from "../constants/authErrors";
import { parseBerat, splitProportional } from "../constants/setoran";
import { byNewest, parseSetoranDeskripsi, resolveKind } from "../constants/transactions";
import { invokeCommand } from "../utils/invokeCommand";

/**
 * Satu setoran sampah warga, dicatat admin waktu sampahnya diterima.
 *
 * Daftar setoran dan alur bagi hasil sudah memakai command dari src-tauri.
 * Yang BELUM ADA cuma tambah/edit/hapus setoran (`create_deposit_command`,
 * `update_deposit_command`, `delete_deposit_command`); selama belum ada,
 * `invokeCommand` membalas COMMAND_UNAVAILABLE dan halamannya menampilkan
 * pesan "fitur belum tersedia".
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

/** Bentuk `TransactionItem` dari daftar global `get_all_transactions_admin_command`. */
interface AdminTransactionItem {
  id_transaksi: string;
  jenis_transaksi: string;
  deskripsi: string | null;
  nominal: number;
  status: string;
  tanggal_transaksi: string;
  name: string | null;
}

/**
 * Transaksi "Setoran Sampah" jadi kartu setoran. Rinciannya menyatu di
 * `deskripsi` ("<nama katalog>/<berat>kg"), sama seperti yang dibaca
 * splitbill_service.rs waktu menghitung bagian per setoran.
 *
 * Daftar global tidak membawa id warga maupun id kategori, jadi keduanya
 * dibiarkan kosong.
 */
function toSetoran(item: AdminTransactionItem): Setoran {
  const detail = parseSetoranDeskripsi(item.deskripsi);
  const berat = parseBerat(detail.berat.replace(/\s*kg$/i, ""));

  return {
    id_setoran: item.id_transaksi,
    id_user: "",
    nama_warga: item.name ?? "",
    category_id: null,
    category_name: detail.jenisSampah || null,
    deskripsi: null,
    berat: Number.isNaN(berat) ? 0 : berat,
    // Nominal 0 = hasil penjualannya belum dibagikan.
    nominal: item.nominal || null,
    status: item.status,
    tanggal_setoran: item.tanggal_transaksi,
  };
}

/** Bentuk `AlokasiPreviewItem` dari src-tauri/src/models/splitbill_model.rs. */
interface AlokasiPreviewItem {
  id_user: string;
  name: string;
  email: string;
  total_weight: number;
  total_value: number;
  estimasi_alokasi: number;
}

/** Bentuk `InitSplitBillData`, balasan `init_splitbill_command`. */
interface InitSplitBillData {
  /** Dana yang dibagikan ke warga, sudah dipotong pajak & biaya admin. */
  dana_setelah_pajak: number;
  pajak: number | null;
  admin_fee: number | null;
  alokasi_preview: AlokasiPreviewItem[];
}

/** Bentuk `SplitBillDetailItem`, balasan `get_user_splitbill_detail_command`. */
interface SplitBillDetailItem {
  id_transaksi: string;
  jenis_transaksi: string;
  deskripsi: string | null;
  /** Bagian setoran ini dari alokasi warganya. */
  nominal: number;
  status: string;
  tanggal_transaksi: string;
}

/** Satu warga di daftar pembagian beserta bagiannya. */
export interface AlokasiWarga {
  id_user: string;
  nama_warga: string;
  total_berat: number;
  /**
   * Estimasi awal dari backend, dipakai sebagai bobot waktu dana dibagi
   * ulang supaya perbandingannya tetap sama dengan hitungan server.
   */
  estimasi: number;
  /** Bagian warga ini dalam rupiah; bisa diubah admin lewat tombol +/-. */
  nominal: number;
}

/** Isian pembagian yang dibawa dari langkah Input Data sampai Konfirmasi. */
export interface BagiHasilDraft {
  total_dana: number;
  /** Jatah seluruh warga setelah dipotong pajak & biaya admin. */
  dana_warga: number;
  /** "yyyy-mm-dd" */
  date_start: string;
  date_end: string;
  warga: AlokasiWarga[];
  /**
   * Warga yang dikeluarkan admin dari pembagian periode ini. Disimpan supaya
   * bisa dikembalikan tanpa mengulang dari Input Data. Opsional karena draft
   * lama di sessionStorage belum punya field ini.
   */
  dikeluarkan?: AlokasiWarga[];
}

/** Satu setoran di halaman Detail Setoran bagi hasil. */
export interface RincianSetoran {
  id_transaksi: string;
  jenis_sampah: string;
  /** Berat apa adanya dari deskripsi, mis. "2kg". */
  berat: string;
  status: string;
  tanggal_transaksi: string;
  /** Bagian setoran ini dari `nominal` warganya saat ini. */
  bagian: number;
}

/**
 * Bagi dana warga sebanding dengan estimasi dari backend. Dipakai waktu
 * daftar pembagian pertama dibuat -- supaya jumlahnya pasti pas walau
 * pembulatan server meleset beberapa rupiah -- dan tiap kali ada warga yang
 * dikeluarkan, supaya sisa dananya langsung terbagi habis lagi.
 */
function allocate<T extends { estimasi: number }>(
  warga: readonly T[],
  dana: number,
): (T & { nominal: number })[] {
  const shares = splitProportional(
    dana,
    warga.map((item) => item.estimasi),
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
    /** Jatah seluruh warga setelah dipotong pajak & biaya admin. */
    danaWarga: (state) => state.draft?.dana_warga ?? 0,

    /** Potongan dari total dana dalam persen, untuk label di kartu dana. */
    potonganPersen: (state) =>
      state.draft && state.draft.total_dana > 0
        ? ((state.draft.total_dana - state.draft.dana_warga) / state.draft.total_dana) * 100
        : 0,

    danaTerbagi: (state) =>
      state.draft?.warga.reduce((acc, item) => acc + item.nominal, 0) ?? 0,

    /** Negatif berarti admin membagikan lebih dari dana yang ada. */
    sisaDana(): number {
      return this.danaWarga - this.danaTerbagi;
    },
  },

  actions: {
    /* ============================ DAFTAR SETORAN ============================ */

    /**
     * Setoran diambil dari riwayat transaksi global. Command-nya mengembalikan
     * semua transaksi sekaligus tanpa filter, jadi penyaringan jenis dan
     * pencarian nama dikerjakan di sini.
     */
    async list(search: string) {
      const result = await invokeCommand<AdminTransactionItem[]>(
        "get_all_transactions_admin_command",
      );
      const query = search.trim().toLowerCase();

      // Terbaru di atas, sama seperti daftar transaksi.
      this.items = result
        .filter((item) => resolveKind(item.jenis_transaksi) === "setoran")
        .filter((item) => !query || (item.name ?? "").toLowerCase().includes(query))
        .sort(byNewest)
        .map(toSetoran);
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
     * Langkah Input Data: minta backend menghitung pembagian awal untuk
     * rentang tanggal itu, lalu siapkan draft-nya. Draft baru dipasang ke
     * store setelah admin menekan Lanjutkan di ringkasan (`startDraft`).
     *
     * Command ini juga mengisi cache SQLite yang dibaca `fetchRincian`, jadi
     * harus dipanggil lebih dulu.
     */
    async preview(totalDana: number, dateStart: string, dateEnd: string): Promise<BagiHasilDraft> {
      let result: InitSplitBillData;
      try {
        result = await invokeCommand<InitSplitBillData>("init_splitbill_command", {
          totalDana,
          dateStart,
          dateEnd,
        });
      } catch (error) {
        // Server membalas 404 kalau periode itu tidak punya setoran. Itu
        // bukan kegagalan: ringkasannya cukup menampilkan "0 warga" beserta
        // saran memilih rentang lain, sesuai desain.
        if (serverErrorCode(error) !== "NO_WARGA_FOUND") throw error;
        result = { dana_setelah_pajak: 0, pajak: null, admin_fee: null, alokasi_preview: [] };
      }

      const danaWarga = Math.max(0, result.dana_setelah_pajak);
      const warga = result.alokasi_preview
        .map((item) => ({
          id_user: item.id_user,
          nama_warga: item.name,
          total_berat: item.total_weight,
          estimasi: item.estimasi_alokasi,
        }))
        // Urut nama supaya daftarnya mudah dicari.
        .sort((a, b) => a.nama_warga.localeCompare(b.nama_warga, "id"));

      return {
        total_dana: totalDana,
        dana_warga: danaWarga,
        date_start: dateStart,
        date_end: dateEnd,
        warga: allocate(warga, danaWarga),
        dikeluarkan: [],
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
     * ditinggalkannya dibagi ulang ke warga yang tersisa.
     */
    removeAlokasi(idUser: string) {
      if (!this.draft) return;
      const target = this.findAlokasi(idUser);
      if (!target) return;

      const remaining = this.draft.warga.filter((item) => item.id_user !== idUser);
      this.draft.warga = allocate(remaining, this.danaWarga);
      this.draft.dikeluarkan = [...(this.draft.dikeluarkan ?? []), target];
    },

    /**
     * Kembalikan warga yang tadi dikeluarkan. Bagiannya mulai dari Rp0 supaya
     * nominal yang sudah diatur manual untuk warga lain tidak ikut berubah;
     * admin tinggal memindahkan dana ke warga ini lewat tombol +/-.
     */
    restoreAlokasi(idUser: string) {
      if (!this.draft) return;
      const dikeluarkan = this.draft.dikeluarkan ?? [];
      const target = dikeluarkan.find((item) => item.id_user === idUser);
      if (!target) return;

      this.draft.dikeluarkan = dikeluarkan.filter((item) => item.id_user !== idUser);
      // Urut nama lagi, sama seperti daftar dari Input Data.
      this.draft.warga = [...this.draft.warga, { ...target, nominal: 0 }].sort((a, b) =>
        a.nama_warga.localeCompare(b.nama_warga, "id"),
      );
    },

    /**
     * Rincian setoran satu warga di periode draft. Bagian per setoran
     * dihitung backend dari `nominal` warga itu saat ini.
     */
    async fetchRincian(idUser: string): Promise<RincianSetoran[]> {
      const target = this.findAlokasi(idUser);
      if (!target) return [];

      const result = await invokeCommand<SplitBillDetailItem[]>(
        "get_user_splitbill_detail_command",
        { targetUserId: idUser, alokasiBaru: target.nominal },
      );

      return [...result].sort(byNewest).map((item) => {
        const detail = parseSetoranDeskripsi(item.deskripsi);
        return {
          id_transaksi: item.id_transaksi,
          jenis_sampah: detail.jenisSampah,
          berat: detail.berat,
          status: item.status,
          tanggal_transaksi: item.tanggal_transaksi,
          bagian: item.nominal,
        };
      });
    },

    /** Kirim hasil pembagian; backend yang memecahnya lagi per setoran. */
    async distribute() {
      const draft = this.draft;
      if (!draft) return;

      await invokeCommand<string>("confirm_splitbill_command", {
        totalDana: draft.total_dana,
        dateStart: draft.date_start,
        dateEnd: draft.date_end,
        alokasi: draft.warga.map((warga) => ({
          id_user: warga.id_user,
          final_amount: warga.nominal,
        })),
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
