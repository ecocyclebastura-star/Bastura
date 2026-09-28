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

const SESI_BERAKHIR = "Sesi kamu sudah berakhir. Silakan masuk kembali.";
const SERVER_BERMASALAH = "Server sedang bermasalah. Coba lagi sebentar lagi.";
const DATA_TIDAK_DITEMUKAN = "Data yang dicari tidak ditemukan.";
const DATA_TIDAK_VALID = "Data yang dikirim tidak valid. Periksa kembali isiannya.";
const BUKAN_ADMIN = "Akses ditolak. Fitur ini hanya untuk admin.";
const ULANG_PEMBAGIAN = "Data pembagian tidak valid. Mulai ulang pembagian dari langkah Input Data.";

/**
 * Kalimat per kode error dari server (bastura-api, branch `server`).
 *
 * Pesan asli server campur aduk: sebagian Inggris ("User not found",
 * "Internal Server Error"), sebagian menyebut nama field ("total_dana wajib
 * diisi"), dan beberapa service Rust meneruskan body JSON-nya mentah-mentah.
 * Karena itu kodenya diterjemahkan sendiri ke bahasa pengguna. Kode yang
 * tidak ada di sini tetap memakai pesan server selama lolos `isReadable`.
 */
const SERVER_CODE_MESSAGES: Record<string, string> = {
  // Sesi & akses
  TOKEN_INVALID: SESI_BERAKHIR,
  ERR_UNAUTHORIZED: SESI_BERAKHIR,
  REFRESH_TOKEN_INVALID_OR_EXPIRED: SESI_BERAKHIR,
  REFRESH_TOKEN_NOT_FOUND: SESI_BERAKHIR,
  ERR_ACCESS_DENIED: BUKAN_ADMIN,
  ERR_NOT_ADMIN: BUKAN_ADMIN,
  ACCESS_DENIED_UR_NOT_ADMIN: BUKAN_ADMIN,
  ADMIN_NOT_FOUND: "Akun admin tidak ditemukan. Coba masuk kembali.",
  ERR_ADMIN_NOT_FOUND: "Akun admin tidak ditemukan. Coba masuk kembali.",

  // Umum
  INTERNAL_SERVER_ERROR: SERVER_BERMASALAH,
  BAD_REQUEST: DATA_TIDAK_VALID,
  REQUEST_INVALID: DATA_TIDAK_VALID,
  DATA_TYPE_INVALID: DATA_TIDAK_VALID,
  NOT_FOUND: DATA_TIDAK_DITEMUKAN,
  DATA_NOT_FOUND: DATA_TIDAK_DITEMUKAN,
  ID_NOT_FOUND: DATA_TIDAK_DITEMUKAN,

  // Warga & jadwal
  USER_NOT_FOUND: "Data pengguna tidak ditemukan.",
  ERR_USER_NOT_FOUND: "Data pengguna tidak ditemukan.",
  ERR_WARGA_NOT_FOUND: "Data warga tidak ditemukan.",
  ERR_GET_WARGA: "Gagal memuat data warga. Coba lagi sebentar lagi.",
  ERR_UNBLOCK_USER: "Gagal membuka blokir warga. Coba lagi sebentar lagi.",
  ERR_MISSING_USER_ID: "Warga belum dipilih.",
  ERR_JADWAL_INSERTION: "Gagal menyimpan jadwal. Coba lagi sebentar lagi.",
  ERR_MISSING_TIME: "Jam jadwal wajib diisi.",
  ERR_OPENING_SCH_FETCHED: "Gagal memuat jadwal. Coba lagi sebentar lagi.",
  ADMIN_CONTACT_NOT_FOUND: "Kontak admin belum tersedia.",

  // Saldo & penarikan
  INSUFFICIENT_BALANCE: "Saldo kamu tidak mencukupi untuk penarikan ini.",
  WITHDRAWAL_NOT_FOUND: "Permintaan penarikan tidak ditemukan. Mungkin sudah diproses atau dibatalkan.",
  ERR_WD_NOT_FOUND: "Permintaan penarikan tidak ditemukan. Mungkin sudah diproses atau dibatalkan.",
  INVALID_AMOUNT: "Nominal tidak valid. Masukkan angka lebih dari nol.",

  // Bagi hasil setoran (splitbills)
  NO_WARGA_FOUND:
    "Tidak ada warga yang menyetor sampah pada rentang tanggal ini. Coba pilih rentang tanggal lain.",
  FEE_NOT_FOUND:
    "Nilai pajak belum diatur. Hubungi super admin untuk mengaturnya terlebih dahulu.",
  NO_ALLOCATIONS: "Daftar penerima dana masih kosong. Tambahkan minimal satu warga.",
  REMAINING_NOT_ZERO: "Dana belum terbagi habis. Pastikan sisa dana Rp0 sebelum dibagikan.",
  ADMIN_IN_ALLOCATION: "Akun admin tidak boleh menerima pembagian dana.",
  INVALID_USER_IN_ALLOCATION: ULANG_PEMBAGIAN,
  INVALID_FORMAT: ULANG_PEMBAGIAN,
  MISSING_PARAMS: "Data belum lengkap. Isi total dana dan rentang tanggal terlebih dahulu.",

  // Profil & password
  INVALID_OLD_PASSWORD: "Password lama yang kamu masukkan salah.",
  SAME_PASSWORD: "Password baru tidak boleh sama dengan password lama.",
  PASSWORD_MISMATCH: "Password baru dan konfirmasinya tidak sama.",
  MISSING_FIELDS: "Semua kolom password wajib diisi.",

  // Foto
  FILE_NOT_FOUND: "Foto tidak ditemukan.",
  FORBIDDEN_PATH: "Foto tidak dapat diakses.",
  INVALID_FILENAME: "Nama file foto tidak valid.",
  INVALID_FILE_TYPE: "Tipe file tidak didukung. Pilih file gambar.",
  INVALID_FILE_SIZE: "Ukuran foto terlalu besar. Pilih foto yang lebih kecil.",
};

