import { Hono } from 'hono';
import { checkAccessToken, adminOnly } from '../auth/middleware/auth-middleware';
import { initSplitbillsController } from '../controller/splitbills/init-splitbills-controller';
import { confirmSplitbillsController } from '../controller/splitbills/confirm-splitbills-controller';
import { getHistorySplitbillsController } from '../controller/splitbills/get-history-splitbills-controller';

const splitbillsApp = new Hono();

// Semua endpoint splitbills hanya untuk admin (role_id 2 & 3)
splitbillsApp.use('/*', checkAccessToken);

// GET /api/v1/splitbills/history
// Melihat riwayat pembagian dana
splitbillsApp.get('/history', adminOnly, getHistorySplitbillsController);

// POST /api/v1/splitbills/init
// Hitung preview: fee, dana bersih, daftar warga + estimasi alokasi
splitbillsApp.post('/init', adminOnly, initSplitbillsController);

// POST /api/v1/splitbills/confirm
// Konfirmasi & distribusikan dana ke saldo warga (alokasi final dari frontend)
splitbillsApp.post('/confirm', adminOnly, confirmSplitbillsController);

export default splitbillsApp;