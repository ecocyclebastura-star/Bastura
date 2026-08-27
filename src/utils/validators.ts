/** Aturan validasi form yang dipakai bareng di halaman auth. */

export const NAME_RE = /^[A-Za-z\s'.-]+$/;
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
export const PASSWORD_RE = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;
export const DIGITS_RE = /^\d+$/;

export const PASSWORD_HINT =
  "Gunakan minimal 8 karakter berupa huruf & angka";
export const EMAIL_HINT = "Format email masih salah! contoh: example@gmail.com";

/** Nama orang: huruf, spasi, apostrof, titik, dan strip. Tanpa angka. */
export const NAME_HINT = "Nama tidak boleh menggunakan karakter atau angka";

/** Nomor HP Indonesia: hanya angka, diawali 08, panjang wajar. */
export const PHONE_RE = /^08\d{8,13}$/;
export const PHONE_HINT = "No. HP tidak boleh menggunakan karakter atau huruf";
export const PHONE_FORMAT_HINT = "No. HP harus diawali 08 dan 10-15 digit";