/** Cek apakah error dari `invoke` memang AppError, bukan error JS biasa. */
export function toAppError(error: unknown): AppErrorResponse | null {
  if (typeof error !== "object" || error === null) return null;
  const candidate = error as Partial<AppErrorResponse>;
  return typeof candidate.code === "string" ? (candidate as AppErrorResponse) : null;
}

/** Panjang wajar satu kalimat toast; lebih dari ini hampir pasti dump teknis. */
const MAX_MESSAGE_LENGTH = 160;

interface ServerBody {
  code: string | null;
  message: string | null;
}

/**
 * Ambil body JSON server yang terselip di pesan error.
 *
 * Beberapa service di src-tauri meneruskan body respons apa adanya, dengan
 * awalan yang berbeda-beda: `HTTP Status: 400 Bad Request - {...}` di
 * service admin, `Init Split Bill gagal: {...}` di service split bill.
 * Karena itu JSON-nya dicari di mana pun letaknya, bukan dari awalan
 * tertentu. Null kalau pesannya tidak memuat JSON yang bisa dibaca.
 */
function parseServerBody(message: string): ServerBody | null {
  const start = message.indexOf("{");
  const end = message.lastIndexOf("}");
  if (start === -1 || end <= start) return null;

  try {
    const parsed = JSON.parse(message.slice(start, end + 1)) as {
      code?: unknown;
      message?: unknown;
    };
    return {
      code: typeof parsed.code === "string" ? parsed.code : null,
      // Sebagian endpoint memakai `message` sebagai pembungkus data, bukan
      // kalimat, jadi yang bukan string dianggap tidak ada.
      message: typeof parsed.message === "string" ? parsed.message.trim() : null,
    };
  } catch {
    return null;
  }
}

/**
 * Tanda pesan yang masih "bahasa mesin": sisa JSON, awalan HTTP/service,
 * nama field (snake_case), atau kalimat bahasa Inggris dari server.
 */
const TECHNICAL_RE =
  /[{}]|HTTP Status|split ?bill|\w+_\w+|:\s*$|\b(?:internal server error|unauthorized|not found|bad request|failed|required|invalid|expired|error|response|data is|the)\b/i;

/** Kalimat server boleh tampil apa adanya kalau pendek dan bukan bahasa mesin. */
function isReadable(message: string | null | undefined): message is string {
  const text = message?.trim() ?? "";
  return text.length > 0 && text.length <= MAX_MESSAGE_LENGTH && !TECHNICAL_RE.test(text);
}

/**
 * Kode error asli dari server, entah diteruskan Rust lewat `code` atau
 * masih terselip di body JSON pada `message`. Berguna untuk halaman yang
 * perlu bereaksi khusus pada satu kasus, misal NO_WARGA_FOUND.
 */
export function serverErrorCode(error: unknown): string | null {
  const appError = toAppError(error);
  if (!appError) return null;
  return parseServerBody(appError.message ?? "")?.code ?? appError.code;
}

/**
 * Ubah error dari `invoke` jadi kalimat yang siap ditampilkan di toast.
 *
 * Urutannya: kode teknis Rust (OVERRIDE_MESSAGES), lalu kode server yang
 * sudah diterjemahkan (SERVER_CODE_MESSAGES), lalu pesan server kalau
 * layak dibaca. Selain itu `fallback` yang dipakai -- lebih baik umum tapi
 * manusiawi daripada JSON mentah atau bahasa Inggris.
 */
export function resolveAuthError(error: unknown, fallback: string): string {
  const appError = toAppError(error);
  if (!appError) return fallback;

  if (appError.code in OVERRIDE_MESSAGES) {
    return OVERRIDE_MESSAGES[appError.code];
  }

  const body = parseServerBody(appError.message ?? "");
  const translated =
    SERVER_CODE_MESSAGES[appError.code] ??
    (body?.code ? SERVER_CODE_MESSAGES[body.code] : undefined);
  if (translated) return translated;

  const candidate = body ? body.message : appError.message;
  return isReadable(candidate) ? candidate.trim() : fallback;
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
