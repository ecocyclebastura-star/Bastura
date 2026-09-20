/**
 * Penerjemah nilai mentah transaksi jadi bentuk yang siap ditampilkan.
 *
 * `jenis_transaksi` dan `status` diteruskan backend apa adanya sebagai String
 * (lihat src-tauri/src/models/transaction_model.rs) dan daftar nilainya belum
 * didokumentasikan. Karena itu pencocokannya sengaja longgar -- ejaan
 * Indonesia maupun Inggris sama-sama dikenali -- dan nilai yang tidak cocok
 * ditampilkan apa adanya, bukan dianggap error. Begitu daftar resmi dari
 * server jelas, cukup rapikan pola di file ini saja.
 */

/* ============================ JENIS TRANSAKSI ============================ */

export type TransactionKind = "setoran" | "penarikan" | "lainnya";

const SETORAN_RE = /setor|deposit|masuk/;
const PENARIKAN_RE = /tarik|narik|withdraw|wd|keluar/;

export function resolveKind(jenis: string | null | undefined): TransactionKind {
  const value = (jenis ?? "").toLowerCase();
  if (SETORAN_RE.test(value)) return "setoran";
  if (PENARIKAN_RE.test(value)) return "penarikan";
  return "lainnya";
}

/** Judul baris riwayat. Jenis tak dikenal memakai teks asli dari server. */
export function kindTitle(jenis: string | null | undefined): string {
  switch (resolveKind(jenis)) {
    case "setoran":
      return "Setoran Sampah";
    case "penarikan":
      return "Penarikan Saldo";
    default:
      return jenis?.trim() || "Transaksi";
  }
}

/**
 * Penarikan tidak punya rincian barang, jadi `deskripsi`-nya sering kosong.
 * Sesuai desain, baris itu tetap diberi keterangan "Saldo Dompet".
 */
export function kindSubtitle(
  jenis: string | null | undefined,
  deskripsi: string | null | undefined,
): string {
  const detail = deskripsi?.trim();
  if (detail) return detail;
  return resolveKind(jenis) === "penarikan" ? "Saldo Dompet" : "";
}

/** Setoran menambah saldo, penarikan mengurangi. */
export function kindSign(jenis: string | null | undefined): "+" | "-" | "" {
  switch (resolveKind(jenis)) {
    case "setoran":
      return "+";
    case "penarikan":
      return "-";
    default:
      return "";
  }
}

/* ================================ STATUS ================================ */

export interface StatusStyle {
  label: string;
  /** Kelas warna badge-nya, sesuai desain. */
  badgeClass: string;
}

const STATUS_STYLES = {
  disetujui: {
    label: "Disetujui",
    badgeClass: "border-primary-500 bg-primary-100 text-primary-500",
  },
  ditolak: {
    label: "Ditolak",
    badgeClass: "border-orange-500 bg-orange-50 text-orange-600",
  },
  diproses: {
    label: "Diproses",
    badgeClass: "border-blue-500 bg-blue-50 text-blue-600",
  },
  dibatalkan: {
    label: "Dibatalkan",
    badgeClass: "border-orange-600 bg-orange-600 text-white",
  },
} as const satisfies Record<string, StatusStyle>;

export type StatusKey = keyof typeof STATUS_STYLES;

/** Urutan cek penting: yang paling khusus lebih dulu. */
const STATUS_PATTERNS: Array<[RegExp, StatusKey]> = [
  [/batal|cancel/, "dibatalkan"],
  [/tolak|reject|gagal|fail/, "ditolak"],
  [/setuju|approve|berhasil|success|selesai|complete|done/, "disetujui"],
  [/proses|process|pending|tunggu|waiting/, "diproses"],
];

const UNKNOWN_STATUS: StatusStyle = {
  label: "",
  badgeClass: "border-neutral-300 bg-neutral-100 text-neutral-700",
};

/** null = statusnya belum dikenal pola mana pun. */
export function resolveStatusKey(
  status: string | null | undefined,
): StatusKey | null {
  const value = (status ?? "").trim().toLowerCase();
  if (!value) return null;

  return STATUS_PATTERNS.find(([pattern]) => pattern.test(value))?.[1] ?? null;
}

export function resolveStatus(status: string | null | undefined): StatusStyle {
  const key = resolveStatusKey(status);
  if (key) return STATUS_STYLES[key];

  // Status baru dari server tetap kelihatan, cuma tanpa warna khusus.
  const value = (status ?? "").trim();
  return {
    ...UNKNOWN_STATUS,
    label: value ? value[0].toUpperCase() + value.slice(1) : "-",
  };
}

