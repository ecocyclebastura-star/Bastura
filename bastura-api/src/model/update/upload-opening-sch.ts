import { sql } from "../connection";

export const insert_setoran_sch = async ( time :string , id_user :string) => {

    const insert_jadwal = await sql.begin(async (sch) => {
        const cek_jadwal = await sch`SELECT * FROM jadwal_setor WHERE setor_time = ${time}`;

        if (cek_jadwal.length > 0) {
            await sch`UPDATE jadwal_setor SET setor_time = ${time}, updated_at = now() WHERE id_jadwal = ${cek_jadwal[0].id_jadwal}`;
            return "JADWAL_BERHASIL";
        }
        await sch`INSERT INTO jadwal_setor (setor_time, created_at) VALUES (${time},now())`;
        return "JADWAL_BERHASIL";
    })
    return insert_jadwal;
}