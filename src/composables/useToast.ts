import { onUnmounted, ref } from "vue";

export type ToastVariant = "warning" | "error" | "success";

/**
 * Toast satu slot: pesan baru menimpa pesan lama sekaligus me-reset timer.
 * Dipakai bareng komponen AlertToast.
 */
export function useToast(duration = 4000) {
  const toastMessage = ref("");
  const toastVariant = ref<ToastVariant>("warning");

  let timer: ReturnType<typeof setTimeout> | undefined;

  function showToast(message: string, variant: ToastVariant = "warning") {
    toastMessage.value = message;
    toastVariant.value = variant;
    clearTimeout(timer);
    timer = setTimeout(() => (toastMessage.value = ""), duration);
  }

  function hideToast() {
    clearTimeout(timer);
    toastMessage.value = "";
  }

  onUnmounted(() => clearTimeout(timer));

  return { toastMessage, toastVariant, showToast, hideToast };
}