/** Cuma penarikan yang belum disetujui yang boleh dibatalkan user. */
export function isCancelable(
  jenis: string | null | undefined,
  status: string | null | undefined,
): boolean {
  return resolveKind(jenis) === "penarikan" && resolveStatusKey(status) === "diproses";
}

/* =============================== FILTER ================================= */

/**
 * Chip filter halaman riwayat transaksi. `jenis` dan `status` dikirim langsung
 * sebagai argumen `get_transaction_history_command`; yang tidak diisi berarti
 * tidak ikut menyaring.
 *
 * Catatan: nilai yang dikirim ke server ("setoran"/"penarikan"/"pending")
 * masih tebakan mengikuti penamaan di backend -- samakan dengan daftar resmi
 * API kalau nanti hasil filternya kosong.
 */
export interface TransactionFilter {
  value: string;
  label: string;
  jenis?: string;
  status?: string;
}

export const TRANSACTION_FILTERS: readonly TransactionFilter[] = [
  { value: "setoran", label: "Setoran", jenis: "setoran" },
  { value: "penarikan", label: "Penarikan", jenis: "penarikan" },
  { value: "pending", label: "Pending", status: "pending" },
];

/**
 * Command transaksi admin (`get_all_transactions_admin_command` dan
 * `get_user_transactions_admin_command`) mengembalikan semua baris sekaligus
 * tanpa filter maupun cursor, jadi chip filternya dicocokkan di aplikasi.
 * Polanya sengaja sama dengan yang dipakai badge status supaya hasil saringan
 * dan label yang tampil tidak pernah berbeda.
 */
export function matchesQuery(
  item: { jenis_transaksi: string; status: string },
  query: { jenis?: string; status?: string },
): boolean {
  if (query.jenis && resolveKind(item.jenis_transaksi) !== resolveKind(query.jenis)) {
    return false;
  }
  if (query.status && resolveStatusKey(item.status) !== resolveStatusKey(query.status)) {
    return false;
  }
  return true;
}

/** Urutan daftar transaksi: yang terbaru di atas. */
export function byNewest(
  a: { tanggal_transaksi: string },
  b: { tanggal_transaksi: string },
): number {
  return (
    (Date.parse(b.tanggal_transaksi) || 0) - (Date.parse(a.tanggal_transaksi) || 0)
  );
}

/* ============================ HALAMAN DETAIL ============================ */

/**
 * Rincian setoran datang menyatu di satu kolom `deskripsi`, bentuknya
 * "<jenis sampah>/<berat>" -- mis. "Botol Bersih Biru/1kg". Dipisah di sini
 * supaya halaman detail bisa menampilkannya sebagai dua baris terpisah.
 * Deskripsi yang tidak mengikuti pola itu ditaruh utuh sebagai jenis sampah.
 */
export interface SetoranDetail {
  jenisSampah: string;
  berat: string;
}

export function parseSetoranDeskripsi(
  deskripsi: string | null | undefined,
): SetoranDetail {
  const value = deskripsi?.trim() ?? "";
  const separator = value.lastIndexOf("/");

  if (separator === -1) return { jenisSampah: value, berat: "" };

  return {
    jenisSampah: value.slice(0, separator).trim(),
    berat: value.slice(separator + 1).trim(),
  };
}

export interface TransactionDetailCopy {
  /** Judul besar di bawah logo, mis. "Transaksi diproses". */
  heading: string;
  /** Isi baris "Jenis transaksi". */
  jenisLabel: string;
  /** Isi baris "Status"; lebih panjang dari label badge di daftar. */
  statusText: string;
  /** Paragraf di bagian "Catatan". */
  note: string;
}

const HEADINGS: Record<StatusKey, string> = {
  disetujui: "Transaksi disetujui",
  ditolak: "Transaksi ditolak",
  diproses: "Transaksi diproses",
  dibatalkan: "Transaksi dibatalkan",
};

/**
 * Halaman detail transaksi dipakai bersama warga dan admin, padahal yang
 * membaca berbeda: warga melihat transaksinya sendiri ("saldo kamu"),
 * sedangkan admin sedang memeriksa transaksi milik orang lain. Naskahnya
 * karena itu dipisah per pembaca supaya admin tidak dikira pemilik transaksi.
 */
export type DetailAudience = "warga" | "admin";

/**
 * Keterangan status & catatan per kombinasi jenis dan status, mengikuti
 * naskah di desain. Kombinasi yang tidak digambar desain (mis. setoran yang
 * ditolak) tetap diisi kalimat sendiri supaya halamannya tidak kosong.
 */
