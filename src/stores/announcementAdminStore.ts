import { defineStore } from "pinia";
import type { ToastVariant } from "../composables/useToast";
import { invokeCommand } from "../utils/invokeCommand";
import { useContentStore } from "./contentStore";
import type { Announcement } from "./contentStore";

/** Isian form Tambah/Edit Pengumuman. */
export interface AnnouncementInput {
  title: string;
  /** Salah satu kategori di constants/announcementCategories.ts. */
  category: string;
  text: string;
  /** Foto lampiran baru; kosong = foto lama dibiarkan (atau memang tanpa foto). */
  image?: { name: string; bytes: Uint8Array } | null;
  /** Edit saja: hapus foto lama tanpa menggantinya. */
  removeImage?: boolean;
}

/**
 * Bentuk payload untuk command tulis. `important` tetap dikirim karena
 * `AnnouncementContent` di Rust baru mengenal flag itu; `category` disiapkan
 * untuk field yang akan ditambahkan backend (lihat announcementCategories.ts).
 */
function toPayload(input: AnnouncementInput) {
  return {
    title: input.title.trim(),
    category: input.category,
    important: input.category === "Penting",
    text: input.text.trim(),
    image_name: input.image?.name ?? null,
    // Vec<u8> di Rust diterima sebagai array angka biasa dari sisi JS.
    image_bytes: input.image ? Array.from(input.image.bytes) : null,
    remove_image: Boolean(input.removeImage),
  };
}

/**
 * Kelola pengumuman dari sisi admin.
 *
 * Daftarnya memakai `get_announcements_command` yang sama dengan halaman
 * warga. Command tulisnya (tambah, ubah, hapus) BELUM ADA di src-tauri --
 * nama & bentuk payload di bawah adalah usulan frontend. Selama belum ada,
 * `invokeCommand` membalas COMMAND_UNAVAILABLE dan halamannya bilang apa adanya.
 */
export const useAnnouncementAdminStore = defineStore("announcementAdmin", {
  state: () => ({
    /** Hasil daftar terakhir, dipakai form Edit tanpa menarik ulang. */
    items: [] as Announcement[],

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

    create(input: AnnouncementInput) {
      return invokeCommand<unknown>("create_announcement_command", {
        payload: toPayload(input),
      });
    },

    update(id: string, input: AnnouncementInput) {
      return invokeCommand<unknown>("update_announcement_command", {
        payload: { id_announcements: id, ...toPayload(input) },
      });
    },

    async remove(id: string) {
      await invokeCommand<unknown>("delete_announcement_command", {
        idAnnouncements: id,
      });
      this.items = this.items.filter((item) => item.id !== id);
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
      this.items = [];
      this.flashMessage = "";
    },
  },
});
