import { appendFile, readdir, unlink } from "node:fs/promises";
import { join } from "node:path";

const LOG_DIR = import.meta.dir;

interface LogEntry {
  ts: string;
  level: "info" | "warn" | "error";
  event: string;
  requestId: string;
  userId?: string;
  [key: string]: any;
}

function sanitizeMessage(msg: string): string {
  // Ganti pola sk-[A-Za-z0-9_-]+ dengan [REDACTED]
  return msg.replace(/sk-[A-Za-z0-9_-]+/g, "[REDACTED]");
}

function getLogFileName(): string {
  const date = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
  return join(LOG_DIR, `ai-scan-${date}.log`);
}

async function cleanupOldLogs() {
  try {
    const retentionDays = parseInt(process.env.LOG_RETENTION_DAYS || "14", 10);
    const now = Date.now();
    const files = await readdir(LOG_DIR);
    
    for (const file of files) {
      if (file.startsWith("ai-scan-") && file.endsWith(".log")) {
        // Ekstrak YYYY-MM-DD dari ai-scan-YYYY-MM-DD.log
        const dateStr = file.replace("ai-scan-", "").replace(".log", "");
        const fileDate = new Date(dateStr).getTime();
        if (!isNaN(fileDate)) {
          const diffDays = (now - fileDate) / (1000 * 60 * 60 * 24);
          if (diffDays > retentionDays) {
            await unlink(join(LOG_DIR, file)).catch(() => {});
          }
        }
      }
    }
  } catch (error) {
    // Abaikan jika gagal cleanup
  }
}

export async function writeAiLog(entry: Omit<LogEntry, "ts">): Promise<void> {
  const logEntry = {
    ts: new Date().toISOString(),
    ...entry
  } as LogEntry;
  
  if (logEntry.errorMessage) {
    logEntry.errorMessage = sanitizeMessage(String(logEntry.errorMessage));
  }
  if (logEntry.errorBody) {
    logEntry.errorBody = sanitizeMessage(String(logEntry.errorBody)).substring(0, 500);
  }
  if (logEntry.rawResponse) {
    logEntry.rawResponse = sanitizeMessage(String(logEntry.rawResponse)).substring(0, 500);
  }

  const logLine = JSON.stringify(logEntry) + "\n";
  const filePath = getLogFileName();

  try {
    await appendFile(filePath, logLine, "utf-8");
    // Jalankan cleanup fire-and-forget (sekitar 5% probabilitas untuk menghindari overhead)
    if (Math.random() < 0.05) cleanupOldLogs();
  } catch (err) {
    // Fallback ke console jika gagal tulis, jangan bikin aplikasi crash
    console.error("Gagal menulis log AI:", err);
    console.log("[FALLBACK LOG AI]", logLine.trim());
  }
}
