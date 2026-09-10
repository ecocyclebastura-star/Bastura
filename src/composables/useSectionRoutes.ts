import { computed } from "vue";
import { useRoute } from "vue-router";

/**
 * Awalan nama route sesuai bagian aplikasi yang sedang dibuka.
 *
 * Halaman di views/profile dipakai bareng warga dan admin -- tampilannya
 * memang sama persis. Yang berbeda cuma nama route-nya ("user-*" vs
 * "admin-*"), supaya masing-masing tetap berada di dalam shell dan bottom
 * navigation-nya sendiri. Awalan itu diturunkan dari path yang sedang aktif,
 * jadi komponen halamannya tidak perlu digandakan.
 */
export function useSectionRoutes() {
  const route = useRoute();

  const section = computed(() =>
    route.path.startsWith("/admin") ? "admin" : "user",
  );

  /** Mis. "profil" -> "user-profil" atau "admin-profil". */
  const routeName = (suffix: string) => `${section.value}-${suffix}`;

  return { section, routeName };
}
