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

/** Panjang wajar satu kalimat toast; lebih dari ini hampir pasti dump teknis. */
const MAX_MESSAGE_LENGTH = 160;

/**
 * Kupas pesan server sampai ketemu kalimat yang layak dibaca pengguna.
 *
 * Service admin di src-tauri meneruskan body respons apa adanya lewat
 * `format!("HTTP Status: {} - {}", status, body_text)`, jadi pesannya sering
 * berbentuk `HTTP Status: 400 Bad Request - {"status":"error",...}`. Yang
 * diambil cuma `message` di dalam JSON-nya. Kalau tidak ada kalimat yang bisa
 * dipertanggungjawabkan, hasilnya null supaya pemanggil memakai kalimat
 * sendiri -- lebih baik umum tapi manusiawi daripada JSON mentah.
 */
function unwrapServerMessage(message: string): string | null {
  const text = message.trim();

  if (!text.startsWith("HTTP Status:")) {
    // Pesan buatan Rust sendiri (Forbidden, ValidationError, dsb.) sudah
    // berupa kalimat, jadi dipakai apa adanya selama masih sepanjang toast.
    return text && text.length <= MAX_MESSAGE_LENGTH ? text : null;
  }

  const separator = text.indexOf(" - ");
  if (separator === -1) return null;

  // Sisanya body respons mentah: cuma `message` di dalam JSON yang layak
  // dibaca pengguna. Body non-JSON (halaman error HTML, "Internal Server
  // Error") sengaja ditolak, biar halaman memakai kalimatnya sendiri.
  const body = text.slice(separator + 3).trim();
  if (!body.startsWith("{")) return null;

  try {
    const parsed = JSON.parse(body) as { message?: unknown };
    // Sebagian endpoint memakai `message` sebagai pembungkus data, bukan
    // kalimat, jadi yang bukan string langsung ditolak.
    const detail = typeof parsed.message === "string" ? parsed.message.trim() : "";
    return detail && detail.length <= MAX_MESSAGE_LENGTH ? detail : null;
  } catch {
    return null;
  }
}

/**
 * Ubah error dari `invoke` jadi kalimat yang siap ditampilkan di toast.
 * `fallback` dipakai kalau errornya bukan AppError (misal IPC putus) atau
 * pesan servernya tidak layak tampil.
 */
export function resolveAuthError(error: unknown, fallback: string): string {
  const appError = toAppError(error);
  if (!appError) return fallback;

  if (appError.code in OVERRIDE_MESSAGES) {
    return OVERRIDE_MESSAGES[appError.code];
  }

  return unwrapServerMessage(appError.message ?? "") || fallback;
}

/**
 * Kalimat cadangan sesuai kode status HTTP, dipakai sebagai `fallback`
 * resolveAuthError supaya halaman tetap bicara bahasa pengguna -- bukan
 * bahasa server -- waktu pesan aslinya tidak bisa ditampilkan.
 *
 * Status 5xx yang tidak terdaftar ikut memakai kalimat 500 kalau ada, karena
 * bagi pengguna 502 dan 503 sama saja: server sedang bermasalah.
 */
export function statusFallback(
  error: unknown,
  messages: Record<number, string>,
  fallback: string,
): string {
  const status = toAppError(error)?.http_status ?? 0;

  if (status in messages) return messages[status];
  if (status >= 500) return messages[500] ?? fallback;
  return fallback;
}

/**
 * Command-nya belum terdaftar di `invoke_handler` Rust.
 *
 * Tauri membalas kasus ini dengan string biasa, bukan AppError, jadi tidak
 * bisa dibedakan lewat `code`. Dipakai supaya fitur yang backend-nya belum
 * siap bisa bilang apa adanya, bukan menyalahkan server.
 */
export function isMissingCommand(error: unknown): boolean {
  return typeof error === "string" && /not found|not allowed/i.test(error);
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
