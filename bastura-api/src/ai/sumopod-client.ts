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

export async function analyzeWasteImage(
  base64Image: string,
  catalog: CatalogItemForAI[]
): Promise<AIScanResult> {
  const SUMOPOD_API_KEY = process.env.SUMOPOD_API_KEY;
  const SUMOPOD_BASE_URL = process.env.SUMOPOD_BASE_URL || 'https://ai.sumopod.com/v1';
  const SUMOPOD_MODEL = process.env.SUMOPOD_MODEL || 'qwen3.6-flash';

  if (!SUMOPOD_API_KEY) {
    throw new Error("SUMOPOD_API_KEY belum dikonfigurasi.");
  }

  // Siapkan data katalog yang relevan saja untuk AI
  const catalogForPrompt = catalog.map(c => ({
    id: c.id_waste,
    nama: c.name,
    catatan_pembeda: c.description
  }));

  const systemPrompt = `
Kamu adalah asisten pengenalan sampah. Tugasmu mencocokkan benda paling dominan dalam gambar dengan KATALOG berikut:
${JSON.stringify(catalogForPrompt, null, 2)}

ATURAN MUTLAK:
1. HANYA JAWAB DENGAN JSON murni. Jangan tambahkan penjelasan apapun (tanpa markdown).
2. Gunakan format JSON persis seperti ini:
{
  "status": "<ok, not_in_catalog, atau unclear_image>",
  "items": [
    {
      "catalog_id": "<id_dari_katalog_yang_cocok>",
      "condition": "<1-3 kalimat bahasa Indonesia (sekitar 200 karakter) tentang kondisi fisik barang seperti bersih/kotor, utuh/rusak, warna, dll. Dilarang menyebut harga, berat, atau jumlah uang>",
      "confidence": <angka_0.0_hingga_1.0>
    }
  ],
  "note": "<opsional: catatan jika ada benda lain atau alasan status>"
}
3. Urutkan items dari yang paling dominan di foto (item pertama adalah yang utama).
4. Jika benda mirip, bedakan lewat ukuran, warna, atau catatan deskripsi di katalog.
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
          { type: "text", text: "Identifikasi jenis dan jumlah benda di gambar ini berdasarkan katalog." },
          { type: "image_url", image_url: { url: `data:image/jpeg;base64,${base64Image}` } }
        ]
      }
    ],
    temperature: 0.01,
    top_p: 0.01
  };

  const abortController = new AbortController();
  const timeoutId = setTimeout(() => abortController.abort(), 60000); // 60 detik timeout

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
    
    clearTimeout(timeoutId);

    if (!response.ok) {
      const errData = await response.text();
      throw new Error(`AI API Error (${response.status}): ${errData}`);
    }

    const data: any = await response.json();
    const rawText = data.choices?.[0]?.message?.content || "";

    // Bersihkan pembungkus markdown JSON
    let cleanJsonStr = rawText.trim();
    if (cleanJsonStr.startsWith('```json')) {
      cleanJsonStr = cleanJsonStr.replace(/^```json\n?/, '').replace(/\n?```$/, '');
    } else if (cleanJsonStr.startsWith('```')) {
      cleanJsonStr = cleanJsonStr.replace(/^```\n?/, '').replace(/\n?```$/, '');
    }

    const parsedData = JSON.parse(cleanJsonStr) as AIScanResult;
    return parsedData;
  } catch (error: any) {
    clearTimeout(timeoutId);
    throw new Error(`Gagal menghubungi AI: ${error.message || error}`);
  }
}
