import { get_anc_type } from "../type/announcements-type";
import { Context } from "hono"
import { sendAncResponse } from "../../logs/anc/anc-logs";
import { getAnc } from "../../model/anc/get-announcements";

export const getAncController = async (c : Context) => {

    const action = "get_anc"
    
    try {
        const jwtPayload = c.get('jwtPayload') as get_anc_type
        

        if (!jwtPayload) {
            return sendAncResponse(c, 401, action , 'error', action, 'Token tidak valid', 'TOKEN_INVALID', 'TOKEN_INVALID')
        }

        const { sub, email } = jwtPayload as any

        const get_anc_controller = await getAnc(sub , email)

        if (get_anc_controller === "USER_NOT_FOUND") {
            return sendAncResponse(c, 404, action , 'error', action, 'User tidak ditemukan', 'User tidak ditemukan' , 'USER_NOT_FOUND')
        }

        if (get_anc_controller === null) {
            return sendAncResponse(c, 404, action , 'error', action, 'Data tidak ditemukan', 'Data tidak ditemukan' , 'DATA_NOT_FOUND')
        }

        const announcements = get_anc_controller.map((anc: any) => ({
            id_announcements: anc.id_announcements,
            data: {
                title: anc.title,
                content: anc.content,
                announcements_img: anc.announcements_img ?? 'undefined',
                created_at: anc.created_at,
                updated_at: anc.updated_at
            }
        }))

        return sendAncResponse(c, 200, action, 'success', action, 'Data ditemukan', 'Data ditemukan', announcements, 'DATA_FOUND')
    } catch (error) {
        console.error(error)
        return sendAncResponse(c, 500, action, 'error', action, 'Internal server error', 'INTERNAL_SERVER_ERROR')
    }
}
