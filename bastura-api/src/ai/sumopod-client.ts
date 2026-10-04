export interface CatalogItemForAI {
  id_waste: string;
  name: string;
  description: string | null;
}

export interface AIScanResultItem {
  catalog_id: string;
  condition: string;
  confidence: number;
}

export interface AIScanResult {
  status: "ok" | "not_in_catalog" | "unclear_image";
  items: AIScanResultItem[];
  note?: string;
}

export class AIError extends Error {
  code: 'AI_TIMEOUT' | 'AI_HTTP' | 'AI_PARSE' | 'AI_CONFIG';
  httpStatus?: number;
  rawResponse?: string;

  constructor(message: string, code: 'AI_TIMEOUT' | 'AI_HTTP' | 'AI_PARSE' | 'AI_CONFIG', httpStatus?: number, rawResponse?: string) {
    super(message);
    this.name = 'AIError';
    this.code = code;
    this.httpStatus = httpStatus;
    this.rawResponse = rawResponse;
  }
}

// Parameter tambahan request ke SumoPod. Default: mematikan mode berpikir
function getExtraParams(): Record<string, unknown> {
  const fallback = { enable_thinking: false };
  const raw = process.env.SUMOPOD_EXTRA_PARAMS?.trim();
  if (!raw) return fallback;
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : fallback;
  } catch {
    console.warn('SUMOPOD_EXTRA_PARAMS bukan JSON valid, memakai default.');
    return fallback;
  }
}

