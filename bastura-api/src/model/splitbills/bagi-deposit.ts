export interface DepositKandidat {
    id_deposit: string;
    weight_dp: string | number;
    price: string | number;
    created_at: string | Date;
}

export interface HasilBagiDeposit {
    id_deposit: string;
    amount_sb: number;
}

/**
 * Membagi `finalAmount` ke sejumlah `deposits` secara proporsional
 * menggunakan metode Largest Remainder dengan basis operasi BigInt murni
 * untuk menghindari kesalahan pecahan float.
 */
export function bagiDeposit(finalAmount: number, deposits: DepositKandidat[]): HasilBagiDeposit[] {
    if (deposits.length === 0) {
        throw new Error("Tidak ada deposit untuk dibagi");
    }
    
    const F = BigInt(finalAmount);
    
    // Parse valueUnits
    const parsed = deposits.map(d => {
        const w = Number(d.weight_dp);
        const p = BigInt(d.price);
        // Kalikan 100 agar presisi desimal 2 angka di belakang koma (DECIMAL(10,2)) jadi bulat
        const weightX100 = BigInt(Math.round(w * 100));
        const valueUnits = weightX100 * p;
        
        const created_at = d.created_at instanceof Date 
            ? d.created_at.getTime() 
            : new Date(d.created_at).getTime();
            
        return {
            id_deposit: d.id_deposit,
            created_at,
            valueUnits,
            floor: 0n,
            remainder: 0n,
        };
    });
    
    const V = parsed.reduce((acc, curr) => acc + curr.valueUnits, 0n);
    
    if (V > 0n) {
        for (const d of parsed) {
            d.floor = (d.valueUnits * F) / V;
            d.remainder = (d.valueUnits * F) % V;
        }
        
        const sumFloor = parsed.reduce((acc, curr) => acc + curr.floor, 0n);
        const R = Number(F - sumFloor); // Sisa akan selalu kurang dari jumlah deposit, muat di Number
        
        // Urutkan sisa (desc), lalu created_at (asc, terlama pertama), lalu id_deposit
        const sorted = [...parsed].sort((a, b) => {
            if (a.remainder !== b.remainder) {
                return a.remainder < b.remainder ? 1 : -1;
            }
            if (a.created_at !== b.created_at) {
                return a.created_at - b.created_at;
            }
            return a.id_deposit.localeCompare(b.id_deposit);
        });
        
        for (let i = 0; i < R; i++) {
            sorted[i].floor += 1n;
        }
    } else {
        // Kasus V == 0 (semua berat 0 atau harga 0)
        const count = BigInt(parsed.length);
        const floorEqual = F / count;
        const remainderEqual = Number(F % count);
        
        for (const d of parsed) {
            d.floor = floorEqual;
        }
        
        // Urutkan created_at (asc, terlama pertama), lalu id_deposit
        const sorted = [...parsed].sort((a, b) => {
            if (a.created_at !== b.created_at) {
                return a.created_at - b.created_at;
            }
            return a.id_deposit.localeCompare(b.id_deposit);
        });
        
        for (let i = 0; i < remainderEqual; i++) {
            sorted[i].floor += 1n;
        }
    }
    
    // Verifikasi atomik
    const sumAllocated = parsed.reduce((acc, curr) => acc + curr.floor, 0n);
    if (sumAllocated !== F) {
        throw new Error("Total alokasi tidak sama dengan final_amount. Gagal hitung proporsi.");
    }
    
    return parsed.map(d => ({
        id_deposit: d.id_deposit,
        amount_sb: Number(d.floor)
    }));
}
