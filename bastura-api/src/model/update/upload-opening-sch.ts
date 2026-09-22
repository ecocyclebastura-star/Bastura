import { sql } from "../connection";

export const insert_setoran_sch = async ( time :string , id_user :string) => {

    const insert_jadwal = await sql.begin(async (sch) => {
        const cek_jadwal = await sch`SELECT id_jadwal FROM jadwal_setor LIMIT 1`;

        if (cek_jadwal.length > 0) {
            const data = await sch`UPDATE jadwal_setor SET setor_time = ${time}, updated_at = now() WHERE id_jadwal = ${cek_jadwal[0].id_jadwal} RETURNING setor_time`;
            return data[0];
        }
        const data = await sch`INSERT INTO jadwal_setor (setor_time, created_at) VALUES (${time},now()) RETURNING setor_time`;
        return data[0];
    })
    return insert_jadwal;
}