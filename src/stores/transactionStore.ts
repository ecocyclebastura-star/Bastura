import { defineStore } from "pinia";
import { invoke } from "@tauri-apps/api/core";
import { resolveAuthError } from "../constants/authErrors";
import type { ToastVariant } from "../composables/useToast";
import { TRANSACTION_FILTERS } from "../constants/transactions";

/** Bentuk `TransactionItem` dari src-tauri/src/models/transaction_model.rs. */
export interface Transaction {
  id_transaksi: string;
  jenis_transaksi: string;
  deskripsi: string | null;
  nominal: number;
  status: string;
  tanggal_transaksi: string;
}

/** Bentuk `TransactionHistoryPayload`; isinya dibaca serde apa adanya. */
export interface TransactionQuery {
  limit?: number;
  cursor?: string;
  jenis?: string;
  status?: string;
}

/** Bentuk `TransactionResponseData`. */
export interface TransactionPage {
  data: Transaction[];
  next_cursor: string | null;
}

/** Bentuk `WithdrawalResponseData`. */
export interface WithdrawalResult {
  id_wd: string;
  amount: number;
  status: string;
  created_at: string;
}

/** Bentuk `CancelWithdrawalResponseData`. */
export interface CancelResult {
  id_transaksi: string;
  status: string;
  updated_at: string;
}

/** Jumlah transaksi yang ditampilkan di kartu ringkas halaman Dompet. */
const RECENT_LIMIT = 5;

/** Ukuran satu halaman di riwayat transaksi. */
const PAGE_LIMIT = 20;

/** Penarikan paling kecil yang diterima; dipakai juga buat validasi form. */
export const MIN_WITHDRAWAL = 10_000;

/**
 * Jembatan ke command transaksi di
 * src-tauri/src/controllers/transaction_controller.rs.
 *
 * Beda dengan konten yang offline-first: `get_transaction_history_command`
 * bersifat strict network-first untuk halaman pertama (cursor kosong). Backend
 * menarik data dari server dulu dan langsung melempar error kalau gagal, baru
 * hasilnya diproyeksikan dari cache SQLite. Jadi daftar kosong di sini benar-
 * benar berarti belum ada transaksi, sedangkan offline pasti jadi error.
 */
export const useTransactionStore = defineStore("transaction", {
  state: () => ({
    /** Transaksi terbaru untuk halaman Dompet. */
    recent: [] as Transaction[],
    recentLoading: false,
    recentError: "",

    /** Daftar bertingkat untuk halaman Riwayat Transaksi. */
    items: [] as Transaction[],
    /** null = halaman berikutnya sudah tidak ada. */
    nextCursor: null as string | null,
    listLoading: false,
    listLoadingMore: false,
    listError: "",
    /** Nilai chip filter yang sedang aktif; "" berarti semua transaksi. */
    activeFilter: "",

    /**
     * Pesan yang dititipkan satu halaman untuk ditampilkan halaman berikutnya,
     * mis. hasil pembatalan penarikan yang toast-nya muncul di Riwayat.
     */
    flashMessage: "",
    flashVariant: "success" as ToastVariant,
  }),

  actions: {
    /** Pemanggil langsung command riwayat. */
    fetchHistory(query: TransactionQuery = {}) {
      return invoke<TransactionPage>("get_transaction_history_command", {
        payload: {
          limit: query.limit ?? null,
          cursor: query.cursor ?? null,
          jenis_transaksi: query.jenis ?? null,
          status: query.status ?? null,
        },
      });
    },

    /** Isi daftar ringkas di halaman Dompet. */
    async loadRecent() {
      this.recentLoading = true;
      this.recentError = "";

      try {
        const page = await this.fetchHistory({ limit: RECENT_LIMIT });
        this.recent = page.data;
      } catch (error) {
        this.recentError = resolveAuthError(
          error,
          "Gagal memuat riwayat transaksi. Coba lagi sebentar lagi.",
        );
      } finally {
        this.recentLoading = false;
      }
    },

    /** Terjemahkan chip filter aktif jadi argumen command. */
    filterQuery(): TransactionQuery {
      const filter = TRANSACTION_FILTERS.find(
        (item) => item.value === this.activeFilter,
      );
      return { jenis: filter?.jenis, status: filter?.status };
    },

    /** Muat ulang halaman pertama riwayat sesuai filter yang aktif. */
    async loadHistory() {
      this.listLoading = true;
      this.listError = "";

      try {
        const page = await this.fetchHistory({
          ...this.filterQuery(),
          limit: PAGE_LIMIT,
        });
        this.items = page.data;
        this.nextCursor = page.next_cursor;
      } catch (error) {
        this.items = [];
        this.nextCursor = null;
        this.listError = resolveAuthError(
          error,
          "Gagal memuat riwayat transaksi. Coba lagi sebentar lagi.",
        );
      } finally {
        this.listLoading = false;
      }
    },

    /** Sambung halaman berikutnya ke daftar yang sudah tampil. */
    async loadMore() {
      if (!this.nextCursor || this.listLoadingMore) return;

      this.listLoadingMore = true;
      try {
        const page = await this.fetchHistory({
          ...this.filterQuery(),
          cursor: this.nextCursor,
          limit: PAGE_LIMIT,
        });
        this.items.push(...page.data);
        this.nextCursor = page.next_cursor;
      } catch (error) {
        this.listError = resolveAuthError(
          error,
          "Gagal memuat transaksi berikutnya.",
        );
      } finally {
        this.listLoadingMore = false;
      }
    },

    /** Ganti filter lalu muat ulang daftarnya. */
    setFilter(value: string) {
      if (this.activeFilter === value) return;
      this.activeFilter = value;
      return this.loadHistory();
    },

    /**
     * Cari satu transaksi buat halaman detail.
     *
     * Dicek dulu dari yang sudah ada di memori; kalau tidak ketemu (misal
     * halaman detailnya dibuka langsung lewat URL) baru tarik ulang daftarnya.
     */
    async findTransaction(id: string): Promise<Transaction | null> {
      const cached = [...this.items, ...this.recent].find(
        (item) => item.id_transaksi === id,
      );
      if (cached) return cached;

      const page = await this.fetchHistory({ limit: 100 });
      return page.data.find((item) => item.id_transaksi === id) ?? null;
    },

    /**
     * Ajukan penarikan saldo. Backend ikut memicu pembaruan saldo, jadi kartu
     * saldo menyesuaikan sendiri lewat event `on_balance_update`.
     */
    withdraw(amount: number) {
      return invoke<WithdrawalResult>("create_withdrawal_command", { amount });
    },

    /** Batalkan penarikan yang masih menunggu persetujuan admin. */
    cancelWithdrawal(idTransaksi: string) {
      return invoke<CancelResult>("cancel_withdrawal_command", { idTransaksi });
    },

    /** Titipkan toast buat halaman tujuan setelah pindah halaman. */
    setFlash(message: string, variant: ToastVariant = "success") {
      this.flashMessage = message;
      this.flashVariant = variant;
    },

    /** Ambil sekali pakai; setelah dibaca titipannya dihapus. */
    takeFlash() {
      const flash = { message: this.flashMessage, variant: this.flashVariant };
      this.flashMessage = "";
      return flash;
    },

    reset() {
      this.recent = [];
      this.recentError = "";
      this.items = [];
      this.nextCursor = null;
      this.listError = "";
      this.activeFilter = "";
      this.flashMessage = "";
    },
  },
});
