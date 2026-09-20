import { defineStore } from "pinia";
import type { AppErrorResponse } from "../constants/authErrors";
import { byNewest, matchesQuery } from "../constants/transactions";
import { invokeCommand as call } from "../utils/invokeCommand";
import type { Transaction, TransactionPage, TransactionQuery } from "./transactionStore";

export { COMMAND_UNAVAILABLE } from "../utils/invokeCommand";

/** Bentuk `WargaLocalItem` dari src-tauri/src/models/admin_model.rs. */
interface WargaLocalItem {
  id_users: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  created_at: string | null;
  /** "active" | "blocked", ditulis juga oleh `update_warga_status_local`. */
  status_active: string | null;
  balance_held: number | null;
  total_balance: number | null;
  total_weight: number | null;
}

/**
 * Data satu warga yang dipakai halaman & kartu admin.
 *
 * Bentuk ini sengaja tidak mengikuti struct Rust apa adanya; `toWarga` di
 * bawah yang menerjemahkan. Kalau backend berubah, cukup sesuaikan
 * `WargaLocalItem` dan `toWarga` tanpa menyentuh halaman.
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

function toWarga(item: WargaLocalItem): Warga {
  return {
    id: item.id_users,
    name: item.name ?? "",
    email: item.email ?? "",
    phone: item.phone ?? "",
    // Endpoint /users/account/warga cuma berisi akun warga dan tidak membawa
    // role maupun foto.
    role: "warga",
    is_blocked: /block/i.test(item.status_active ?? ""),
    total_saldo: item.total_balance ?? 0,
    total_sampah: item.total_weight ?? 0,
    joined_at: item.created_at ?? "",
    avatar_base64: null,
  };
}

/**
 * Jembatan ke command kelola warga di
 * src-tauri/src/controllers/admin_controller.rs.
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
    async fetchList(search: string | null) {
      const result = await call<WargaLocalItem[]>("get_daftar_warga_command", {
        searchQuery: search || null,
      });
      return result.map(toWarga);
    },

    async list(search: string) {
      const result = await this.fetchList(search);
      this.items = result;
      return result;
    },

    /**
     * Belum ada command detail, jadi dicari dari daftar lengkap. Command
     * daftar sudah menyinkronkan data server dulu, jadi isinya tetap terbaru.
     */
    async fetchDetail(idUser: string): Promise<Warga> {
      const all = await this.fetchList(null);
      const found = all.find((item) => item.id === idUser);
      if (found) return found;

      const notFound: AppErrorResponse = {
        code: "NOT_FOUND",
        message: "Data warga tidak ditemukan.",
        http_status: 404,
      };
      throw notFound;
    },

    findCached(idUser: string): Warga | null {
      return this.items.find((item) => item.id === idUser) ?? null;
    },

    /** Riwayat transaksi milik warga tertentu; bentuknya sama dengan riwayat user. */
    async fetchTransactions(
      idUser: string,
      query: TransactionQuery = {},
    ): Promise<TransactionPage> {
      const result = await call<Transaction[]>("get_user_transactions_admin_command", {
        targetUserId: idUser,
      });
      return {
        data: result.filter((item) => matchesQuery(item, query)).sort(byNewest),
        next_cursor: null,
      };
    },

    /** Khusus super admin. Command-nya BELUM ADA di src-tauri. */
    promoteToAdmin(idUser: string) {
      return call<unknown>("promote_admin_command", { idUser });
    },

    /** Khusus super admin. Command-nya BELUM ADA di src-tauri. */
    demoteToWarga(idUser: string) {
      return call<unknown>("demote_admin_command", { idUser });
    },

    /** Admin dan super admin. */
    block(idUser: string) {
      return call<unknown>("block_warga_command", { targetUserId: idUser });
    },

    /** Admin dan super admin. */
    unblock(idUser: string) {
      return call<unknown>("unblock_warga_command", { targetUserId: idUser });
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
