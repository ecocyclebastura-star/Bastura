import { defineStore } from "pinia";

/** Bentuk `BalanceUpdatePayload` dari src-tauri/src/models/profile_model.rs. */
export interface BalanceUpdatePayload {
  saldo: number;
  last_updated: string;
}

/** Nama event yang di-emit balance worker di Rust. */
export const BALANCE_EVENT = "on_balance_update";

/**
 * Saldo terakhir yang dikirim balance worker lewat event `on_balance_update`.
 *
 * Store ini murni penampung: yang mendaftarkan listener-nya App.vue, supaya
 * satu event listener saja dipakai bersama semua halaman dan tidak ikut mati
 * waktu user pindah halaman.
 */
export const useBalanceStore = defineStore("balance", {
  state: () => ({
    /** null = belum ada kiriman pertama dari backend. */
    saldo: null as number | null,
    lastUpdated: "",
  }),

  getters: {
    /** Selama masih null, kartu saldo menampilkan skeleton. */
    isWaitingFirstUpdate: (state) => state.saldo === null,
  },

  actions: {
    applyUpdate(payload: BalanceUpdatePayload) {
      this.saldo = payload.saldo;
      this.lastUpdated = payload.last_updated;
    },

    reset() {
      this.saldo = null;
      this.lastUpdated = "";
    },
  },

  // Sama alasannya dengan authStore: worker cuma emit tiap 10 detik, jadi
  // tanpa ini refresh webview bikin kartu saldo balik jadi skeleton padahal
  // sesinya masih hidup. sessionStorage dipilih supaya umurnya ikut umur sesi.
  persist: {
    storage: sessionStorage,
  },
});
