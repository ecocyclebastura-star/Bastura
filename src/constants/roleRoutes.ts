/**
 * Peta role -> halaman awal setelah login.
 *
 * Nilai role-nya mengikuti hasil `decode_jwt_role` di backend, yang
 * mengembalikan "warga", "admin", atau "super admin" (default "warga").
 */
const ROLE_HOME_ROUTE: Record<string, string> = {
  warga: "dashboard-user",
  admin: "dashboard-admin",
  // TODO: arahkan ke halaman khusus kalau dashboard super admin sudah dibuat.
  "super admin": "dashboard-admin",
};

/** Role yang boleh membuka halaman admin. */
export const ADMIN_ROLES = ["admin", "super admin"];

export function homeRouteName(role: string): string {
  return ROLE_HOME_ROUTE[role.trim().toLowerCase()] ?? "dashboard-user";
}
