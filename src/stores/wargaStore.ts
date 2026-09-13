import { defineStore } from "pinia";
import { invokeCommand as call } from "../utils/invokeCommand";
import type { TransactionPage, TransactionQuery } from "./transactionStore";

export { COMMAND_UNAVAILABLE } from "../utils/invokeCommand";

/**
 * Data satu warga dari sudut pandang admin.
 *
 * Catatan: command-command di file ini BELUM ADA di src-tauri. Nama field dan
 * nama command-nya usulan frontend -- samakan dengan struct Rust-nya begitu
 * backend-nya dibuat, cukup di file ini saja.
 */
export interface Warga {
  id: string;
  name: string;
  email: string;
  phone: string;
  /** "warga" | "admin" | "super admin", sama seperti klaim role di JWT. */
  role: string;
  is_blocked: boolean;
  /** Saldo dalam rupiah. */
  total_saldo: number;
  /** Total berat setoran dalam kg. */
  total_sampah: number;
  /** Timestamp akun dibuat. */
  joined_at: string;
  /** Data URL avatar; kosong = ikon bawaan. */
  avatar_base64: string | null;
}

/**
 * Jembatan ke command kelola warga.
 *
 * Hak aksesnya tetap wajib dijaga backend (`require_admin`, dan khusus super
 * admin untuk ubah role); pembatasan tombol di frontend cuma soal tampilan.
 */
export const useWargaStore = defineStore("warga", {
  state: () => ({
    /** Hasil daftar terakhir, dipakai mengisi halaman detail tanpa menunggu. */
    items: [] as Warga[],
  }),

  actions: {
    async list(search: string) {
      const result = await call<Warga[]>("get_warga_list_command", {
        search: search || null,
      });
      this.items = result;
      return result;
    },

    fetchDetail(idUser: string) {
      return call<Warga>("get_warga_detail_command", { idUser });
    },

    findCached(idUser: string): Warga | null {
      return this.items.find((item) => item.id === idUser) ?? null;
    },

    /** Riwayat transaksi milik warga tertentu; bentuknya sama dengan riwayat user. */
    fetchTransactions(idUser: string, query: TransactionQuery = {}) {
      return call<TransactionPage>("get_warga_transactions_command", {
        idUser,
        payload: {
          limit: query.limit ?? null,
          cursor: query.cursor ?? null,
          jenis_transaksi: query.jenis ?? null,
          status: query.status ?? null,
        },
      });
    },

    /** Khusus super admin. */
    promoteToAdmin(idUser: string) {
      return call<unknown>("promote_admin_command", { idUser });
    },

    /** Khusus super admin. */
    demoteToWarga(idUser: string) {
      return call<unknown>("demote_admin_command", { idUser });
    },

    /** Admin dan super admin. */
    block(idUser: string) {
      return call<unknown>("block_warga_command", { idUser });
    },

    /** Admin dan super admin. */
    unblock(idUser: string) {
      return call<unknown>("unblock_warga_command", { idUser });
    },

    /** Samakan salinan di daftar setelah warga diubah dari halaman detail. */
    patch(updated: Warga) {
      const index = this.items.findIndex((item) => item.id === updated.id);
      if (index !== -1) this.items[index] = updated;
    },

    reset() {
      this.items = [];
    },
  },
});
