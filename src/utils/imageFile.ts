/**
 * Penyiapan foto sebelum dikirim ke command Tauri.
 *
 * Batas ukuran tiap command di backend berbeda-beda dan jauh lebih kecil dari
 * foto kamera HP pada umumnya: katalog 500 KB, pengumuman & edukasi 2 MB,
 * scan AI 5 MB. Supaya admin/warga tidak disuruh mengecilkan foto sendiri,
 * foto yang kebesaran diperkecil di sini lewat canvas -- dimensinya diturunkan
 * dan disimpan ulang sebagai JPEG sampai muat.
 */

export interface PreparedImage {
  name: string;
  bytes: Uint8Array;
  /** Object URL untuk pratinjau; wajib di-revoke pemakainya. */
  preview: string;
}

export const IMAGE_TYPES = ["image/jpeg", "image/png"];

/** Batas berkas yang boleh dipilih user, sesuai teks di desain. */
export const MAX_PICK_BYTES = 5 * 1024 * 1024;

export class ImageFileError extends Error {}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new ImageFileError("Foto tidak bisa dibaca. Coba pilih foto lain."));
    img.src = src;
  });
}

function toBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new ImageFileError("Gagal memproses foto."))),
      "image/jpeg",
      quality,
    );
  });
}

/** Ganti ekstensi nama berkas jadi .jpg, karena hasil kompresinya selalu JPEG. */
function asJpegName(name: string): string {
  const base = name.replace(/\.[^.]+$/, "") || "foto";
  return `${base}.jpg`;
}

/**
 * Perkecil gambar sampai ukurannya <= maxBytes.
 *
 * Kualitas diturunkan dulu (lebih tidak kelihatan bedanya), baru dimensinya
 * kalau masih kebesaran. Latar transparan PNG diisi putih, karena JPEG tidak
 * punya kanal alfa dan defaultnya jadi hitam.
 */
export async function compressImage(
  source: Blob,
  maxBytes: number,
  maxDimension = 1600,
): Promise<Blob> {
  const url = URL.createObjectURL(source);
  try {
    const img = await loadImage(url);
    let scale = Math.min(1, maxDimension / Math.max(img.naturalWidth, img.naturalHeight));

    for (let attempt = 0; attempt < 6; attempt++) {
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));

      const ctx = canvas.getContext("2d");
      if (!ctx) throw new ImageFileError("Gagal memproses foto.");
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      for (const quality of [0.85, 0.7, 0.55]) {
        const blob = await toBlob(canvas, quality);
        if (blob.size <= maxBytes) return blob;
      }
      scale *= 0.7;
    }

    throw new ImageFileError("Foto terlalu besar. Coba pilih foto lain.");
  } finally {
    URL.revokeObjectURL(url);
  }
}

/**
 * Validasi + kompresi satu berkas pilihan user.
 *
 * @param maxBytes batas dari backend; foto di atas ini diperkecil otomatis.
 */
export async function prepareImage(
  file: File,
  maxBytes: number,
  types: readonly string[] = IMAGE_TYPES,
): Promise<PreparedImage> {
  if (!types.includes(file.type)) {
    throw new ImageFileError("Format foto harus JPG atau PNG.");
  }
  if (file.size > MAX_PICK_BYTES) {
    throw new ImageFileError("Ukuran foto maksimal 5 MB.");
  }

  let blob: Blob = file;
  let name = file.name || "foto.jpg";
  if (file.size > maxBytes) {
    blob = await compressImage(file, maxBytes);
    name = asJpegName(name);
  }

  return {
    name,
    bytes: new Uint8Array(await blob.arrayBuffer()),
    preview: URL.createObjectURL(blob),
  };
}

/**
 * Data URI (mis. `image_base64` dari draft) jadi bytes + nama berkas, supaya
 * foto yang tersimpan di draft bisa dikirim ulang lewat command publish.
 */
export function dataUriToImage(dataUri: string, baseName = "lampiran"): PreparedImage | null {
  const match = dataUri.match(/^data:([^;,]+)?(;base64)?,([\s\S]*)$/);
  if (!match || !match[2]) return null;

  const mime = match[1] ?? "image/jpeg";
  const binary = atob(match[3]);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

  const ext = mime === "image/png" ? "png" : "jpg";
  return {
    name: `${baseName}.${ext}`,
    bytes,
    preview: URL.createObjectURL(new Blob([bytes], { type: mime })),
  };
}

/** Pesan yang aman ditampilkan dari error penyiapan foto. */
export function imageErrorMessage(error: unknown): string {
  return error instanceof ImageFileError ? error.message : "Foto tidak bisa diproses. Coba pilih foto lain.";
}
