import { defineStore } from "pinia";
import { invoke } from "@tauri-apps/api/core";

/** Bentuk `LoginSuccessResponse` dari src-tauri/src/models/auth_model.rs. */
export interface AuthUser {
  id: string;
  name: string;
  email: string;
  /** Hasil decode klaim `role` di JWT: "warga" | "admin" | "super admin". */
  role: string;
}

export interface SignupPayload {
  name: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
}

export interface ResetPasswordPayload {
  email: string;
  otp: string;
  newPassword: string;
  confirmPassword: string;
}

/**
 * Jembatan ke command Tauri di src-tauri/src/controllers/auth_controller.rs.
 *
 * Token tidak pernah masuk ke store ini: access token disimpan di RAM proses
 * Rust (AppState) dan refresh token di keyring OS. Yang dipegang frontend cuma
 * identitas user buat keperluan tampilan & guard route.
 */
export const useAuthStore = defineStore("auth", {
  state: () => ({
    user: null as AuthUser | null,
  }),

  getters: {
    isLoggedIn: (state) => state.user !== null,
    role: (state) => state.user?.role ?? "",
  },

  actions: {
    async login(email: string, password: string) {
      const user = await invoke<AuthUser>("login_command", { email, password });
      this.user = user;
      return user;
    },

    async signup(payload: SignupPayload) {
      // Argumen command otomatis di-camelCase-kan Tauri, tapi isi `payload`
      // dibaca serde apa adanya -> field-nya harus snake_case persis seperti
      // struct SignupRequestPayload.
      const user = await invoke<AuthUser>("signup_command", {
        payload: {
          name: payload.name,
          email: payload.email,
          phone: payload.phone,
          password: payload.password,
          confirm_password: payload.confirmPassword,
        },
      });
      this.user = user;
      return user;
    },

    async logout() {
      try {
        await invoke<boolean>("logout_command");
      } finally {
        // Command-nya sendiri "pantang gagal", tapi kalau IPC-nya yang error
        // sesi di sisi frontend tetap harus bersih.
        this.user = null;
      }
    },

    /** Minta server kirim kode OTP ke email. Hash OTP-nya disimpan Rust. */
    async forgotPassword(email: string) {
      return invoke<boolean>("forgot_password_command", { email });
    },

    async resetPassword(payload: ResetPasswordPayload) {
      return invoke<boolean>("reset_password_command", {
        email: payload.email,
        otp: payload.otp,
        newPassword: payload.newPassword,
        confirmPassword: payload.confirmPassword,
      });
    },

    /** Dipakai saat event `on_session_expired` datang dari session watcher. */
    clearSession() {
      this.user = null;
    },
  },

  // sessionStorage, bukan localStorage. Access token hidup di RAM proses Rust
  // (AppState): refresh webview (F5) tidak mematikan proses itu, jadi sesi
  // harus ikut bertahan; sedangkan aplikasi ditutup-buka lagi = RAM bersih,
  // dan sessionStorage ikut kosong. Umurnya jadi pas sama umur token.
  persist: {
    storage: sessionStorage,
  },
});
