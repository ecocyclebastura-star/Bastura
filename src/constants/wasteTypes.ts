/**
 * Daftar jenis sampah beserta estimasi harganya.
 *
 * SEMUA ISI FILE INI MASIH DUMMY. Backend belum punya tabel/command jenis
 * sampah (lihat src-tauri/src/controllers/), jadi datanya ditaruh di frontend
 * dulu supaya halamannya bisa jalan dan didemokan.
 *
 * Bentuk field-nya sengaja dibikin mirip response konten yang sudah ada
 * (snake_case, `image_url` + `image_base64`; lihat ContentBase di
 * stores/contentStore.ts). Jadi begitu command-nya jadi, yang perlu diubah
 * cuma sumber datanya -- tipe & komponennya tinggal dipakai apa adanya.
 *
 * Harga di bawah diambil dari mockup desain, bukan dari daftar harga resmi.
 * Gambar & deskripsi memang belum ada: keduanya dibiarkan kosong supaya
 * tampil sebagai placeholder, bukan diisi karangan.
 */

import { formatRupiah } from "../utils/formatters";

/** Nilai khusus buat chip "Semua": tidak menyaring apa pun. */
export const ALL_WASTE_CATEGORIES = "";

/** Daftar chip filter, urutannya mengikuti desain. */
export const WASTE_CATEGORIES = [
  { value: ALL_WASTE_CATEGORIES, label: "Semua" },
  { value: "Plastik PET", label: "Plastik PET" },
  { value: "Plastik Non-PET", label: "Plastik Non-PET" },
  { value: "Plastik Lunak", label: "Plastik Lunak" },
  { value: "Kertas & Kardus", label: "Kertas & Kardus" },
  { value: "Logam", label: "Logam" },
  { value: "Kaca", label: "Kaca" },
  { value: "Elektronik", label: "Elektronik" },
  { value: "Lainnya", label: "Lainnya" },
] as const;

export interface WasteType {
  id: string;
  name: string;
  /** Salah satu label di WASTE_CATEGORIES. */
  category: string;
  /** Estimasi harga per kilogram dalam rupiah; null = harganya belum ada. */
  price_per_kg: number | null;
  /** Kosong selama teksnya belum ada; halaman detail menampilkan placeholder. */
  description: string;
  image_url: string | null;
  image_base64?: string | null;
}

/**
 * Delapan nama pertama disalin dari mockup; sisanya ditambahkan supaya tiap
 * chip kategori punya isi waktu dites. Semuanya tetap dummy.
 */
export const WASTE_TYPES: WasteType[] = [
  {
    id: "besi-keropos",
    name: "Besi Keropos",
    category: "Logam",
    price_per_kg: 1500,
    description: "",
    image_url: null,
  },
  {
    id: "besi-super",
    name: "Besi Super (kualitas masih bagus)",
    category: "Logam",
    price_per_kg: 2500,
    description: "",
    image_url: null,
  },
  {
    id: "blowing-hdpe",
    name: "Blowing/HDPE",
    category: "Plastik Non-PET",
    price_per_kg: 700,
    description: "",
    image_url: null,
  },
  {
    id: "botol-bersih-biru",
    name: "Botol Bersih Biru",
    category: "Plastik PET",
    price_per_kg: 2000,
    description: "",
    image_url: null,
  },
  {
    id: "botol-bersih-putih",
    name: "Botol Bersih Putih",
    category: "Plastik PET",
    price_per_kg: 2300,
    description: "",
    image_url: null,
  },
  {
    id: "botol-bersih-warna-campur",
    name: "Botol Bersih Warna Campur",
    category: "Plastik PET",
    price_per_kg: 1200,
    description: "",
    image_url: null,
  },
  {
    id: "botol-bir-bintang-besar",
    name: "Botol Bir Bintang Besar",
    category: "Kaca",
    price_per_kg: 200,
    description: "",
    image_url: null,
  },
  {
    id: "botol-bir-kecil",
    name: "Botol Bir Kecil",
    category: "Kaca",
    price_per_kg: 100,
    description: "",
    image_url: null,
  },
  {
    id: "plastik-kresek",
    name: "Plastik Kresek",
    category: "Plastik Lunak",
    price_per_kg: null,
    description: "",
    image_url: null,
  },
  {
    id: "kardus",
    name: "Kardus",
    category: "Kertas & Kardus",
    price_per_kg: null,
    description: "",
    image_url: null,
  },
  {
    id: "kabel-bekas",
    name: "Kabel Bekas",
    category: "Elektronik",
    price_per_kg: null,
    description: "",
    image_url: null,
  },
  {
    id: "lain-lain",
    name: "Lain-lain",
    category: "Lainnya",
    price_per_kg: null,
    description: "",
    image_url: null,
  },
];

/**
 * Estimasi harga siap tampil, mis. "Rp1.500/kg". Harga yang belum ada
 * ditampilkan sebagai placeholder, bukan "Rp0" -- gratis dan belum diisi itu
 * dua hal yang berbeda.
 */
export function formatHargaPerKg(value: number | null | undefined): string {
  return value == null ? "Belum ada" : `${formatRupiah(value)}/kg`;
}

/** Dipakai halaman detail; null kalau id-nya tidak dikenal. */
export function findWasteType(id: string): WasteType | null {
  return WASTE_TYPES.find((item) => item.id === id) ?? null;
}
