/**
 * Siapa boleh melihat dan melakukan apa di halaman kelola warga.
 *
 * - Badge role (Warga/Admin): cuma super admin.
 * - Badge "Diblokir": admin dan super admin.
 * - Angkat/turunkan admin: cuma super admin.
 * - Blokir/buka blokir warga: admin dan super admin, dan sasarannya harus
 *   warga -- akun admin tidak diblokir langsung, role-nya dicabut dulu.
 *
 * Aturan ini cuma menentukan tampilan. Penjaga yang sebenarnya tetap di
 * backend, karena command bisa dipanggil tanpa lewat tombol.
 */
import { ADMIN_ROLES, isSuperAdmin } from "./roleRoutes";

export type AccountRole = "warga" | "admin" | "super admin";

export const ROLE_LABELS: Record<AccountRole, string> = {
  warga: "Warga",
  admin: "Admin",
  "super admin": "Super Admin",
};

/** Role tak dikenal dianggap warga, sama seperti default `decode_jwt_role`. */
export function normalizeRole(role: string | null | undefined): AccountRole {
  const value = (role ?? "").trim().toLowerCase();
  return value === "admin" || value === "super admin" ? value : "warga";
}

function isAdminRole(role: string): boolean {
  return ADMIN_ROLES.includes(role.trim().toLowerCase());
}

interface Target {
  id: string;
  role: string;
}

export function canSeeRoleBadge(viewerRole: string): boolean {
  return isSuperAdmin(viewerRole);
}

export function canSeeBlockedBadge(viewerRole: string): boolean {
  return isAdminRole(viewerRole);
}

/** Super admin mengangkat warga atau mencabut admin, tapi bukan dirinya sendiri. */
export function canManageAdminRole(
  viewerRole: string,
  viewerId: string,
  target: Target,
): boolean {
  if (!isSuperAdmin(viewerRole) || target.id === viewerId) return false;
  return normalizeRole(target.role) !== "super admin";
}

export function canBlockWarga(
  viewerRole: string,
  viewerId: string,
  target: Target,
): boolean {
  if (!isAdminRole(viewerRole) || target.id === viewerId) return false;
  return normalizeRole(target.role) === "warga";
}
