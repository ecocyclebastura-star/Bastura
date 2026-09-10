import { defineStore } from "pinia";

/**
 * Jadwal setor sampah yang diumumkan admin ke warga.
 *
 * TODO: pindahkan ke backend kalau command-nya sudah ada. Sementara jadwalnya
 * disimpan lokal (localStorage lewat plugin persist) supaya alur "Edit ->
 * Konfirmasi" di dashboard sudah bisa dipakai dan tidak hilang saat aplikasi
 * ditutup. Bentuk field-nya sengaja mengikuti nilai mentah <input>: "date"
 * yyyy-mm-dd dan "time" HH:mm, jadi tinggal dioper balik ke form saat diedit.
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

export const useScheduleStore = defineStore("schedule", {
  state: (): SetorSchedule => ({
    date: "",
    time: "",
  }),

  getters: {
    /** Jadwalnya sudah pernah diisi admin. */
    isSet: (state) => Boolean(state.date && state.time),

    /**
     * Sisa hari menuju jadwal. `null` kalau belum diatur, 0 kalau hari ini,
     * dan tetap 0 kalau tanggalnya sudah lewat -- angka minus tidak ada
     * artinya buat label "n hari lagi".
     */
    daysLeft(state): number | null {
      const target = parseLocalDate(state.date);
      if (!target) return null;

      const selisih = target.getTime() - startOfToday().getTime();
      return Math.max(0, Math.round(selisih / SEHARI_MS));
    },
  },

  actions: {
    save(schedule: SetorSchedule) {
      this.date = schedule.date;
      this.time = schedule.time;
    },
  },

  persist: true,
});
