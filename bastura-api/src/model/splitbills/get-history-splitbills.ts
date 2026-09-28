import { sql } from '../connection';

export type SplitbillsHistory = {
    id_sb: string;
    total_sb: number;
    date_start: Date;
    date_end: Date;
    status: string;
    processed_at: Date;
    processed_by_name: string;
};

/**
 * Mengambil riwayat splitbills beserta nama admin yang memprosesnya
 */
export const getHistorySplitbills = async (): Promise<SplitbillsHistory[]> => {
    try {
        const result = await sql`
            SELECT 
                sb.id_sb,
                sb.total_sb,
                sb.date_start,
                sb.date_end,
                sb.status,
                sb.processed_at,
                u.name as processed_by_name
            FROM split_bills sb
            LEFT JOIN users u ON sb.processed_by = u.id_users
            ORDER BY sb.processed_at DESC
        `;
        return result as unknown as SplitbillsHistory[];
    } catch (error) {
        throw error;
    }
};
