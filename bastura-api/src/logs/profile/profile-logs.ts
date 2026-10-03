import { appendFile } from "node:fs/promises"
import { join } from "node:path"
import { Context } from "hono"
import { profilelogs } from "../type/profile-logs-type";

const logFilePath = join(import.meta.dir, 'profileApp.log');

export async function profilelog(logData: profilelogs): Promise<void> {
    const logEntry = `${logData.timestamp} - ${logData.message} - ${logData.status} - ${logData.procces}\n`;
    
    try {
        await appendFile(logFilePath, logEntry, 'utf-8');
    } catch (error) {
        console.error("❌ [DEBUG] STATUS: GAGAL MENULIS LOG!");
    }
}

export const sendprofileResponse = async (
  c: Context,
  statusCode: number,
  action: string,
  logStatus: 'success' | 'error' | 'warning',
  processName: string,
  logMessage: string,
  clientMessage: string,
  data?: any, 
  errorCode?: string 

) => {
  await profilelog({
    message: logMessage,
    status: logStatus,
    procces: processName,
    profile_type : action , 
    timestamp: new Date(),
  });

  const responseBody: any = {
    status: logStatus === 'success' ? 'success' : 'error',
    message: clientMessage,
  };

  if (errorCode) responseBody.code = errorCode;
  if (data) responseBody.data = data;

  return c.json(responseBody, statusCode as any);
};