const DETAIL_COPY: Record<
  DetailAudience,
  Record<"setoran" | "penarikan", Record<StatusKey, { statusText: string; note: string }>>
> = {
  warga: {
    penarikan: {
      diproses: {
        statusText: "Menunggu persetujuan admin",
        note: "Mohon tunggu sampai permintaan penarikan selesai diperiksa dan diverifikasi oleh admin.",
      },
      disetujui: {
        statusText: "Disetujui oleh admin",
        note: "Permintaan penarikan kamu sudah disetujui. Saldo telah diproses untuk penarikan.",
      },
      ditolak: {
        statusText: "Ditolak oleh admin",
        note: "Penarikan saldo ditolak oleh admin. Silakan hubungi admin jika membutuhkan informasi lebih lanjut.",
      },
      dibatalkan: {
        statusText: "Dibatalkan oleh anda",
        note: "Penarikan saldo dibatalkan atas permintaan anda sebelum diproses lebih lanjut.",
      },
    },
    setoran: {
      diproses: {
        statusText: "Menunggu hasil setoran",
        note: "Sampah kamu sudah diterima oleh petugas. Saat ini, setoran sedang menunggu hasil penjualan ke Bank Sampah Induk. Saldo akan ditambahkan setelah hasil penjualan diterima.",
      },
      disetujui: {
        statusText: "Disetujui",
        note: "Setoran kamu sudah selesai diproses. Hasil penjualan sampah telah ditambahkan ke saldo kamu.",
      },
      ditolak: {
        statusText: "Ditolak oleh admin",
        note: "Setoran ini ditolak oleh admin. Silakan hubungi admin jika membutuhkan informasi lebih lanjut.",
      },
      dibatalkan: {
        statusText: "Dibatalkan",
        note: "Setoran ini dibatalkan sebelum hasil penjualannya selesai diproses.",
      },
    },
  },
  admin: {
    penarikan: {
      diproses: {
        statusText: "Menunggu verifikasi admin",
        note: "Permintaan penarikan ini belum diverifikasi. Periksa saldo warga di halaman Verifikasi Penarikan sebelum menyetujui atau menolaknya.",
      },
      disetujui: {
        statusText: "Disetujui oleh admin",
        note: "Permintaan penarikan warga sudah disetujui dan saldonya diproses untuk penarikan.",
      },
      ditolak: {
        statusText: "Ditolak oleh admin",
        note: "Permintaan penarikan ini ditolak. Warga masih dapat mengajukan penarikan baru bila diperlukan.",
      },
      dibatalkan: {
        statusText: "Dibatalkan oleh warga",
        note: "Warga membatalkan sendiri penarikan ini sebelum sempat diverifikasi admin.",
      },
    },
    setoran: {
      diproses: {
        statusText: "Menunggu hasil setoran",
        note: "Sampah sudah diterima petugas dan setorannya menunggu hasil penjualan ke Bank Sampah Induk. Saldo warga bertambah setelah hasil penjualan diterima.",
      },
      disetujui: {
        statusText: "Disetujui",
        note: "Setoran ini sudah selesai diproses. Hasil penjualan sampah telah ditambahkan ke saldo warga.",
      },
      ditolak: {
        statusText: "Ditolak oleh admin",
        note: "Setoran ini ditolak. Siapkan alasannya bila warga menanyakannya lewat kontak admin.",
      },
      dibatalkan: {
        statusText: "Dibatalkan",
        note: "Setoran ini dibatalkan sebelum hasil penjualannya selesai diproses.",
      },
    },
  },
};

/** Jenis transaksi versi kalimat, dipakai di baris rincian halaman detail. */
const JENIS_LABEL: Record<TransactionKind, string> = {
  setoran: "Setoran sampah",
  penarikan: "Penarikan saldo",
  lainnya: "",
};

export function detailCopy(
  jenis: string | null | undefined,
  status: string | null | undefined,
  audience: DetailAudience = "warga",
): TransactionDetailCopy {
  const kind = resolveKind(jenis);
  const statusKey = resolveStatusKey(status);
  const fallbackStatus = resolveStatus(status).label;

  const copy =
    kind === "lainnya" || !statusKey ? null : DETAIL_COPY[audience][kind][statusKey];

  return {
    heading: statusKey ? HEADINGS[statusKey] : "Detail transaksi",
    jenisLabel: JENIS_LABEL[kind] || (jenis?.trim() ?? ""),
    statusText: copy?.statusText ?? fallbackStatus,
    note: copy?.note ?? "",
  };
}
