import { Hono } from 'hono';
import { checkAccessToken, superAdminOnly } from '../auth/middleware/auth-middleware';
import { getKomisiSummaryController, getKomisiDetailController, updateKomisiFeeController } from '../controller/komisi/komisi-controller';

const app = new Hono();

// Semua rute komisi membutuhkan auth dan superAdmin
app.use('/*', checkAccessToken, superAdminOnly);

// GET /api/v1/komisi/summary
app.get('/summary', getKomisiSummaryController);

// GET /api/v1/komisi/detail/:periode
app.get('/detail/:periode', getKomisiDetailController);

// PUT /api/v1/komisi/fee
app.put('/fee', updateKomisiFeeController);

export default app;
