import { onUnmounted, ref, watch } from "vue";
import type { Ref } from "vue";

/**
 * Salinan `source` yang baru ikut berubah setelah `delay` ms tanpa perubahan
 * lagi. Dipakai buat search bar: tiap huruf yang diketik menunda timer, jadi
 * command Tauri cuma dipanggil sekali setelah user berhenti mengetik --
 * bukan sekali per karakter.
 */
export function useDebouncedRef<T>(source: Ref<T>, delay = 400) {
  const debounced = ref(source.value) as Ref<T>;

  let timer: ReturnType<typeof setTimeout> | undefined;

  /** Batalkan perubahan yang masih mengantre. */
  function cancel() {
    clearTimeout(timer);
    timer = undefined;
  }

  /** Terapkan nilai terbaru sekarang juga, tanpa menunggu sisa delay. */
  function flush() {
    cancel();
    debounced.value = source.value;
  }

  watch(source, (value) => {
    cancel();
    timer = setTimeout(() => {
      timer = undefined;
      debounced.value = value;
    }, delay);
  });

  // Timer yang masih hidup setelah komponennya hilang cuma bikin update ref
  // yatim; dimatikan bareng komponennya.
  onUnmounted(cancel);

  return { debounced, cancel, flush };
}
