import { defineStore } from "pinia";
import { invoke } from "@tauri-apps/api/core";
import { resolveAuthError } from "../constants/authErrors";

/** Bentuk `AnnouncementContent` dari src-tauri/src/models/announcement_model.rs. */
export interface AnnouncementContent {
  text: string;
  author: string;
  important: boolean;
  /**
   * Belum ada di struct Rust-nya, jadi untuk sekarang selalu undefined.
   * Disiapkan di sini supaya filter kategori langsung jalan begitu backend
   * mulai mengirimkannya di dalam `content`.
   */
  category?: string;
}

/** Bentuk `EducationContent` dari src-tauri/src/models/education_model.rs. */
export interface EducationContent {
  tags: string[];
  text: string;
}

/**
 * Field-nya snake_case karena struct `*ClientResponse` di Rust diserialisasi
 * apa adanya (tidak ada `rename_all`).
 */
interface ContentBase {
  id: string;
  title: string;
  image_url: string | null;
  created_at: string;
}

export interface Announcement extends ContentBase {
  content: AnnouncementContent;
}

export interface Education extends ContentBase {
  content: EducationContent;
}

export interface ContentQuery {
  search?: string;
  limit?: number;
}

/** Jumlah kartu yang muat di carousel dashboard. */
const HIGHLIGHT_LIMIT = 5;

/**
 * Jembatan ke command konten di src-tauri/src/controllers/.
 *
 * Kedua command-nya offline-first: backend menjalankan smart sync dulu, lalu
 * hasilnya selalu diambil dari cache SQLite. Artinya sekalipun servernya mati
 * atau HP-nya offline, command tetap balas data (yang terakhir tersimpan)
 * dan bukan error -- jadi list kosong belum tentu berarti gagal.
 */
export const useContentStore = defineStore("content", {
  state: () => ({
    /** Konten untuk carousel dashboard. */
    announcements: [] as Announcement[],
    educations: [] as Education[],
    highlightsLoading: false,
    highlightsError: "",
  }),

  actions: {
    /** Pemanggil langsung command pengumuman. Kosongkan `search` buat ambil semua. */
    listAnnouncements({ search, limit }: ContentQuery = {}) {
      return invoke<Announcement[]>("get_announcements_command", {
        search: search?.trim() || null,
        limit: limit ?? null,
      });
    },

    /** Pemanggil langsung command edukasi. */
    listEducations({ search, limit }: ContentQuery = {}) {
      return invoke<Education[]>("get_education_command", {
        search: search?.trim() || null,
        limit: limit ?? null,
      });
    },

    /** Isi kedua carousel di dashboard. */
    async loadHighlights() {
      this.highlightsLoading = true;
      this.highlightsError = "";

      try {
        // Sengaja berurutan, bukan Promise.all: tiap command memicu smart sync
        // di backend, dan dua sync yang jalan barengan sama-sama membaca
        // `last_synced_at` yang masih lama -> servernya ditarik dua kali untuk
        // pembaruan yang sama.
        this.announcements = await this.listAnnouncements({
          limit: HIGHLIGHT_LIMIT,
        });
        this.educations = await this.listEducations({ limit: HIGHLIGHT_LIMIT });
      } catch (error) {
        this.highlightsError = resolveAuthError(
          error,
          "Gagal memuat konten terbaru. Coba lagi sebentar lagi.",
        );
      } finally {
        this.highlightsLoading = false;
      }
    },

    /**
     * Cari satu pengumuman buat halaman detail.
     *
     * Dicek dulu dari yang sudah ada di memori; kalau tidak ketemu (misal
     * halaman detailnya dibuka langsung lewat URL, atau id-nya cuma ada di
     * halaman daftar) baru tarik ulang daftarnya dari cache SQLite.
     */
    async findAnnouncement(id: string): Promise<Announcement | null> {
      const cached = this.announcements.find((item) => item.id === id);
      if (cached) return cached;

      const list = await this.listAnnouncements();
      return list.find((item) => item.id === id) ?? null;
    },

    /** Dipanggil saat logout / sesi habis supaya konten user lama tidak nyangkut. */
    reset() {
      this.announcements = [];
      this.educations = [];
      this.highlightsError = "";
    },
  },
});
