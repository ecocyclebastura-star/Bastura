import { defineStore } from "pinia";
import { invoke } from "@tauri-apps/api/core";

/**
 * Bentuk `CatalogItemLocal` dari src-tauri/src/models/waste_model.rs.
 *
 * Field-nya snake_case karena struct Rust-nya diserialisasi apa adanya (tidak
 * ada `rename_all`), dan hampir semuanya Option -> nullable di sini.
 */
export interface CatalogItem {
  id_waste: string;
  name: string | null;
  category_id: number | null;
  /** Satuan harga, mis. "kg". */
  unit: string | null;
  /** Harga per satuan dalam rupiah penuh; di SQLite disimpan sebagai INTEGER. */
  price: number | null;
  description: string | null;
  /**
   * Cuma nama file di server. Mengambilnya butuh header Authorization
   * (lihat sync_catalog_from_server), jadi nilai ini TIDAK bisa dipakai
   * langsung sebagai src <img> -- yang dipakai `image_base64`.
   */
  catalog_img: string | null;
  /** Data URI hasil unduhan backend, sudah siap dipasang di <img>. */
  image_base64: string | null;
}

export interface CatalogQuery {
  search?: string;
  categoryId?: number | null;
}

/**
 * Jembatan ke `get_catalog_command` di
 * src-tauri/src/controllers/waste_controller.rs.
 *
 * Sama seperti konten: command-nya offline-first. Backend menjalankan smart
 * sync dulu, tapi hasilnya selalu dibaca dari cache SQLite -- kalau servernya
 * mati atau HP-nya offline, command tetap balas data terakhir dan bukan error.
 */
export const useWasteStore = defineStore("waste", {
  state: () => ({
    /** Hasil pemanggilan terakhir; dipakai halaman detail biar tidak menarik ulang. */
    items: [] as CatalogItem[],
  }),

  actions: {
    /**
     * Nama argumennya camelCase: Tauri yang mengubahnya jadi `search_query`
     * dan `category_id` di sisi Rust.
     */
    async listCatalog({ search, categoryId }: CatalogQuery = {}) {
      const items = await invoke<CatalogItem[]>("get_catalog_command", {
        searchQuery: search?.trim() || null,
        categoryId: categoryId ?? null,
      });

      this.items = items;
      return items;
    },

    /**
     * Cari satu item buat halaman detail. Dicek dulu dari hasil yang sudah ada
     * di memori; kalau tidak ketemu (mis. halamannya dibuka langsung lewat URL)
     * baru tarik ulang katalognya.
     */
    async findCatalogItem(id: string): Promise<CatalogItem | null> {
      const cached = this.items.find((item) => item.id_waste === id);
      if (cached) return cached;

      const list = await this.listCatalog();
      return list.find((item) => item.id_waste === id) ?? null;
    },
  },
});
