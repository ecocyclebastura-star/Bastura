import { defineStore } from "pinia";
import { resolveAuthError } from "../constants/authErrors";
import { TRANSACTION_FILTERS, byNewest, matchesQuery } from "../constants/transactions";
import { invokeCommand } from "../utils/invokeCommand";
import type { Transaction, TransactionPage, TransactionQuery } from "./transactionStore";
import { useWargaStore } from "./wargaStore";

/**
 * Bentuk `TransactionItem` dari src-tauri/src/models/transaction_model.rs.
 * `name` cuma terisi di daftar global; riwayat per warga membiarkannya kosong.
 */
interface AdminTransactionItem extends Transaction {
  name: string | null;
}

/** Transaksi seluruh warga untuk riwayat admin, lengkap dengan pemiliknya. */
export interface AdminTransaction extends Transaction {
  /**
   * Kosong untuk transaksi dari daftar global: `get_all_transactions_admin_command`
   * cuma membawa nama warga, bukan id-nya. Terisi kalau transaksinya dititipkan
   * halaman Detail Warga lewat `remember`.
   */
  id_user: string;
  nama_warga: string;
}

type AdminTransactionPage = Omit<TransactionPage, "data"> & {
  data: AdminTransaction[];
};

/** Bentuk `AdminWithdrawalItem` dari src-tauri/src/models/admin_model.rs. */
interface AdminWithdrawalItem {
  id_transaksi: string;
  id_user: string;
  name: string;
  jenis_transaksi: string;
  deskripsi: string | null;
  nominal: number;
  status: string;
  tanggal_transaksi: string;
}

/** Bentuk `VerifyWithdrawalResult`; `balance` adalah saldo warga setelahnya. */
export interface VerifyWithdrawalResult {
  success: string;
  balance: number;
  id_users: string;
}

/** Permintaan penarikan yang menunggu keputusan admin. */
export interface PendingWithdrawal {
  id_transaksi: string;
  id_user: string;
  nama_warga: string;
  nominal: number;
  /** Saldo warga saat ini; null = daftar warganya gagal diambil. */
  total_saldo: number | null;
  status: string;
  tanggal_transaksi: string;
}

function toAdminTransaction({ name, ...item }: AdminTransactionItem): AdminTransaction {
  return { ...item, id_user: "", nama_warga: name ?? "" };
}

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
    /**
     * Command-nya mengembalikan seluruh transaksi sekaligus tanpa filter &
     * cursor, jadi penyaringan dan urutannya dikerjakan di sini dan
     * `next_cursor` selalu null -- sama seperti riwayat per warga.
     */
    async fetchAll(query: TransactionQuery = {}): Promise<AdminTransactionPage> {
      const result = await invokeCommand<AdminTransactionItem[]>(
        "get_all_transactions_admin_command",
      );

      return {
        data: result
          .map(toAdminTransaction)
          .filter((item) => matchesQuery(item, query))
          .sort(byNewest),
        next_cursor: null,
      };
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
        const page = await this.fetchAll(this.filterQuery());
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

      const page = await this.fetchAll();
      return page.data.find((item) => item.id_transaksi === id) ?? null;
    },

    /**
     * Daftar penarikan yang menunggu keputusan admin.
     *
     * `get_admin_withdrawals_command` tidak membawa saldo warga padahal
     * kartunya menampilkannya, jadi saldonya diambil dari daftar warga lalu
     * dicocokkan per id. Kalau daftar itu gagal diambil, penarikannya tetap
     * tampil -- saldonya saja yang dikosongkan, bukan diisi angka asal.
     */
    async fetchPendingWithdrawals(): Promise<PendingWithdrawal[]> {
      const [items, saldo] = await Promise.all([
        invokeCommand<AdminWithdrawalItem[]>("get_admin_withdrawals_command"),
        useWargaStore()
          .fetchList(null)
          .then((list) => new Map(list.map((warga) => [warga.id, warga.total_saldo])))
          .catch(() => null),
      ]);

      return items
        .map((item) => ({
          id_transaksi: item.id_transaksi,
          id_user: item.id_user,
          nama_warga: item.name ?? "",
          nominal: item.nominal,
          total_saldo: saldo?.get(item.id_user) ?? null,
          status: item.status,
          tanggal_transaksi: item.tanggal_transaksi,
        }))
        .sort(byNewest);
    },

    /** Setuju dan tolak lewat command yang sama; bedanya cuma `isApprove`. */
    verifyWithdrawal(idTransaksi: string, isApprove: boolean) {
      return invokeCommand<VerifyWithdrawalResult>("verify_withdrawal_command", {
        idTsc: idTransaksi,
        isApprove,
      });
    },

    approveWithdrawal(idTransaksi: string) {
      return this.verifyWithdrawal(idTransaksi, true);
    },

    rejectWithdrawal(idTransaksi: string) {
      return this.verifyWithdrawal(idTransaksi, false);
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
