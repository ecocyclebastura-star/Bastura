import { onUnmounted, ref, watch } from "vue";
import type { Ref } from "vue";
import type { PreparedImage } from "../utils/imageFile";

export interface DraftImage {
  name: string;
  bytes: Uint8Array;
}

export interface ContentDraftOptions {
  /** Draft cuma berlaku di form Tambah; form Edit langsung menyimpan ke server. */
  enabled: () => boolean;
  /** Isian teks form; perubahan di sini memicu simpan draft. */
  source: () => unknown;
  /** Form masih kosong -> tidak ada yang perlu disimpan. */
  isEmpty: () => boolean;
  /** Foto lampiran form. Foto dari draft yang dipulihkan juga ditaruh di sini. */
  image: Ref<PreparedImage | null>;
  /**
   * Simpan ke SQLite lewat command `save_draft_*`. `image` cuma dikirim kalau
   * fotonya berubah sejak simpanan terakhir; `removeImage` kalau fotonya
   * dibuang.
   */
  save: (draftId: string, image: DraftImage | null, removeImage: boolean) => Promise<unknown>;
  remove: (draftId: string) => Promise<unknown>;
  /** Jeda diam sebelum draft ditulis, dalam ms. */
  delay?: number;
}

function newDraftId(): string {
  return typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `draft-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/**
 * Draft konten (pengumuman & edukasi) yang tersimpan otomatis di perangkat.
 *
 * Selama form Tambah diisi, isiannya ditulis ke SQLite beberapa saat setelah
 * admin berhenti mengetik. Keluar dari form tidak menghilangkan tulisan, dan
 * waktu form Tambah dibuka lagi draft terakhir dipulihkan. Draft dihapus
 * begitu kontennya berhasil dipublikasikan atau sengaja dibuang.
 */
export function useContentDraft(options: ContentDraftOptions) {
  const { delay = 800 } = options;

  const draftId = ref(newDraftId());
  /** Form ini sedang melanjutkan draft lama. */
  const restored = ref(false);

  /** Draft dengan id ini sudah pernah ditulis ke SQLite. */
  let persisted = false;
  /** Foto berubah sejak simpanan terakhir. */
  let imageDirty = false;
  /** Pemulihan sedang mengisi form; perubahan dari situ bukan ketikan admin. */
  let suspended = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let pending = false;

  async function write() {
    clearTimeout(timer);
    pending = false;
    if (!options.enabled()) return;

    if (options.isEmpty()) {
      if (persisted) {
        await options.remove(draftId.value);
        persisted = false;
      }
      return;
    }

    const image = options.image.value;
    const sendImage = imageDirty && image ? { name: image.name, bytes: image.bytes } : null;
    const removeImage = imageDirty && !image;

    await options.save(draftId.value, sendImage, removeImage);
    persisted = true;
    if (imageDirty) imageDirty = false;
  }

  function schedule() {
    if (suspended || !options.enabled()) return;
    pending = true;
    clearTimeout(timer);
    timer = setTimeout(() => {
      // Gagal menulis draft tidak perlu mengganggu admin yang sedang
      // mengetik; percobaan berikutnya ikut ketikan selanjutnya.
      write().catch((error) => console.warn("Draft gagal disimpan:", error));
    }, delay);
  }

  watch(options.source, schedule, { deep: true });
  watch(options.image, () => {
    if (suspended) return;
    imageDirty = true;
    schedule();
  });

  /**
   * Pulihkan draft terbaru. `apply` mengisi form dari isi draft; foto draft
   * (kalau ada) dipasang ke `options.image` oleh pemanggil di dalam `apply`.
   */
  async function restore<D extends { draft_id: string }>(
    list: () => Promise<D[]>,
    apply: (draft: D) => void,
  ): Promise<boolean> {
    const drafts = await list();
    const latest = drafts[0];
    if (!latest) return false;

    suspended = true;
    try {
      apply(latest);
      draftId.value = latest.draft_id;
      persisted = true;
      imageDirty = false;
      restored.value = true;
    } finally {
      // Watcher baru jalan setelah tick ini, jadi penanda dilepas sesudahnya.
      setTimeout(() => (suspended = false));
    }
    return true;
  }

  /** Tulis sisa perubahan yang belum sempat tersimpan, mis. saat keluar form. */
  async function flush(): Promise<boolean> {
    if (!pending) return persisted;
    await write();
    return persisted;
  }

  /** Buang draft ini (setelah publish berhasil, atau admin membuangnya). */
  async function discard() {
    clearTimeout(timer);
    pending = false;
    if (persisted) await options.remove(draftId.value);
    persisted = false;
    restored.value = false;
    draftId.value = newDraftId();
  }

  /** Masih ada draft tersimpan untuk isian ini. */
  const hasDraft = () => persisted && !options.isEmpty();

  onUnmounted(() => clearTimeout(timer));

  return { draftId, restored, restore, flush, discard, hasDraft };
}
