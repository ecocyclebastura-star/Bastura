import { defineStore } from "pinia";
import type { ToastVariant } from "../composables/useToast";
import { invokeCommand } from "../utils/invokeCommand";

/**
 * Bentuk struct di src-tauri/src/models/commission_model.rs.
 *
 * Angka-angkanya bertipe `serde_json::Value` di Rust, jadi bisa datang
 * sebagai number maupun string ("10.00") -- selalu lewat `toNumber` dulu.
 */
type JsonNumber = number | string | null;

export interface CommissionHistoryItem {
  /** "YYYY-MM". */
  periode: string;
  total_dana: JsonNumber;
  total_profit: JsonNumber;
  /** Mis. "5%" atau "5% & 10%" kalau tarifnya sempat berubah di bulan itu. */
  percentage_label: string | null;
}

export interface CommissionSummary {
  current_fee_percentage: JsonNumber;
  current_month_total_dana: JsonNumber;
  current_month_profit: JsonNumber;
  history: CommissionHistoryItem[];
}

export interface CommissionSegment {
  percentage: JsonNumber;
  total_fund: JsonNumber;
  commission: JsonNumber;
}

export interface CommissionDetail {
  periode: string;
  total_dana: JsonNumber;
  total_profit: JsonNumber;
  segments: CommissionSegment[];
}

interface ApiResponse<T> {
  status: string;
  message: string | null;
  data: T;
}

export function toNumber(value: unknown): number {
  const parsed = typeof value === "number" ? value : Number.parseFloat(String(value ?? ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

const PERSEN_FORMATTER = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 2 });

/** 10, "10.00" -> "10%"; 2.5 -> "2,5%". */
export function formatPersen(value: unknown): string {
  return `${PERSEN_FORMATTER.format(toNumber(value))}%`;
}

const PERIODE_FORMATTER = new Intl.DateTimeFormat("id-ID", { month: "long", year: "numeric" });

/**
 * "2026-06" -> "Juni 2026". Dipecah sendiri (bukan `new Date("2026-06")`)
 * karena string itu dibaca sebagai UTC dan bisa mundur sebulan di zona kita.
 */
export function formatPeriodeKomisi(periode: string): string {
  const parts = periode.trim().match(/^(\d{4})-(\d{2})$/);
  if (!parts) return periode;
  return PERIODE_FORMATTER.format(new Date(Number(parts[1]), Number(parts[2]) - 1, 1));
}

/** Periode bulan berjalan, "YYYY-MM". */
export function currentPeriode(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

/**
 * Komisi setoran, khusus super admin. Jembatan ke
 * src-tauri/src/controllers/commission_controller.rs.
 */
export const useCommissionStore = defineStore("commission", {
  state: () => ({
    summary: null as CommissionSummary | null,

    /** Toast titipan untuk halaman ringkasan setelah tarif diubah. */
    flashMessage: "",
    flashVariant: "success" as ToastVariant,
  }),

  actions: {
    async fetchSummary(limit: number, offset = 0) {
      const response = await invokeCommand<ApiResponse<CommissionSummary>>(
        "get_commission_summary_command",
        { limit, offset },
      );
      const data = { ...response.data, history: response.data.history ?? [] };
      if (offset === 0) this.summary = data;
      return data;
    },

    async fetchDetail(periode: string) {
      const response = await invokeCommand<ApiResponse<CommissionDetail>>(
        "get_commission_detail_command",
        { periode },
      );
      return { ...response.data, segments: response.data.segments ?? [] };
    },

    /**
     * `oldFee` adalah nilai yang terakhir dilihat admin. Server menolaknya
     * (OLD_FEE_MISMATCH) kalau tarifnya sudah diubah super admin lain duluan.
     */
    updateFee(newFee: string, oldFee: string) {
      return invokeCommand<Omit<ApiResponse<null>, "data">>("update_commission_fee_command", {
        payload: { new_fee: newFee, old_fee: oldFee },
      });
    },

    setFlash(message: string, variant: ToastVariant = "success") {
      this.flashMessage = message;
      this.flashVariant = variant;
    },

    takeFlash() {
      const flash = { message: this.flashMessage, variant: this.flashVariant };
      this.flashMessage = "";
      return flash;
    },

    reset() {
      this.summary = null;
      this.flashMessage = "";
    },
  },
});
