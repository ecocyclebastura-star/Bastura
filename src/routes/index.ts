import { createRouter, createWebHistory } from "vue-router";
import type { RouteRecordRaw } from "vue-router";
import { ADMIN_ROLES, homeRouteName } from "../constants/roleRoutes";
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
  }
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
    component: () => import("../views/onboardingView.vue"),
    meta: { guestOnly: true },
  },
  {
    path: "/login",
    name: "login",
    component: () => import("../views/loginView.vue"),
    meta: { guestOnly: true },
  },
  {
    path: "/register",
    name: "register",
    component: () => import("../views/signUpView.vue"),
    meta: { guestOnly: true },
  },
  {
    path: "/forgot-password",
    name: "forgot-password",
    component: () => import("../views/forgotPasswordView.vue"),
    meta: { guestOnly: true },
  },
  {
    path: "/reset-password",
    name: "reset-password",
    component: () => import("../views/resetPasswordView.vue"),
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
      },
      {
        path: "scan",
        name: "user-scan",
        component: () => import("../views/user/scanView.vue"),
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
      {
        path: "profil",
        name: "user-profil",
        component: () => import("../views/user/profilView.vue"),
      },
      {
        path: "profil/edit",
        name: "user-edit-profil",
        component: () => import("../views/user/editProfilView.vue"),
      },
      {
        path: "profil/ganti-password",
        name: "user-ganti-password",
        component: () => import("../views/user/gantiPasswordView.vue"),
      },
      {
        path: "profil/nonaktif-akun",
        name: "user-nonaktif-akun",
        component: () => import("../views/user/nonaktifAkunView.vue"),
      },
      {
        path: "profil/bantuan",
        name: "user-pusat-bantuan",
        component: () => import("../views/user/pusatBantuanView.vue"),
      },
      {
        path: "profil/bantuan/faq",
        name: "user-faq",
        component: () => import("../views/user/faqView.vue"),
      },
      {
        path: "profil/bantuan/tentang",
        name: "user-tentang",
        component: () => import("../views/user/tentangBasturaView.vue"),
      },
      {
        path: "profil/bantuan/hubungi",
        name: "user-hubungi-kami",
        component: () => import("../views/user/hubungiKamiView.vue"),
      },
    ],
  },
  {
    path: "/admin",
    name: "dashboard-admin",
    component: () => import("../views/admin/dashboardAdmin.vue"),
    meta: { requiresAuth: true, roles: ADMIN_ROLES },
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
