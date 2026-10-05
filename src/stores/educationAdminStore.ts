import { defineStore } from "pinia";
import type { ToastVariant } from "../composables/useToast";
import type { DraftImage } from "../composables/useContentDraft";
import { invokeCommand } from "../utils/invokeCommand";
import { useAuthStore } from "./authStore";
import { useContentStore } from "./contentStore";
import type { Education } from "./contentStore";

/** Batas foto `add/edit_education_command` di backend. */
export const EDUCATION_IMAGE_MAX_BYTES = 2 * 1024 * 1024;

/** Isian form Tambah/Edit Edukasi. */
export interface EducationInput {
  title: string;
  text: string;
  /** Edit saja: tag lama dibawa supaya tidak hilang, form-nya tidak punya kolom tag. */
  tags?: string[];
  /** Foto baru; kosong = foto lama dibiarkan (atau memang tanpa foto). */
  image?: DraftImage | null;
}

/** Bentuk `EducationDraftResponse` dari src-tauri/src/models/education_model.rs. */
export interface EducationDraft {
  draft_id: string;
  title: string | null;
  /** String JSON yang sama dengan `content` saat publish. */
  content: string | null;
  image_base64: string | null;
  updated_at: string;
}

/**
 * `content` dikirim sebagai string JSON berbentuk `EducationContent`
 * ({ tags, text }). `author` ikut disisipkan supaya nama penulis tersimpan
 * di server; struct Rust-nya belum membaca field itu, jadi untuk sekarang
 * daftar edukasi belum bisa menampilkannya.
 */
function toContent(text: string, tags: string[] = []): string {
  const author = useAuthStore().user?.name ?? "";
  return JSON.stringify({ tags, text: text.trim(), author });
}

/** Kebalikan `toContent`, untuk memulihkan isi draft ke form. */
export function parseEducationText(content: string | null | undefined): string {
  if (!content) return "";
  try {
    const parsed = JSON.parse(content) as { text?: unknown };
    return typeof parsed.text === "string" ? parsed.text : "";
  } catch {
    return content;
  }
}

/** Nama penulis kalau backend sudah meneruskannya di `content`. */
export function educationAuthor(item: Education): string {
  const author = (item.content as { author?: unknown }).author;
  return typeof author === "string" ? author.trim() : "";
}

/**
 * Kelola edukasi dari sisi admin, lewat command di
 * src-tauri/src/controllers/education_controller.rs.
 *
 * Daftarnya memakai `get_education_command` yang sama dengan halaman warga.
 */
export const useEducationAdminStore = defineStore("educationAdmin", {
  state: () => ({
    /** Hasil daftar terakhir, dipakai detail & form Edit tanpa menarik ulang. */
    items: [] as Education[],

    /** Toast titipan untuk halaman daftar setelah form disimpan. */
    flashMessage: "",
    flashVariant: "success" as ToastVariant,
  }),

  actions: {
    async list() {
      this.items = await useContentStore().listEducations();
      return this.items;
    },

    /** Cek memori dulu; tarik ulang kalau halamannya dibuka langsung lewat URL. */
    async find(id: string): Promise<Education | null> {
      const cached = this.items.find((item) => item.id === id);
      if (cached) return cached;

      const all = await this.list();
      return all.find((item) => item.id === id) ?? null;
    },

    create(input: EducationInput) {
      return invokeCommand<string>("add_education_command", {
        payload: {
          title: input.title.trim(),
          content: toContent(input.text),
          // Vec<u8> di Rust diterima sebagai array angka biasa dari sisi JS.
          file_bytes: input.image ? Array.from(input.image.bytes) : null,
          file_name: input.image?.name ?? null,
          // Foto draft sudah ikut di `image`, jadi draft dihapus sendiri
          // setelah publish (lihat useContentDraft) -- bukan oleh backend.
          draft_id: null,
        },
      });
    },

    update(id: string, input: EducationInput) {
      return invokeCommand<string>("edit_education_command", {
        payload: {
          id,
          title: input.title.trim(),
          content: toContent(input.text, input.tags),
          file_bytes: input.image ? Array.from(input.image.bytes) : null,
          file_name: input.image?.name ?? null,
        },
      });
    },

    async remove(id: string) {
      await invokeCommand<string>("delete_education_command", { id });
      this.items = this.items.filter((item) => item.id !== id);
    },

    /* ------------------------------ DRAFT ------------------------------ */

    listDrafts() {
      return invokeCommand<EducationDraft[]>("get_draft_educations_command");
    },

    saveDraft(
      draftId: string,
      fields: { title: string; text: string },
      image: DraftImage | null,
      removeImage: boolean,
    ) {
      return invokeCommand<string>("save_draft_education_command", {
        payload: {
          draft_id: draftId,
          title: fields.title,
          content: toContent(fields.text),
          file_bytes: image ? Array.from(image.bytes) : null,
          file_name: image?.name ?? null,
          remove_image: removeImage,
        },
      });
    },

    deleteDraft(draftId: string) {
      return invokeCommand<string>("delete_draft_education_command", { draftId });
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
      this.flashMessage = "";
    },
  },
});
