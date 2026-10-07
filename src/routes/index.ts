import { createRouter, createWebHistory } from "vue-router";
import type { RouteRecordRaw } from "vue-router";
import { ADMIN_ROLES, SUPER_ADMIN_ROLE, homeRouteName } from "../constants/roleRoutes";
import { useAuthStore } from "../stores/authStore";
import { useOnboardingStore } from "../stores/onboardingStore";

declare module "vue-router" {
  interface RouteMeta {
    /** Wajib sudah login. */
    requiresAuth?: boolean;
    /** Hanya untuk yang belum login (halaman auth). */
    guestOnly?: boolean;
    /** Kalau diisi, hanya role di daftar ini yang boleh masuk. */
    roles?: string[];
    /**
     * Sembunyikan bottom navigation. Dipakai halaman tugas (form & alur
     * beberapa langkah), supaya isian tidak hilang gara-gara tab tertekan dan
     * tombol utamanya tidak bersaing dengan bar. Halaman detail yang cuma
     * dibaca tetap menampilkannya.
     */
    hideTabBar?: boolean;
  }
}

/**
 * Cabang halaman profil, dipasang di bawah /user maupun /admin.
 *
 * Komponennya satu set yang sama (views/profile) karena desainnya memang
 * identik untuk kedua role. Yang dibedakan cuma awalan nama route, supaya
 * tiap role tetap berada di dalam shell dan bottom navigation-nya sendiri.
 * Awalan itu juga yang dibaca halamannya lewat `useSectionRoutes` waktu
 * menentukan tujuan menu.
 */
function profileRoutes(prefix: "user" | "admin"): RouteRecordRaw[] {
  return [
    {
      path: "profil",
      name: `${prefix}-profil`,
      component: () => import("../views/profile/profilView.vue"),
    },
    {
      path: "profil/edit",
      name: `${prefix}-edit-profil`,
      component: () => import("../views/profile/editProfilView.vue"),
      meta: { hideTabBar: true },
    },
    {
      path: "profil/ganti-password",
      name: `${prefix}-ganti-password`,
      component: () => import("../views/profile/gantiPasswordView.vue"),
      meta: { hideTabBar: true },
    },
    {
      path: "profil/nonaktif-akun",
      name: `${prefix}-nonaktif-akun`,
      component: () => import("../views/profile/nonaktifAkunView.vue"),
      meta: { hideTabBar: true },
    },
    {
      path: "profil/bantuan",
      name: `${prefix}-pusat-bantuan`,
      component: () => import("../views/profile/pusatBantuanView.vue"),
    },
    {
      path: "profil/bantuan/faq",
      name: `${prefix}-faq`,
      component: () => import("../views/profile/faqView.vue"),
    },
    {
      path: "profil/bantuan/tentang",
      name: `${prefix}-tentang`,
      component: () => import("../views/profile/tentangBasturaView.vue"),
    },
    {
      path: "profil/bantuan/hubungi",
      name: `${prefix}-hubungi-kami`,
      component: () => import("../views/profile/hubungiKamiView.vue"),
    },
  ];
}

