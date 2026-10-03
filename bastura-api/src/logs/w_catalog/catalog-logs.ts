import { appendFile } from "node:fs/promises"
import { join } from "node:path"
import { Context } from "hono"
import { w_catalog_logs } from "../type/w_catalog-logs-type";

const logFilePath = join(import.meta.dir, 'catalogApp.log');

export async function cataloglog(logData: w_catalog_logs): Promise<void> {
    const logEntry = `${logData.timestamp} - ${logData.message} - ${logData.status} - ${logData.procces}\n`;
    
    try {
        await appendFile(logFilePath, logEntry, 'utf-8');
    } catch (error) {
        console.error("❌ [DEBUG] STATUS: GAGAL MENULIS LOG!");
    }
}

export const sendcatalogResponse = async (
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
  await cataloglog({
    message: logMessage,
    status: logStatus,
    procces: processName,
    catalog_type : action , 
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
