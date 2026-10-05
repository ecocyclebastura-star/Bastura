import { defineStore } from "pinia";
import type { ToastVariant } from "../composables/useToast";
import { serverErrorCode } from "../constants/authErrors";
import { normalizeUnit, parseJumlahSetoran, splitProportional } from "../constants/setoran";
import type { SetoranUnit } from "../constants/setoran";
import { byNewest, parseSetoranDeskripsi, resolveKind } from "../constants/transactions";
import { invokeCommand } from "../utils/invokeCommand";

/**
 * Satu setoran sampah warga, dicatat admin waktu sampahnya diterima.
 *
 * Semua bagiannya sudah memakai command dari src-tauri: daftar dari riwayat
 * transaksi global, tambah/edit/hapus lewat `add/edit/delete_deposit_command`,
 * dan alur bagi hasil lewat command split bill.
 */
export interface Setoran {
  /** Sama dengan `id_transaksi`; server memakai id yang sama untuk setorannya. */
  id_setoran: string;
  id_user: string;
  nama_warga: string;
  /** Id item katalog (`id_waste`), mis. milik "Botol Bersih Biru". */
  id_waste: string | null;
  /** Nama item katalog, mis. "Botol Bersih Biru". */
  category_name: string | null;
  /** Keterangan bebas dari admin, mis. "Botol Bersih Biru". */
  deskripsi: string | null;
  /** Berat (kg) atau jumlah buah (pc), mengikuti `unit`. */
  berat: number;
  /** Opsional karena daftar lama di sessionStorage belum punya field ini. */
  unit?: SetoranUnit;
  /** Bagian hasil penjualan dalam rupiah; kosong selama masih diproses. */
  nominal: number | null;
  status: string;
  tanggal_setoran: string;
}

/** Satu baris sampah di form Tambah/Edit Setoran. */
export interface SetoranItemInput {
  /** Id item katalog, bukan id kategori. */
  id_waste: string;
  deskripsi: string;
  berat: number;
}

/** Bentuk `DepositDetailItem` dari src-tauri/src/models/transaction_model.rs. */
interface DepositDetailItem {
  id: string;
  /** Id item katalog (`id_waste`), walau namanya category_id. */
  category_id: string | null;
  category_name: string | null;
  catalog_name: string | null;
  description: string | null;
  /** Angka dalam string, mis. "10.00"; berupa jumlah buah kalau unit-nya "pc". */
  weight_kg: string | null;
  /** "kg", "pc", atau null (dianggap kg). */
  unit: string | null;
}

/** Bentuk `DepositDetailData`, balasan `get_deposit_detail_command`. */
interface DepositDetailData {
  id: string;
  user: { id: string | null; name: string | null; phone: string | null };
  items: DepositDetailItem[];
  total_weight: string | null;
  status: string;
  created_at: string;
  updated_at: string | null;
}

/** Isi lengkap satu setoran untuk mengisi form Edit. */
export interface SetoranDetail {
  id_user: string;
  nama_warga: string;
  phone: string;
  id_waste: string;
  /** Nama item katalog, mis. "Jerigen Biru". */
  nama_sampah: string;
  deskripsi: string;
  /** Berat (kg) atau jumlah (pc), mengikuti `unit`. */
  berat: number | null;
  unit: SetoranUnit;
}

function toDetail(data: DepositDetailData): SetoranDetail {
  // Satu setoran yang diedit = satu jenis sampah, jadi cukup item pertama.
  const item = data.items[0];
  const berat = Number.parseFloat(item?.weight_kg ?? "");
  return {
    id_user: data.user.id ?? "",
    nama_warga: data.user.name ?? "",
    phone: data.user.phone ?? "",
    id_waste: item?.category_id ?? "",
    nama_sampah: item?.catalog_name ?? "",
    deskripsi: item?.description ?? "",
    berat: Number.isFinite(berat) ? berat : null,
    unit: normalizeUnit(item?.unit),
  };
}

/** Satu tambah setoran gagal di tengah jalan; yang sebelumnya sudah tersimpan. */
export class PartialSetoranError extends Error {
  constructor(
    /** Jumlah baris yang sudah tersimpan sebelum gagal. */
    readonly saved: number,
    readonly cause: unknown,
  ) {
    super("Sebagian setoran gagal disimpan.");
  }
}

/**
 * Body `AddDepositRequest`/`EditDepositRequest`. Field item katalog di Rust
 * masih bernama `category_id` dan rencananya diganti jadi `waste_id`; sampai
 * itu beres, keduanya dikirim. serde mengabaikan field yang tidak dikenal,
 * jadi aman untuk struct versi lama maupun baru -- hapus `category_id`
 * setelah refaktornya masuk.
 */
function wasteField(idWaste: string) {
  return { waste_id: idWaste, category_id: idWaste };
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
 * `deskripsi` ("<nama katalog>/<berat>kg", atau "... / 3 pc" untuk item per
 * buah), sama seperti yang dibaca
 * splitbill_service.rs waktu menghitung bagian per setoran.
 *
 * Daftar global tidak membawa id warga maupun id kategori, jadi keduanya
 * dibiarkan kosong.
 */
function toSetoran(item: AdminTransactionItem): Setoran {
  const detail = parseSetoranDeskripsi(item.deskripsi);
  const jumlah = parseJumlahSetoran(detail.berat);

  return {
    id_setoran: item.id_transaksi,
    id_user: "",
    nama_warga: item.name ?? "",
    id_waste: null,
    category_name: detail.jenisSampah || null,
    deskripsi: null,
    berat: Number.isNaN(jumlah.value) ? 0 : jumlah.value,
    unit: jumlah.unit,
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

    /**
     * Satu kali simpan bisa berisi beberapa jenis sampah milik satu warga,
     * tapi command-nya menerima satu jenis per panggilan. Dikirim berurutan;
     * kalau ada yang gagal di tengah, PartialSetoranError memberi tahu berapa
     * yang sudah tersimpan supaya form tidak mengirim ulang baris itu.
     */
    async create(idUser: string, items: SetoranItemInput[]) {
      for (const [index, item] of items.entries()) {
        try {
          await invokeCommand<null>("add_deposit_command", {
            payload: {
              user_id: idUser,
              ...wasteField(item.id_waste),
              weight_kg: item.berat,
              description: item.deskripsi,
            },
          });
        } catch (error) {
          if (index === 0) throw error;
          throw new PartialSetoranError(index, error);
        }
      }
    },

    /** Pemilik setoran tidak bisa dipindah lewat edit; cuma isi sampahnya. */
    update(idSetoran: string, item: SetoranItemInput) {
      return invokeCommand<null>("edit_deposit_command", {
        payload: {
          id_deposit: idSetoran,
          ...wasteField(item.id_waste),
          weight_kg: item.berat,
          description: item.deskripsi,
        },
      });
    },

    async remove(idSetoran: string) {
      await invokeCommand<null>("delete_deposit_command", { idDeposit: idSetoran });
      this.items = this.items.filter((item) => item.id_setoran !== idSetoran);
    },

    /** Isi lengkap satu setoran (warga, item katalog, satuan) untuk form Edit. */
    async fetchDetail(idSetoran: string): Promise<SetoranDetail> {
      const data = await invokeCommand<DepositDetailData>("get_deposit_detail_command", {
        idDeposit: idSetoran,
      });
      return toDetail(data);
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
