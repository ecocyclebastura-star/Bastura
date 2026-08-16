/**
 * Bentuk error yang dikirim command Tauri saat gagal, hasil `impl Serialize
 * for AppError` di src-tauri/src/utils/error.rs.
 */
export interface AppErrorResponse {
  code: string;
  message: string;
  http_status: number;
}

/**
 * Kode teknis yang pesan aslinya terlalu "mesin" buat dibaca user, jadi
 * ditimpa pakai kalimat sendiri.
 *
 * Kode sisanya (API_ERROR, VALIDATION_ERROR, UNAUTHORIZED,
 * RATE_LIMIT_EXCEEDED) sengaja dibiarkan pakai `message` dari server, karena
 * di situlah pesan spesifiknya berada -- misal "akun tidak ditemukan" atau
 * "akun anda telah diblokir".
 */
const OVERRIDE_MESSAGES: Record<string, string> = {
  NETWORK_OFFLINE:
    "Tidak dapat terhubung ke server. Periksa koneksi internet kamu.",
  JSON_PARSE_ERROR:
    "Respons server tidak dikenali. Coba lagi sebentar lagi.",
  DATABASE_ERROR:
    "Terjadi masalah pada penyimpanan aplikasi. Coba tutup dan buka lagi aplikasinya.",
  KEYRING_ERROR:
    "Gagal mengakses penyimpanan aman perangkat. Coba tutup dan buka lagi aplikasinya.",
  UNKNOWN_ERROR: "Terjadi kesalahan tak terduga. Coba lagi sebentar lagi.",
};

/** Cek apakah error dari `invoke` memang AppError, bukan error JS biasa. */
export function toAppError(error: unknown): AppErrorResponse | null {
  if (typeof error !== "object" || error === null) return null;
  const candidate = error as Partial<AppErrorResponse>;
  return typeof candidate.code === "string" ? (candidate as AppErrorResponse) : null;
}

/**
 * Ubah error dari `invoke` jadi kalimat yang siap ditampilkan di toast.
 * `fallback` dipakai kalau errornya bukan AppError (misal IPC putus).
 */
export function resolveAuthError(error: unknown, fallback: string): string {
  const appError = toAppError(error);
  if (!appError) return fallback;

  if (appError.code in OVERRIDE_MESSAGES) {
    return OVERRIDE_MESSAGES[appError.code];
  }

  return appError.message?.trim() || fallback;
}

/**
 * Sesi OTP di RAM Rust hilang/kedaluwarsa, jadi user wajib minta kode baru.
 * Ini juga kejadian setiap kali reset gagal, karena `reset_password_service`
 * meng-`remove` cache OTP-nya sebelum request dikirim.
 */
export function isOtpSessionExpired(error: unknown): boolean {
  const appError = toAppError(error);
  if (!appError) return false;
  return (
    appError.code === "VALIDATION_ERROR" && /OTP/i.test(appError.message ?? "")
  );
}
