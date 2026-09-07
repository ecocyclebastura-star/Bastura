import { get_edu } from "../../model/edu/get-edu";
import { get_edu_type } from "../type/education-type";
import { Context } from "hono"
import { sendEduResponse } from "../../logs/edu/edu-logs";

export const getEduController = async (c : Context) => {

    const action = "get_edu"
    
    try {
        const jwtPayload = c.get('jwtPayload') as get_edu_type
        

        if (!jwtPayload) {
            return sendEduResponse(c, 401, action , 'error', 'GET_EDU_ERROR', 'Token tidak valid', 'TOKEN_INVALID', 'TOKEN_INVALID')
        }

        const { sub, email } = jwtPayload as any

        const get_edu_controller = await get_edu(sub , email)

        if (get_edu_controller === "USER_NOT_FOUND") {
            return sendEduResponse(c, 404, action , 'error', 'GET_EDU_ERROR', 'User tidak ditemukan', 'User tidak ditemukan' , 'USER_NOT_FOUND')
        }

        if (!get_edu_controller) {
            return sendEduResponse(c, 404, action , 'error', 'GET_EDU_ERROR', 'Data tidak ditemukan', 'Data tidak ditemukan' , 'DATA_NOT_FOUND')
        }

        const education = get_edu_controller.map((edu: any) => ({
            id_content: edu.id_content,
            data: {
                title: edu.title,
                content: edu.content,
                education_img: edu.education_img ?? 'undefined',
                created_at: edu.created_at,
                updated_at: edu.updated_at
            }
        }))

        return sendEduResponse(c, 200, action, 'success', 'GET_EDU_SUCCESS', 'Data ditemukan', 'Data ditemukan', education, 'DATA_FOUND')
    } catch (error) {
        console.error(error)
        return sendEduResponse(c, 500, action, 'error', 'GET_EDU_ERROR', 'Internal server error', 'INTERNAL_SERVER_ERROR')
    }
}
