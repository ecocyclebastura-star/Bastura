import { ref, shallowRef, watch } from "vue";
import { resolveAuthError } from "../constants/authErrors";
import { useDebouncedRef } from "./useDebouncedRef";

export interface SearchableListOptions {
  /** Lama diam sebelum command dipanggil, dalam ms. */
  delay?: number;
  /** Pesan cadangan kalau errornya bukan AppError (misal IPC putus). */
  fallbackError?: string;
}

/**
 * Daftar isi halaman yang bisa dicari lewat command Tauri.
 *
 * Tiap command pencarian di backend ikut menjalankan smart sync (yang berarti
 * satu request ke server), jadi pemanggilannya sengaja direm di tiga lapis:
 *
 * 1. Debounce -- request baru dikirim setelah user berhenti mengetik.
 * 2. Dedupe   -- kata kunci yang setelah di-trim sama dengan yang barusan
 *                dipakai tidak dikirim ulang.
 * 3. Nomor urut -- respons yang datang telat dibuang supaya hasil lama tidak
 *                menimpa hasil terbaru di layar.
 */
export function useSearchableList<T>(
  fetcher: (search: string) => Promise<T[]>,
  options: SearchableListOptions = {},
) {
  const {
    delay = 400,
    fallbackError = "Gagal memuat data. Coba lagi sebentar lagi.",
  } = options;

  const searchTerm = ref("");
  const items = shallowRef<T[]>([]);
  const loading = ref(true);
  const errorMessage = ref("");

  const { debounced, cancel, flush } = useDebouncedRef(searchTerm, delay);

  let latestRequest = 0;
  /** Kata kunci yang terakhir benar-benar dikirim ke backend. */
  let lastFetched: string | null = null;

  async function run(term: string) {
    const requestId = ++latestRequest;
    lastFetched = term;
    loading.value = true;
    errorMessage.value = "";

    try {
      const result = await fetcher(term);
      if (requestId !== latestRequest) return;
      items.value = result;
    } catch (error) {
      if (requestId !== latestRequest) return;
      errorMessage.value = resolveAuthError(error, fallbackError);
      items.value = [];
    } finally {
      if (requestId === latestRequest) loading.value = false;
    }
  }

  watch(debounced, (value) => {
    const term = value.trim();
    // Nambah/hapus spasi di ujung tidak mengubah hasil, jadi tidak usah
    // bolak-balik ke backend.
    if (term === lastFetched) return;
    run(term);
  });

  /** Enter di search bar: langsung cari, tidak usah tunggu sisa debounce. */
  function submit() {
    flush();
  }

  function clearSearch() {
    cancel();
    searchTerm.value = "";
    if (lastFetched !== "") run("");
  }

  /** Muat ulang kata kunci yang sedang aktif, mis. setelah tombol "coba lagi". */
  function reload() {
    cancel();
    run(searchTerm.value.trim());
  }

  // Muatan pertama tidak perlu di-debounce: belum ada yang diketik.
  run("");

  return { searchTerm, items, loading, errorMessage, submit, clearSearch, reload };
}
