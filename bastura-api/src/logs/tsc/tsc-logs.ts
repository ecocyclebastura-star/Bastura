import { appendFile } from "node:fs/promises"
import { join } from "node:path"
import { Context } from "hono"
import type { tsclogs } from "../type/tsc-logs-type";

const logFilePath = join(import.meta.dir, 'transactionApp.log');

export async function tsclog(logData: tsclogs): Promise<void> {
    const logEntry = `${logData.timestamp} - ${logData.message} - ${logData.status} - ${logData.procces}\n`;
    
    try {
        await appendFile(logFilePath, logEntry, 'utf-8');
    } catch (error) {
        console.error("❌ [DEBUG] STATUS: GAGAL MENULIS LOG!");
    }
}

export const sendtscResponse = async (
  c: Context,
  statusCode: number,
  action: string,
  logStatus: 'success' | 'error' | 'warning',
  processName: string,
  logMessage: string,
  clientMessage: string | null,
  data?: any, 
  errorCode?: string 

) => {
  await tsclog({
    message: logMessage,
    status: logStatus,
    procces: processName,
    tsc_type : action , 
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
