import { defineStore } from "pinia";
import type { DraftImage } from "../composables/useContentDraft";
import type { ToastVariant } from "../composables/useToast";
import { invokeCommand } from "../utils/invokeCommand";
import { useAuthStore } from "./authStore";
import { useContentStore } from "./contentStore";
import type { Announcement } from "./contentStore";

/** Batas foto `add/edit_announcement_command` di backend. */
export const ANNOUNCEMENT_IMAGE_MAX_BYTES = 2 * 1024 * 1024;

/** Bentuk `AnnouncementCategory` dari src-tauri/src/models/announcement_model.rs. */
export interface AnnouncementCategoryOption {
  id_category: string;
  name: string;
}

/** Bentuk `AnnouncementDraftResponse`. */
export interface AnnouncementDraft {
  draft_id: string;
  title: string | null;
  /** String JSON yang sama dengan `content` saat publish. */
  content: string | null;
  category_id: string | null;
  image_base64: string | null;
  updated_at: string;
}

/** Isian form Tambah/Edit Pengumuman. */
export interface AnnouncementInput {
  title: string;
  /** `id_category` dari server; kosong saat edit = kategori lama dibiarkan. */
  categoryId: string;
  /** Nama kategori yang dipilih, penentu flag `important` di `content`. */
  categoryName: string;
  text: string;
  /** Edit saja: penulis asli dipertahankan. */
  author?: string;
  /** Foto lampiran baru; kosong = foto lama dibiarkan (atau memang tanpa foto). */
  image?: DraftImage | null;
}

/**
 * `content` dikirim sebagai string JSON berbentuk `AnnouncementContent`
 * ({ text, author, important }). Kategorinya sendiri dikirim terpisah lewat
 * `category_id`.
 */
function toContent(input: Pick<AnnouncementInput, "text" | "categoryName" | "author">): string {
  return JSON.stringify({
    text: input.text.trim(),
    author: input.author || useAuthStore().user?.name || "",
    important: input.categoryName.trim().toLowerCase() === "penting",
  });
}

/** Kebalikan `toContent`, untuk memulihkan isi draft ke form. */
export function parseAnnouncementText(content: string | null | undefined): string {
  if (!content) return "";
  try {
    const parsed = JSON.parse(content) as { text?: unknown };
    return typeof parsed.text === "string" ? parsed.text : "";
  } catch {
    return content;
  }
}

/**
 * Kelola pengumuman dari sisi admin, lewat command di
 * src-tauri/src/controllers/announcement_controller.rs.
 *
 * Daftarnya memakai `get_announcements_command` yang sama dengan halaman warga.
 */
export const useAnnouncementAdminStore = defineStore("announcementAdmin", {
  state: () => ({
    /** Hasil daftar terakhir, dipakai form Edit tanpa menarik ulang. */
    items: [] as Announcement[],
    /** Kategori dari server, hasil tarikan terakhir. */
    categories: [] as AnnouncementCategoryOption[],

    /** Toast titipan untuk halaman daftar setelah form disimpan. */
    flashMessage: "",
    flashVariant: "success" as ToastVariant,
  }),

  actions: {
    async list(search: string) {
      this.items = await useContentStore().listAnnouncements({ search });
      return this.items;
    },

    /** Cek memori dulu; tarik ulang kalau form Edit dibuka langsung lewat URL. */
    async find(id: string): Promise<Announcement | null> {
      const cached = this.items.find((item) => item.id === id);
      if (cached) return cached;

      const all = await this.list("");
      return all.find((item) => item.id === id) ?? null;
    },

    /**
     * Ditarik ulang tiap form dibuka, supaya kategori yang baru ditambahkan di
     * server langsung bisa dipilih. Kalau gagal, daftar terakhir yang dipakai.
     */
    async loadCategories() {
      try {
        this.categories = await invokeCommand<AnnouncementCategoryOption[]>(
          "get_announcement_categories_command",
        );
      } catch (error) {
        if (!this.categories.length) throw error;
      }
      return this.categories;
    },

    create(input: AnnouncementInput) {
      return invokeCommand<string>("add_announcement_command", {
        payload: {
          title: input.title.trim(),
          content: toContent(input),
          category_id: input.categoryId,
          // Vec<u8> di Rust diterima sebagai array angka biasa dari sisi JS.
          file_bytes: input.image ? Array.from(input.image.bytes) : null,
          file_name: input.image?.name ?? null,
          // Foto draft sudah ikut di `image`, jadi draft dihapus sendiri
          // setelah publish (lihat useContentDraft) -- bukan oleh backend.
          draft_id: null,
        },
      });
    },

    update(id: string, input: AnnouncementInput) {
      return invokeCommand<string>("edit_announcement_command", {
        payload: {
          id,
          title: input.title.trim(),
          content: toContent(input),
          category_id: input.categoryId || null,
          file_bytes: input.image ? Array.from(input.image.bytes) : null,
          file_name: input.image?.name ?? null,
        },
      });
    },

    async remove(id: string) {
      await invokeCommand<string>("delete_announcement_command", { id });
      this.items = this.items.filter((item) => item.id !== id);
    },

    /* ------------------------------ DRAFT ------------------------------ */

    listDrafts() {
      return invokeCommand<AnnouncementDraft[]>("get_draft_announcements_command");
    },

    saveDraft(
      draftId: string,
      fields: Pick<AnnouncementInput, "title" | "text" | "categoryId" | "categoryName">,
      image: DraftImage | null,
      removeImage: boolean,
    ) {
      // Nama argumennya `draft`, bukan `payload`, mengikuti controller-nya.
      return invokeCommand<string>("save_draft_announcement_command", {
        draft: {
          draft_id: draftId,
          title: fields.title,
          content: toContent(fields),
          category_id: fields.categoryId || null,
          file_bytes: image ? Array.from(image.bytes) : null,
          file_name: image?.name ?? null,
          remove_image: removeImage,
        },
      });
    },

    deleteDraft(draftId: string) {
      return invokeCommand<string>("delete_draft_announcement_command", { draftId });
    },

    /* ------------------------------ FLASH ------------------------------ */

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
      this.items = [];
      this.categories = [];
      this.flashMessage = "";
    },
  },
});
