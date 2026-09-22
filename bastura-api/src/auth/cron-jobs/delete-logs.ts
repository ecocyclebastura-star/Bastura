import cron from 'node-cron';
import { join } from 'node:path';

// Menggunakan path absolut agar tidak bergantung pada CWD saat runtime
const BASE_DIR = join(import.meta.dir, '../../logs');

const LOG_FILES = [
  join(BASE_DIR, 'profile/profileApp.log'),
  join(BASE_DIR, 'tsc/transactionApp.log'),
  join(BASE_DIR, 'auth/authApp.log'),
  join(BASE_DIR, 'w_catalogs/catalogApp.log'),
  join(BASE_DIR, 'edu/educationApp.log'),
  join(BASE_DIR, 'users_data/WargaApp.log'),
  join(BASE_DIR, 'anc/announcementsApp.log'),
];

const MAX_SIZE = 5 * 1024 * 1024;    // 5 MB
const KEEP_SIZE = 2.5 * 1024 * 1024; // 2.5 MB

async function truncateLog(filePath: string) {
  try {
    const file = Bun.file(filePath);

    if (await file.exists()) {
      const size = file.size;

      if (size > MAX_SIZE) {
        const start = size - KEEP_SIZE;
        const latestLogsBlob = file.slice(start, size);

        await Bun.write(filePath, latestLogsBlob);
        console.log(`[Log Manager] Berhasil memotong: ${filePath}`);
      }
    }
  } catch (error) {
    console.error(`[Log Manager] Gagal memotong ${filePath}:`, error);
  }
}

export function startLogRotationJob() {

  cron.schedule('0 0 * * *', async () => {
    console.log('[Log Manager] Memulai pengecekan log rotasi...');

    await Promise.all(LOG_FILES.map(file => truncateLog(file)));

    console.log('[Log Manager] Pengecekan log selesai.');
  });

  console.log('[Log Manager] Log rotation job aktif (setiap hari jam 00:00).');
}