export async function analyzeWasteImage(
  base64Image: string,
  catalog: CatalogItemForAI[],
  ctx?: { requestId: string; userId?: string }
): Promise<AIScanResult> {
  const startTime = Date.now();
  const reqId = ctx?.requestId || crypto.randomUUID();
  const userId = ctx?.userId;
  
  const SUMOPOD_API_KEY = process.env.SUMOPOD_API_KEY;
  const SUMOPOD_BASE_URL = process.env.SUMOPOD_BASE_URL || 'https://ai.sumopod.com/v1';
  const SUMOPOD_MODEL = process.env.SUMOPOD_MODEL || 'qwen3.6-flash';

  if (!SUMOPOD_API_KEY) {
    throw new AIError("SUMOPOD_API_KEY belum dikonfigurasi.", "AI_CONFIG");
  }

  // Langkah 6: Mapping ID panjang menjadi angka 1..N
  const idMap = new Map<string, string>();
  const catalogForPrompt = catalog.map((c, index) => {
    const shortId = String(index + 1);
    idMap.set(shortId, c.id_waste);
    return {
      id: shortId,
      nama: c.name,
      catatan_pembeda: c.description || undefined
    };
  });

  // Langkah 7: Format ringkas untuk hemat token
  const catalogText = catalogForPrompt.map(c => 
    `${c.id} | ${c.nama}${c.catatan_pembeda ? ` | ${c.catatan_pembeda}` : ''}`
  ).join('\n');

  const systemPrompt = `
Kamu adalah asisten pengenalan sampah. Tugasmu mencocokkan benda paling dominan dalam gambar dengan KATALOG berikut (format: id | nama | catatan_pembeda):
${catalogText}

ATURAN MUTLAK:
1. HANYA JAWAB DENGAN JSON murni. Jangan tambahkan penjelasan apapun (tanpa markdown).
2. Gunakan format JSON persis seperti ini:
{
  "status": "<ok, not_in_catalog, atau unclear_image>",
  "items": [
    {
      "catalog_id": "<id_angka_dari_katalog_yang_cocok>",
      "condition": "<1-3 kalimat bahasa Indonesia (sekitar 200 karakter) tentang kondisi fisik barang seperti bersih/kotor, utuh/rusak, warna, dll. Dilarang menyebut harga, berat, atau jumlah uang>",
      "confidence": <angka_0.0_hingga_1.0>
    }
  ],
  "note": "<opsional: catatan jika ada benda lain atau alasan status>"
}
3. Urutkan items dari yang paling dominan di foto (item pertama adalah yang utama).
4. Jika benda mirip, bedakan lewat ukuran, warna, atau catatan_pembeda di katalog. Jika ragu di antara beberapa item mirip, pilih berdasarkan catatan_pembeda, JANGAN memilih item yang kebetulan paling atas di daftar.
5. Jika benda di foto jelas tapi TIDAK ADA di katalog, set status "not_in_catalog" dan kosongkan items.
6. Jika foto buram atau bukan sampah, set status "unclear_image" dan kosongkan items.
`;

  const payload = {
    model: SUMOPOD_MODEL,
    messages: [
      {
        role: "system",
        content: systemPrompt
      },
      {
        role: "user",
        content: [
          { type: "text", text: "Identifikasi jenis benda paling dominan di gambar ini berdasarkan katalog." },
          { type: "image_url", image_url: { url: `data:image/jpeg;base64,${base64Image}` } }
        ]
      }
    ],
    temperature: 0.01,
    top_p: 0.01,
    ...getExtraParams()
  };

  const abortController = new AbortController();
  const timeoutId = setTimeout(() => abortController.abort(), 60000); // 60 detik timeout
  let responseData: any = null;

  try {
    const response = await fetch(`${SUMOPOD_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUMOPOD_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload),
      signal: abortController.signal
    });

    if (!response.ok) {
      const errBody = await response.text();
      throw new AIError(`API merespon dengan status ${response.status}`, "AI_HTTP", response.status, errBody);
    }

    responseData = await response.json();
    const rawText = responseData.choices?.[0]?.message?.content || "";

    // Logging token usage (Langkah 2)
    const usage = responseData.usage;
    let prompt_tokens = 0, completion_tokens = 0, reasoning = 0;
    if (usage) {
      reasoning = usage.completion_tokens_details?.reasoning_tokens ?? 0;
      prompt_tokens = usage.prompt_tokens;
      completion_tokens = usage.completion_tokens;
      
      if (usage.completion_tokens > 1000 || reasoning > 0) {
        // Asynchronously log warning
        import("../logs/ai/ai-logs").then(m => m.writeAiLog({
          level: "warn",
          event: "ai_usage_warning",
          requestId: reqId,
          userId,
          message: "Token output tinggi: mode berpikir mungkin aktif lagi, biaya naik.",
          completion_tokens,
          reasoning_tokens: reasoning
        })).catch(() => {});
      }
    }

    // Parser yang lebih tahan banting (Langkah 4)
    const start = rawText.indexOf('{');
    const end = rawText.lastIndexOf('}');
    if (start === -1 || end <= start) {
      throw new AIError('Respons AI tidak berisi JSON.', 'AI_PARSE', 200, rawText);
    }
    
    let parsed: any;
    try {
      parsed = JSON.parse(rawText.slice(start, end + 1));
    } catch (parseErr: any) {
      throw new AIError('Gagal memparsing JSON dari AI.', 'AI_PARSE', 200, rawText);
    }

    const validStatus = ['ok', 'not_in_catalog', 'unclear_image'];
    const status = validStatus.includes(parsed.status) ? parsed.status : 'unclear_image';
    
    let droppedCount = 0;
    const items = (Array.isArray(parsed.items) ? parsed.items : [])
      .filter((it: any) => {
        if (!it || it.catalog_id == null) return false;
        const shortId = String(it.catalog_id).trim();
        if (!idMap.has(shortId)) {
          droppedCount++;
          return false;
        }
        return true;
      })
      .map((it: any) => ({
        catalog_id: idMap.get(String(it.catalog_id).trim())!, // petakan balik ke id_waste asli
        condition: typeof it.condition === 'string' ? it.condition.trim() : '',
        confidence: Math.min(1, Math.max(0, Number(it.confidence) || 0)),
      }));

    if (droppedCount > 0) {
      import("../logs/ai/ai-logs").then(m => m.writeAiLog({
        level: "warn",
        event: "ai_validation_dropped",
        requestId: reqId,
        userId,
        droppedCount
      })).catch(() => {});
    }

    const finalResult = { status, items, note: typeof parsed.note === 'string' ? parsed.note : undefined } as AIScanResult;

    // Log Sukses
    import("../logs/ai/ai-logs").then(m => m.writeAiLog({
      level: "info",
      event: "ai_scan_ok",
      requestId: reqId,
      userId,
      model: SUMOPOD_MODEL,
      durationMs: Date.now() - startTime,
      status: finalResult.status,
      itemCount: finalResult.items.length,
      prompt_tokens,
      completion_tokens,
      reasoning_tokens: reasoning,
      imageSizeBytes: base64Image.length,
      catalogSize: catalog.length
    })).catch(() => {});

    return finalResult;
  } catch (error: any) {
    let aiError: AIError;
    
    if (error instanceof AIError) {
      aiError = error;
    } else if (error.name === 'AbortError') {
      aiError = new AIError('Koneksi ke AI timeout.', 'AI_TIMEOUT');
    } else {
      // Fallback untuk error fetch atau internet
      aiError = new AIError(`Error jaringan: ${error.message}`, 'AI_HTTP');
    }

    import("../logs/ai/ai-logs").then(m => m.writeAiLog({
      level: "error",
      event: "ai_scan_error",
      requestId: reqId,
      userId,
      errorCode: aiError.code,
      httpStatus: aiError.httpStatus,
      durationMs: Date.now() - startTime,
      model: SUMOPOD_MODEL,
      errorMessage: aiError.message,
      errorBody: aiError.rawResponse
    })).catch(() => {});

    throw aiError;
  } finally {
    clearTimeout(timeoutId);
  }
}
