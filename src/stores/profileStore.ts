import { defineStore } from "pinia";
import { invoke } from "@tauri-apps/api/core";
import { resolveAuthError } from "../constants/authErrors";

/** Bentuk `ProfileClientResponse` dari src-tauri/src/models/profile_model.rs. */
export interface Profile {
  id: string;
  name: string;
  email: string;
  phone: string;
  /**
   * Data URL siap pakai (`data:image/png;base64,...`). Backend yang mengunduh
   * gambarnya -- endpoint avatar minta header Authorization dan webview tidak
   * mengirimkannya. Kalau file lokalnya tidak ada, backend mengirim avatar
   * dummy bawaan, jadi praktis field ini selalu terisi.
   */
  avatar_base64: string | null;
}

export interface ProfileUpdatePayload {
  name?: string;
  phone?: string;
  /** Nama berkas avatar; wajib berpasangan dengan `avatarBytes`. */
  avatarName?: string;
  avatarBytes?: Uint8Array;
}

/**
 * Jembatan ke command profil di src-tauri/src/controllers/profile_controller.rs.
 *
 * `get_profile_command` bersifat offline-first: backend menjalankan smart sync
 * dulu, lalu hasilnya diambil dari cache SQLite. Jadi profil tetap tampil
 * walau sedang offline.
 */
export const useProfileStore = defineStore("profile", {
  state: () => ({
    profile: null as Profile | null,
    loading: false,
    errorMessage: "",
  }),

  getters: {
    displayName: (state) => state.profile?.name?.trim() || "Warga",
    avatarSrc: (state) => state.profile?.avatar_base64 ?? "",
  },

  actions: {
    async load() {
      this.loading = true;
      this.errorMessage = "";

      try {
        this.profile = await invoke<Profile | null>("get_profile_command");
      } catch (error) {
        this.errorMessage = resolveAuthError(
          error,
          "Gagal memuat profil. Coba lagi sebentar lagi.",
        );
      } finally {
        this.loading = false;
      }
    },

    /**
     * Kirim perubahan bio dan/atau avatar sekaligus.
     *
     * Field yang tidak diisi dikirim sebagai `null` supaya backend tahu itu
     * "jangan diubah", bukan "kosongkan".
     */
    async update(payload: ProfileUpdatePayload) {
      const updated = await invoke<Profile>("update_full_profile_command", {
        name: payload.name ?? null,
        phone: payload.phone ?? null,
        avatarName: payload.avatarName ?? null,
        // Vec<u8> di Rust diterima sebagai array angka biasa dari sisi JS.
        avatarBytes: payload.avatarBytes ? Array.from(payload.avatarBytes) : null,
      });

      this.profile = updated;
      return updated;
    },

    /** Nonaktifkan akun; sesi lokal ikut dibersihkan backend. */
    deactivate() {
      return invoke<boolean>("deactivate_account_command");
    },

    reset() {
      this.profile = null;
      this.errorMessage = "";
    },
  },
});