const routes: RouteRecordRaw[] = [
  {
    path: "/",
    // Onboarding cuma buat yang belum pernah lihat; sisanya langsung login.
    redirect: () => {
      const onboardingStore = useOnboardingStore();
      return { name: onboardingStore.hasSeen ? "login" : "onboarding" };
    },
  },
  {
    path: "/onboarding",
    name: "onboarding",
    component: () => import("../views/auth/onboardingView.vue"),
    meta: { guestOnly: true },
  },
  {
    path: "/login",
    name: "login",
    component: () => import("../views/auth/loginView.vue"),
    meta: { guestOnly: true },
  },
  {
    path: "/register",
    name: "register",
    component: () => import("../views/auth/signUpView.vue"),
    meta: { guestOnly: true },
  },
  {
    path: "/forgot-password",
    name: "forgot-password",
    component: () => import("../views/auth/forgotPasswordView.vue"),
    meta: { guestOnly: true },
  },
  {
    path: "/reset-password",
    name: "reset-password",
    component: () => import("../views/auth/resetPasswordView.vue"),
    meta: { guestOnly: true },
    // Tanpa email tujuan OTP halaman ini tidak ada artinya.
    beforeEnter: (to) => (to.query.email ? true : { name: "forgot-password" }),
  },
  {
    // Semua halaman warga berbagi shell yang sama (konten + bottom nav).
    path: "/user",
    component: () => import("../layouts/UserLayout.vue"),
    meta: { requiresAuth: true },
    children: [
      {
        path: "",
        name: "dashboard-user",
        component: () => import("../views/user/dashboardUser.vue"),
      },
      {
        path: "pengumuman",
        name: "user-pengumuman",
        component: () => import("../views/user/pengumumanView.vue"),
      },
      {
        path: "pengumuman/:id",
        name: "user-pengumuman-detail",
        component: () => import("../views/user/detailPengumumanView.vue"),
      },
      {
        path: "jenis-sampah",
        name: "user-jenis-sampah",
        component: () => import("../views/user/jenisSampahView.vue"),
      },
      {
        path: "jenis-sampah/:id",
        name: "user-jenis-sampah-detail",
        component: () => import("../views/user/detailJenisSampahView.vue"),
      },
      {
        path: "edukasi",
        name: "user-edukasi",
        component: () => import("../views/user/edukasiView.vue"),
      },
      {
        path: "dompet",
        name: "user-dompet",
        component: () => import("../views/user/dompetView.vue"),
      },
      {
        path: "dompet/tarik-saldo",
        name: "user-tarik-saldo",
        component: () => import("../views/user/tarikSaldoView.vue"),
        meta: { hideTabBar: true },
      },
      {
        // Kamera layar penuh, jadi bottom nav disembunyikan.
        path: "scan",
        name: "user-scan",
        component: () => import("../views/user/scanView.vue"),
        meta: { hideTabBar: true },
      },
      {
        path: "scan/hasil",
        name: "user-scan-hasil",
        component: () => import("../views/user/hasilScanView.vue"),
        meta: { hideTabBar: true },
      },
      {
        path: "riwayat",
        name: "user-riwayat",
        component: () => import("../views/user/riwayatView.vue"),
      },
      {
        path: "riwayat/:id",
        name: "user-riwayat-detail",
        component: () => import("../views/user/detailTransaksiView.vue"),
      },
      ...profileRoutes("user"),
    ],
  },
  {
    // Shell role admin: sama polanya dengan /user, cuma bottom nav-nya beda.
    path: "/admin",
    component: () => import("../layouts/AdminLayout.vue"),
    meta: { requiresAuth: true, roles: ADMIN_ROLES },
    children: [
      {
        path: "",
        name: "dashboard-admin",
        component: () => import("../views/admin/dashboardAdmin.vue"),
      },
      {
        path: "warga",
        name: "admin-warga",
        component: () => import("../views/admin/wargaView.vue"),
      },
      {
        path: "warga/:id",
        name: "admin-warga-detail",
        component: () => import("../views/admin/detailWargaView.vue"),
      },
      {
        path: "setoran",
        name: "admin-setoran",
        component: () => import("../views/admin/setoranView.vue"),
      },
      {
        // Tambah & edit memakai satu form; bedanya ada tidaknya :id.
        path: "setoran/tambah",
        name: "admin-setoran-tambah",
        component: () => import("../views/admin/formSetoranView.vue"),
        meta: { hideTabBar: true },
      },
      {
        path: "setoran/:id/edit",
        name: "admin-setoran-edit",
        component: () => import("../views/admin/formSetoranView.vue"),
        meta: { hideTabBar: true },
      },
      {
        path: "setoran/bagi-hasil",
        name: "admin-setoran-bagi-hasil",
        component: () => import("../views/admin/bagiHasilInputView.vue"),
        meta: { hideTabBar: true },
      },
      {
        path: "setoran/bagi-hasil/riwayat",
        name: "admin-setoran-bagi-hasil-riwayat",
        component: () => import("../views/admin/bagiHasilRiwayatView.vue"),
      },
      {
        path: "setoran/bagi-hasil/alokasi",
        name: "admin-setoran-bagi-hasil-alokasi",
        component: () => import("../views/admin/bagiHasilAlokasiView.vue"),
        meta: { hideTabBar: true },
      },
      {
        path: "setoran/bagi-hasil/alokasi/:idUser",
        name: "admin-setoran-bagi-hasil-detail",
        component: () => import("../views/admin/bagiHasilDetailView.vue"),
        meta: { hideTabBar: true },
      },
      {
        path: "riwayat",
        name: "admin-riwayat",
        component: () => import("../views/admin/riwayatAdminView.vue"),
      },
      {
        path: "riwayat/:id",
        name: "admin-riwayat-detail",
        component: () => import("../views/admin/detailTransaksiAdminView.vue"),
      },
      {
        path: "pengumuman",
        name: "admin-pengumuman",
        component: () => import("../views/admin/pengumumanAdminView.vue"),
      },
      {
        // Tambah & edit memakai satu form; bedanya ada tidaknya :id.
        path: "pengumuman/tambah",
        name: "admin-pengumuman-tambah",
        component: () => import("../views/admin/formPengumumanView.vue"),
        meta: { hideTabBar: true },
      },
      {
        path: "pengumuman/:id/edit",
        name: "admin-pengumuman-edit",
        component: () => import("../views/admin/formPengumumanView.vue"),
        meta: { hideTabBar: true },
      },
      {
        // Tampilan detailnya sama persis dengan versi warga.
        path: "pengumuman/:id",
        name: "admin-pengumuman-detail",
        component: () => import("../views/user/detailPengumumanView.vue"),
      },
      {
        path: "verifikasi-penarikan",
        name: "admin-verifikasi-penarikan",
        component: () => import("../views/admin/verifikasiPenarikanView.vue"),
      },
      {
        path: "jenis-sampah",
        name: "admin-jenis-sampah",
        component: () => import("../views/admin/jenisSampahAdminView.vue"),
      },
      {
        // Tambah & edit memakai satu form; bedanya ada tidaknya :id.
        path: "jenis-sampah/tambah",
        name: "admin-jenis-sampah-tambah",
        component: () => import("../views/admin/formJenisSampahView.vue"),
        meta: { hideTabBar: true },
      },
      {
        path: "jenis-sampah/:id/edit",
        name: "admin-jenis-sampah-edit",
        component: () => import("../views/admin/formJenisSampahView.vue"),
        meta: { hideTabBar: true },
      },
      {
        // Tampilan detailnya sama persis dengan versi warga.
        path: "jenis-sampah/:id",
        name: "admin-jenis-sampah-detail",
        component: () => import("../views/user/detailJenisSampahView.vue"),
      },
      {
        path: "edukasi",
        name: "admin-edukasi",
        component: () => import("../views/admin/edukasiAdminView.vue"),
      },
      {
        // Tambah & edit memakai satu form; bedanya ada tidaknya :id.
        path: "edukasi/tambah",
        name: "admin-edukasi-tambah",
        component: () => import("../views/admin/formEdukasiView.vue"),
        meta: { hideTabBar: true },
      },
      {
        path: "edukasi/:id/edit",
        name: "admin-edukasi-edit",
        component: () => import("../views/admin/formEdukasiView.vue"),
        meta: { hideTabBar: true },
      },
      {
        path: "edukasi/:id",
        name: "admin-edukasi-detail",
        component: () => import("../views/admin/detailEdukasiView.vue"),
      },
      {
        // Besaran komisi cuma boleh dilihat & diatur super admin.
        path: "komisi",
        name: "admin-komisi",
        component: () => import("../views/admin/komisiView.vue"),
        meta: { roles: [SUPER_ADMIN_ROLE] },
      },
      {
        path: "komisi/edit",
        name: "admin-komisi-edit",
        component: () => import("../views/admin/komisiEditView.vue"),
        meta: { roles: [SUPER_ADMIN_ROLE], hideTabBar: true },
      },
      {
        path: "komisi/:periode",
        name: "admin-komisi-detail",
        component: () => import("../views/admin/komisiDetailView.vue"),
        meta: { roles: [SUPER_ADMIN_ROLE] },
      },
      ...profileRoutes("admin"),
      {
        // Kontak di halaman Hubungi Kami cuma boleh diubah super admin.
        path: "profil/bantuan/hubungi/edit",
        name: "admin-hubungi-kami-edit",
        component: () => import("../views/admin/editKontakView.vue"),
        meta: { roles: [SUPER_ADMIN_ROLE], hideTabBar: true },
      },
    ],
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

router.beforeEach((to) => {
  // Aman dipanggil di sini: pinia sudah di-install duluan di main.ts.
  const authStore = useAuthStore();

  if (to.meta.requiresAuth && !authStore.isLoggedIn) {
    return { name: "login" };
  }

  // Yang sudah login tidak perlu lihat halaman login/daftar lagi.
  if (to.meta.guestOnly && authStore.isLoggedIn) {
    return { name: homeRouteName(authStore.role) };
  }

  // Warga yang iseng buka /admin dilempar balik ke dashboard-nya sendiri.
  if (to.meta.roles && !to.meta.roles.includes(authStore.role.toLowerCase())) {
    return { name: homeRouteName(authStore.role) };
  }

  return true;
});

export default router;
