import { Sql } from "postgres";

/**
 * Menghitung nominal komisi dengan aritmetika integer (basis poin)
 * untuk menghindari deviasi presisi desimal (contoh: 100000 * 0.29 / 100 = 289.999 -> 289 alih-alih 290).
 * @param totalDana Total dana yang akan dipotong
 * @param feePercent Persentase fee (misal 2.50 atau "2.50")
 * @returns Nominal fee (dibulatkan ke bawah)
 */
export const hitungKomisi = (totalDana: number, feePercent: number | string): number => {
    const feeStr = typeof feePercent === 'string' ? feePercent : feePercent.toString();
    const feeFloat = parseFloat(feeStr);
    
    // Ubah jadi basis poin: 2.50% * 100 = 250 basis poin
    // Kita paka Math.round untuk menghindari deviasi (misal 2.9 * 100 = 289.9999 -> 290)
    const basisPoin = Math.round(feeFloat * 100); 

    // Hitung menggunakan BigInt: (total * basisPoin) / 10000
    const totalBig = BigInt(totalDana);
    const basisBig = BigInt(basisPoin);
    const feeBig = (totalBig * basisBig) / 10000n; // Pembagian BigInt otomatis membulat ke bawah (floor)

    return Number(feeBig);
};

/**
 * Normalisasi fee_persen dari body request. 
 * Menerima string/number, mengecek <= 2 desimal, range 0..100.
 * @param feeInput nilai input
 * @returns string "X.XX" yang siap dimasukkan ke DB atau dibandingkan, atau null jika tidak valid
 */
export const parseFeePercent = (feeInput: any): string | null => {
    if (feeInput === undefined || feeInput === null) return null;
    if (typeof feeInput !== 'string' && typeof feeInput !== 'number') return null;

    const str = feeInput.toString().trim();
    if (!str) return null;

    // Regex: hanya digit, opsional dot + 1-2 digit
    const regex = /^\d+(\.\d{1,2})?$/;
    if (!regex.test(str)) return null;

    const num = parseFloat(str);
    if (isNaN(num)) return null;
    if (num < 0 || num > 100) return null;

    return num.toFixed(2);
};

/**
 * Mengambil fee_persen (sebagai string desimal 2 angka) terbaru dari database
 * @param tx transaksi postgres
 * @returns string 'X.XX'
 */
export const getCurrentFee = async (tx: any): Promise<string | null> => {
    const feeRows = await tx`SELECT amount_fee FROM fee ORDER BY id_urutan DESC LIMIT 1`;
    if (feeRows.length === 0) return null;
    
    // Postgres numeric dikembalikan sebagai string oleh driver
    const amount = feeRows[0].amount_fee;
    const parsed = parseFloat(amount);
    if (isNaN(parsed)) return null;
    
    return parsed.toFixed(2);
};
