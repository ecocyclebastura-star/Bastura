import { defineStore } from "pinia";
import type { DraftImage } from "../composables/useContentDraft";
import type { ToastVariant } from "../composables/useToast";
import { invokeCommand } from "../utils/invokeCommand";
import { useWasteStore } from "./wasteStore";

/** Batas foto `add_catalog_with_photo_command` & `edit_catalog_command`. */
export const CATALOG_IMAGE_MAX_BYTES = 500 * 1024;

/** Bentuk `WasteCategory` dari src-tauri/src/models/waste_model.rs. */
export interface WasteCategoryOption {
  id_waste_category: number;
  category_name: string;
  ct_description: string | null;
}

/** Isian form Tambah/Edit Jenis Sampah. */
export interface CatalogInput {
  name: string;
  categoryId: number;
  /** Rupiah penuh per satuan. */
  price: number;
  /** Satuan harga; form-nya selalu per kg, tapi satuan lama tetap dibawa saat edit. */
  unit: string;
  description: string;
  image?: DraftImage | null;
}

function toPayload(input: CatalogInput) {
  return {
    name: input.name.trim(),
    category_id: input.categoryId,
    unit: input.unit || "kg",
    price: input.price,
    // String kosong (bukan null) supaya deskripsi yang dihapus admin ikut
    // terhapus; null dibaca edit_catalog_service sebagai "tidak diubah".
    description: input.description.trim(),
    file_name: input.image?.name ?? null,
    // Vec<u8> di Rust diterima sebagai array angka biasa dari sisi JS.
    file_bytes: input.image ? Array.from(input.image.bytes) : null,
  };
}

/**
 * Backend membalas Ok walaupun fotonya gagal terunggah (datanya sudah
 * tersimpan), cuma kalimatnya yang berbeda. Kalimat itu yang dipakai untuk
 * membedakan, supaya admin tahu fotonya perlu diunggah ulang.
 */
export function isPartialSuccess(message: string | null | undefined): boolean {
  return /gagal/i.test(message ?? "");
}

/**
 * Kelola katalog jenis sampah dari sisi admin, lewat command di
 * src-tauri/src/controllers/waste_controller.rs. Daftarnya memakai
 * `get_catalog_command` milik wasteStore, sama dengan halaman warga.
 */
export const useCatalogAdminStore = defineStore("catalogAdmin", {
  state: () => ({
    /** Kategori dari server; jarang berubah, jadi cukup ditarik sekali per sesi. */
    categories: [] as WasteCategoryOption[],

    /** Toast titipan untuk halaman daftar setelah form disimpan. */
    flashMessage: "",
    flashVariant: "success" as ToastVariant,
  }),

  actions: {
    async loadCategories() {
      if (this.categories.length) return this.categories;
      // Command ini membalas error berupa string biasa, bukan AppError.
      try {
        this.categories = await invokeCommand<WasteCategoryOption[]>(
          "get_waste_categories_command",
        );
      } catch (error) {
        throw typeof error === "string"
          ? { code: "API_ERROR", message: error, http_status: 0 }
          : error;
      }
      return this.categories;
    },

    create(input: CatalogInput) {
      return invokeCommand<string>("add_catalog_with_photo_command", {
        payload: toPayload(input),
      });
    },

    update(id: string, input: CatalogInput) {
      return invokeCommand<string>("edit_catalog_command", {
        payload: { id, ...toPayload(input) },
      });
    },

    async remove(id: string) {
      await invokeCommand<null>("delete_catalog_command", { id });
      const wasteStore = useWasteStore();
      wasteStore.items = wasteStore.items.filter((item) => item.id_waste !== id);
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
      this.categories = [];
      this.flashMessage = "";
    },
  },
});
