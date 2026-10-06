import { Context } from "hono";
import { getAiQuota } from "../../model/catalog/ai-quota-models";
import { sendcatalogResponse } from "../../logs/w_catalog/catalog-logs";

export const getAiQuotaController = async (c: Context) => {
    const action = "get_ai_quota";
    try {
        const payload = c.get('jwtPayload') as { sub: string, role: number };
        const sub = payload.sub;
        const role = payload.role;

        if (!sub) {
            return sendcatalogResponse(c, 401, 'SCAN_AI', 'error', action, 'Unauthorized', 'ID tidak ditemukan', null, 'UNAUTHORIZED');
        }

        // Jika superadmin (role === 3), selalu unlimited
        if (role === 3) {
            return c.json({
                status: 'success',
                message: 'Berhasil mengambil sisa kuota',
                data: {
                    remaining: "unlimited",
                    limit: "unlimited"
                }
            }, 200);
        }

        const scanLimit = parseInt(process.env.SCAN_LIMIT || "2", 10);
        const quotaInfo = await getAiQuota(sub, scanLimit);

        return c.json({
            status: 'success',
            message: 'Berhasil mengambil sisa kuota',
            data: {
                remaining: quotaInfo.remaining,
                limit: quotaInfo.limit
            }
        }, 200);

    } catch (error: any) {
        console.error("Error di get-quota-controller:", error);
        return sendcatalogResponse(c, 500, 'SCAN_AI', 'error', action, `Gagal mendapatkan kuota`, 'Terjadi kesalahan sistem', null, 'INTERNAL_SERVER_ERROR');
    }
};
