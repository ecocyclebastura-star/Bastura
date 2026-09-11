import { defineStore } from "pinia";
import { invoke } from "@tauri-apps/api/core";
import { splitTanggalJamWita } from "../utils/formatters";

/** Bentuk `ScheduleItem` dari src-tauri/src/models/schedule_model.rs. */
export interface ScheduleItem {
  id_jadwal: number;
  setor_time: string;
  created_at: string;
  updated_at: string;
}

/** Bentuk `InsertJadwalResponseData` dari file yang sama. */
interface InsertJadwalResult {
  setor_time: string;
}

/**
 * Nilai mentah <input> di form jadwal: "date" yyyy-mm-dd dan "time" HH:mm,
 * jadi bisa langsung dioper balik ke form saat diedit.
 */
export interface SetorSchedule {
  date: string;
  time: string;
}

/** Tengah malam hari ini, dipakai sebagai titik nol hitung mundur. */
function startOfToday(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

/**
 * "yyyy-mm-dd" jadi Date lokal. Tidak lewat `new Date(string)` karena format
 * itu dibaca sebagai UTC, yang bisa menggeser tanggalnya sehari.
 */
function parseLocalDate(value: string): Date | null {
  const parts = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!parts) return null;

  const parsed = new Date(Number(parts[1]), Number(parts[2]) - 1, Number(parts[3]));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

const SEHARI_MS = 24 * 60 * 60 * 1000;

/**
 * Jadwal setor sampah yang diumumkan admin ke warga.
 *
 * Jembatan ke `get_jadwal_command` dan `insert_jadwal_command` di
 * src-tauri/src/controllers/schedule_controller.rs. Keduanya khusus admin
 * (dicek `require_admin` di Rust), dan tidak ada cache SQLite-nya -- jadi
 * `setor_time` terakhir disimpan di sini supaya kartunya tidak kosong sesaat
 * waktu dashboard dibuka ulang.
 */
export const useScheduleStore = defineStore("schedule", {
  state: () => ({
    /** `setor_time` mentah dari server; kosong berarti belum pernah diatur. */
    setorTime: "",
  }),

  getters: {
    date: (state) => splitTanggalJamWita(state.setorTime).date,
    time: (state) => splitTanggalJamWita(state.setorTime).time,

    /** Jadwalnya sudah pernah diisi admin. */
    isSet(): boolean {
      return Boolean(this.date && this.time);
    },

    /**
     * Sisa hari menuju jadwal. `null` kalau belum diatur, 0 kalau hari ini,
     * dan tetap 0 kalau tanggalnya sudah lewat -- angka minus tidak ada
     * artinya buat label "n hari lagi".
     */
    daysLeft(): number | null {
      const target = parseLocalDate(this.date);
      if (!target) return null;

      const selisih = target.getTime() - startOfToday().getTime();
      return Math.max(0, Math.round(selisih / SEHARI_MS));
    },
  },

  actions: {
    /**
     * Server membalas daftar jadwal; yang berlaku adalah yang terakhir
     * dimasukkan, yaitu `id_jadwal` terbesar.
     */
    async fetch() {
      const list = await invoke<ScheduleItem[]>("get_jadwal_command");
      const latest = list.reduce<ScheduleItem | null>(
        (best, item) => (!best || item.id_jadwal > best.id_jadwal ? item : best),
        null,
      );

      this.setorTime = latest?.setor_time ?? "";
    },

    /**
     * Mengedit jadwal = memasukkan jadwal baru; yang lama otomatis tergeser
     * karena `fetch` selalu mengambil yang terbaru.
     *
     * Format `time` yang dikirim "yyyy-mm-dd HH:mm:00" (WITA, tanpa zona),
     * sama seperti bentuk timestamp lain dari server.
     */
    async save({ date, time }: SetorSchedule) {
      const result = await invoke<InsertJadwalResult>("insert_jadwal_command", {
        time: `${date} ${time}:00`,
      });

      this.setorTime = result.setor_time;
    },

    reset() {
      this.setorTime = "";
    },
  },

  // Seperti store lain yang terikat sesi: ikut umur token, dan dibersihkan
  // authStore.clearCachedData waktu logout.
  persist: {
    storage: sessionStorage,
  },
});
