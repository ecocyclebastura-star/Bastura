import { defineStore } from "pinia";

/**
 * Menandai apakah onboarding sudah pernah dilihat di perangkat ini.
 *
 * Beda dengan authStore yang pakai sessionStorage: ini sengaja localStorage
 * (default plugin persist) karena onboarding cuma perlu muncul sekali,
 * walaupun aplikasinya ditutup dan dibuka lagi.
 */
export const useOnboardingStore = defineStore("onboarding", {
  state: () => ({
    hasSeen: false,
  }),

  actions: {
    markSeen() {
      this.hasSeen = true;
    },

    /** Berguna buat testing: paksa onboarding tampil lagi. */
    reset() {
      this.hasSeen = false;
    },
  },

  persist: true,
});
