import { invoke } from "@tauri-apps/api/core";
import type { AppErrorResponse } from "../constants/authErrors";
import { isMissingCommand } from "../constants/authErrors";

/** Kode buatan frontend untuk command yang belum terdaftar di Rust. */
export const COMMAND_UNAVAILABLE = "COMMAND_UNAVAILABLE";

/**
 * `invoke` untuk fitur yang backend-nya menyusul. "Command not found" dari
 * Tauri (string biasa) diterjemahkan jadi AppError, supaya halaman cukup
 * memakai resolveAuthError dan pesannya jujur bahwa fiturnya belum siap --
 * bukan menyalahkan koneksi user.
 */
export async function invokeCommand<T>(
  command: string,
  args?: Record<string, unknown>,
): Promise<T> {
  try {
    return await invoke<T>(command, args);
  } catch (error) {
    if (isMissingCommand(error)) {
      const unavailable: AppErrorResponse = {
        code: COMMAND_UNAVAILABLE,
        message: "Fitur ini belum tersedia di aplikasi versi ini.",
        http_status: 0,
      };
      throw unavailable;
    }
    throw error;
  }
}
