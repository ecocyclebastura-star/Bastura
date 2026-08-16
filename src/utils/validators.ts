/** Aturan validasi form yang dipakai bareng di halaman auth. */

export const NAME_RE = /^[A-Za-z\s'.-]+$/;
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
export const PASSWORD_RE = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;
export const DIGITS_RE = /^\d+$/;

export const PASSWORD_HINT =
  "Gunakan minimal 8 karakter berupa huruf & angka";
export const EMAIL_HINT = "Format email masih salah! contoh: example@gmail.com";
