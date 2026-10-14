import { defineStore } from "pinia";
import { invokeCommand } from "../utils/invokeCommand";

/** Bentuk `ScanWasteAiItem` dari src-tauri/src/models/waste_model.rs. */
export interface ScanItem {
  catalog_id: string | null;
  name: string;
  condition: string;
  price_per_kg: number;
  /** Bank sampah mau menerima barang ini. */
  accepted: boolean;
  confidence: number;
}

/** Bentuk `ScanWasteAiResponse`. */
export interface ScanResponse {
  status: string;
  message: string | null;
  items: ScanItem[];
  disclaimer: string | null;
}

export type ScanOutcome = "recognized" | "blurry" | "unrecognized";

/** Batas `scan_waste_ai_command`. */
export const SCAN_IMAGE_MAX_BYTES = 5 * 1024 * 1024;

/** Format yang diterima `scan_waste_ai_service`. */
export const SCAN_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

/** Di bawah ini hasil AI dianggap tebakan, biasanya karena fotonya buram. */
const MIN_CONFIDENCE = 0.4;

const BLURRY_RE = /blur|buram|kurang jelas|tidak jelas|unclear|low quality/i;

/** Confidence bisa datang sebagai 0-1 maupun 0-100; disamakan jadi 0-1. */
export function normalizeConfidence(value: number): number {
  return value > 1 ? value / 100 : value;
}

/** Barang yang paling yakin dikenali AI. */
export function primaryItem(response: ScanResponse): ScanItem | null {
  return (
    [...response.items].sort(
      (a, b) => normalizeConfidence(b.confidence) - normalizeConfidence(a.confidence),
    )[0] ?? null
  );
}

/**
 * Terjemahkan balasan AI ke tiga kemungkinan di desain. Server belum punya
 * kode khusus untuk foto buram, jadi ditebak dari kalimatnya dan dari
 * confidence yang terlalu rendah.
 */
export function classifyScan(response: ScanResponse): ScanOutcome {
  const text = `${response.status} ${response.message ?? ""}`;
  if (BLURRY_RE.test(text)) return "blurry";

  const best = primaryItem(response);
  if (!best) return "unrecognized";
  if (normalizeConfidence(best.confidence) < MIN_CONFIDENCE) return "blurry";
  return "recognized";
}

/**
 * Fitur scan sampah warga, lewat `scan_waste_ai_command`.
 *
 * Batas scan per hari dijaga server; kalau jatahnya habis, command-nya gagal
 * dengan HTTP 429 dan halaman scan tinggal menampilkan pesannya.
 */
export const useScanStore = defineStore("scan", {
  state: () => ({
    /** Hasil scan terakhir untuk halaman hasil. */
    result: null as ScanResponse | null,
    /** Object URL foto yang di-scan. */
    resultImage: "",
  }),

  actions: {
    async scan(image: Blob, fileName: string): Promise<ScanResponse> {
      const bytes = new Uint8Array(await image.arrayBuffer());
      const response = await invokeCommand<ScanResponse>("scan_waste_ai_command", {
        // Vec<u8> di Rust diterima sebagai array angka biasa dari sisi JS.
        payload: { file_name: fileName, file_bytes: Array.from(bytes) },
      });
      return { ...response, items: response.items ?? [] };
    },

    setResult(response: ScanResponse, imageUrl: string) {
      this.clearResult();
      this.result = response;
      this.resultImage = imageUrl;
    },

    clearResult() {
      if (this.resultImage) URL.revokeObjectURL(this.resultImage);
      this.result = null;
      this.resultImage = "";
    },
  },
});
