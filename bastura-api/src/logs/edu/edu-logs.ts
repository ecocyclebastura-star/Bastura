import { appendFile } from "node:fs/promises"
import { join } from "node:path"
import { Context } from "hono"
import type { edulogs } from "../type/edu-logs-type";

const logFilePath = join(import.meta.dir, 'educationApp.log');

export async function edulog(logData: edulogs): Promise<void> {
    const logEntry = `${logData.timestamp} - ${logData.message} - ${logData.status} - ${logData.procces}\n`;
    
    try {
        await appendFile(logFilePath, logEntry, 'utf-8');
    } catch (error) {
        console.error("❌ [DEBUG] STATUS: GAGAL MENULIS LOG!");
    }
}

export const sendEduResponse = async (
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
  await edulog({
    message: logMessage,
    status: logStatus,
    procces: processName,
    edu_type : action , 
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
