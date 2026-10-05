import { sql } from "../connection";

export const claimAiQuota = async (userId: string, limit: number): Promise<{ success: boolean, remaining: number }> => {
    const result = await sql`
        INSERT INTO ai_scan_quotas (id_user, scan_date, scan_count)
        VALUES (${userId}, TIMEZONE('Asia/Makassar', now())::DATE, 1)
        ON CONFLICT (id_user, scan_date)
        DO UPDATE SET 
            scan_count = ai_scan_quotas.scan_count + 1,
            updated_at = now()
        WHERE ai_scan_quotas.scan_count < ${limit}
        RETURNING scan_count;
    `;

    if (result.length > 0) {
        return { success: true, remaining: limit - result[0].scan_count };
    }
    
    // Jika tidak ada baris yang dikembalikan, berarti terkena WHERE condition (kuota habis)
    return { success: false, remaining: 0 };
};

export const refundAiQuota = async (userId: string): Promise<void> => {
    await sql`
        UPDATE ai_scan_quotas
        SET scan_count = GREATEST(0, scan_count - 1),
            updated_at = now()
        WHERE id_user = ${userId} 
          AND scan_date = TIMEZONE('Asia/Makassar', now())::DATE;
    `;
};

export const getAiQuota = async (userId: string, limit: number): Promise<{ remaining: number, limit: number }> => {
    const result = await sql`
        SELECT scan_count FROM ai_scan_quotas
        WHERE id_user = ${userId} 
          AND scan_date = TIMEZONE('Asia/Makassar', now())::DATE;
    `;

    if (result.length > 0) {
        return { remaining: Math.max(0, limit - result[0].scan_count), limit };
    }
    
    return { remaining: limit, limit };
};
