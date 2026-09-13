import { defineStore } from "pinia";
import { resolveAuthError } from "../constants/authErrors";
import { TRANSACTION_FILTERS } from "../constants/transactions";
import { invokeCommand } from "../utils/invokeCommand";
import type { Transaction, TransactionPage, TransactionQuery } from "./transactionStore";

/**
 * Transaksi seluruh warga untuk riwayat admin: bentuknya sama dengan
 * `TransactionItem`, ditambah pemiliknya.
 *
 * Catatan: `get_all_transactions_command` BELUM ADA di src-tauri --
 * `get_transaction_history_command` cuma berisi transaksi akun yang sedang
 * login dan tidak membawa nama warga. Nama command & field di sini usulan
 * frontend; samakan dengan struct Rust-nya begitu dibuat.
 */
export interface AdminTransaction extends Transaction {
  id_user: string;
  nama_warga: string;
}

type AdminTransactionPage = Omit<TransactionPage, "data"> & {
  data: AdminTransaction[];
};

/**
 * Permintaan penarikan yang menunggu keputusan admin. `total_saldo` adalah
 * saldo warga saat ini, supaya admin bisa menilai sebelum menyetujui.
 *
 * Catatan: tiga command verifikasi di bawah juga BELUM ADA di src-tauri.
 */
export interface PendingWithdrawal {
  id_transaksi: string;
  id_user: string;
  nama_warga: string;
  nominal: number;
  total_saldo: number;
  status: string;
  tanggal_transaksi: string;
}

const PAGE_LIMIT = 20;

export const useAdminTransactionStore = defineStore("adminTransaction", {
  state: () => ({
    items: [] as AdminTransaction[],
    /** null = halaman berikutnya sudah tidak ada. */
    nextCursor: null as string | null,
    listLoading: false,
    listLoadingMore: false,
    listError: "",
    /** Desain admin selalu menyalakan satu chip, dibuka di "Setoran". */
    activeFilter: TRANSACTION_FILTERS[0].value,

    /**
     * Transaksi yang dibuka dari halaman lain (mis. Detail Warga), dititipkan
     * supaya halaman detail tidak perlu menarik ulang semuanya.
     */
    remembered: [] as AdminTransaction[],
  }),

  actions: {
    fetchAll(query: TransactionQuery = {}) {
      return invokeCommand<AdminTransactionPage>("get_all_transactions_command", {
        payload: {
          limit: query.limit ?? null,
          cursor: query.cursor ?? null,
          jenis_transaksi: query.jenis ?? null,
          status: query.status ?? null,
        },
      });
    },

    filterQuery(): TransactionQuery {
      const filter = TRANSACTION_FILTERS.find(
        (item) => item.value === this.activeFilter,
      );
      return { jenis: filter?.jenis, status: filter?.status };
    },

    async loadHistory() {
      this.listLoading = true;
      this.listError = "";

      try {
        const page = await this.fetchAll({ ...this.filterQuery(), limit: PAGE_LIMIT });
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

    async loadMore() {
      if (!this.nextCursor || this.listLoadingMore) return;

      this.listLoadingMore = true;
      try {
        const page = await this.fetchAll({
          ...this.filterQuery(),
          cursor: this.nextCursor,
          limit: PAGE_LIMIT,
        });
        this.items.push(...page.data);
        this.nextCursor = page.next_cursor;
      } catch (error) {
        this.listError = resolveAuthError(error, "Gagal memuat transaksi berikutnya.");
      } finally {
        this.listLoadingMore = false;
      }
    },

    setFilter(value: string) {
      if (this.activeFilter === value) return;
      this.activeFilter = value;
      return this.loadHistory();
    },

    remember(items: AdminTransaction[]) {
      const ids = new Set(items.map((item) => item.id_transaksi));
      this.remembered = [
        ...items,
        ...this.remembered.filter((item) => !ids.has(item.id_transaksi)),
      ];
    },

    /**
     * Sama seperti versi user: cek yang sudah ada di memori dulu, baru tarik
     * ulang kalau halaman detailnya dibuka langsung lewat URL.
     */
    async findTransaction(id: string): Promise<AdminTransaction | null> {
      const cached = [...this.items, ...this.remembered].find(
        (item) => item.id_transaksi === id,
      );
      if (cached) return cached;

      const page = await this.fetchAll({ limit: 100 });
      return page.data.find((item) => item.id_transaksi === id) ?? null;
    },

    /** Penarikan berstatus diproses dari semua warga. */
    fetchPendingWithdrawals() {
      return invokeCommand<PendingWithdrawal[]>("get_pending_withdrawals_command");
    },

    approveWithdrawal(idTransaksi: string) {
      return invokeCommand<unknown>("approve_withdrawal_command", { idTransaksi });
    },

    rejectWithdrawal(idTransaksi: string) {
      return invokeCommand<unknown>("reject_withdrawal_command", { idTransaksi });
    },

    reset() {
      this.items = [];
      this.nextCursor = null;
      this.listError = "";
      this.activeFilter = TRANSACTION_FILTERS[0].value;
      this.remembered = [];
    },
  },
});
