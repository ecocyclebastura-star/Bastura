import fs from 'fs';
import path from 'path';

// Konfigurasi
const SUMOPOD_API_KEY = process.env.SUMOPOD_API_KEY; // Harus diset saat menjalankan skrip
const SUMOPOD_BASE_URL = process.env.SUMOPOD_BASE_URL || 'https://ai.sumopod.com/v1';
const SUMOPOD_MODEL = process.env.SUMOPOD_MODEL || 'qwen3.6-flash';

if (!SUMOPOD_API_KEY) {
  console.error('❌ Error: SUMOPOD_API_KEY tidak ditemukan di environment variables.');
  console.log('Jalankan dengan: SUMOPOD_API_KEY="sk-..." bun run scratch/test_sumopod.ts');
  process.exit(1);
}

// Simulasi katalog dari DB
const mockCatalog = [
  { id: "uuid-1", name: "Botol Bersih Bening", description: "Botol plastik bening bersih tanpa label" },
  { id: "uuid-2", name: "Kardus", description: "Kardus coklat lembaran atau utuh" },
  { id: "uuid-3", name: "Gelas Kotor", description: "Gelas plastik bekas minuman manis" }
];

// Helper: Konversi gambar ke base64 murni (tanpa resize di tes ini)
function getBase64Image(filePath: string): string {
  if (!fs.existsSync(filePath)) {
     console.error(`❌ Gambar tidak ditemukan di ${filePath}`);
     process.exit(1);
  }
  const bitmap = fs.readFileSync(filePath);
  return Buffer.from(bitmap).toString('base64');
}

// Sistem Prompt
const systemPrompt = `
Kamu adalah asisten pengenalan sampah. Tugasmu mencocokkan gambar dengan KATALOG berikut:
${JSON.stringify(mockCatalog, null, 2)}

ATURAN MUTLAK:
1. HANYA JAWAB DENGAN JSON murni. Jangan tambahkan penjelasan apapun.
2. Gunakan format persis seperti ini:
{
  "items": [
    {
      "id_waste": "<id_dari_katalog_yang_cocok>",
      "label": "<nama_benda_di_foto>",
      "confidence": <angka_0.0_hingga_1.0>,
      "estimated_qty_or_weight": <jumlah_atau_berat_perkiraan>
    }
  ],
  "unrecognized_notes": "<opsional: catatan benda yang tak ada di katalog, misal: 'ada ban bekas'>"
}
3. Jika kamu mendeteksi sampah yang harganya 0 atau tidak ada di katalog, catat di 'unrecognized_notes', jangan masukkan ke 'items'.
`;

async function testSumoPod(imagePath: string, testName: string, extraParams: any = {}) {
  console.log(`\n===========================================`);
  console.log(`🧪 MENJALANKAN TES: ${testName}`);
  console.log(`===========================================`);
  
  const base64Image = getBase64Image(imagePath);
  const startTime = Date.now();

  try {
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
            { type: "text", text: "Identifikasi jenis dan jumlah sampah di gambar ini berdasarkan katalog." },
            { type: "image_url", image_url: { url: `data:image/jpeg;base64,${base64Image}` } }
          ]
        }
      ],
      ...extraParams
    };

    console.log("Mengirim request ke:", `${SUMOPOD_BASE_URL}/chat/completions`);

    const abortController = new AbortController();
    const timeoutId = setTimeout(() => abortController.abort(), 60000); // 60 detik

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

    const endTime = Date.now();
    const durationSec = ((endTime - startTime) / 1000).toFixed(2);
    
    if (!response.ok) {
      const errData = await response.text();
      console.error(`\n❌ Request Gagal (${durationSec} detik):`);
      console.error("Status:", response.status);
      console.error("Data:", errData);
      return;
    }

    const data: any = await response.json();
    
    console.log(`\n✅ Respons Diterima dalam ${durationSec} detik`);
    console.log(`ℹ️ Info Token:`, data.usage);

    const rawText = data.choices[0].message.content;
    console.log(`\n📝 Teks Mentah dari AI:\n${rawText}`);

    // Uji Parsing JSON
    console.log(`\n🔍 Menganalisa JSON (membersihkan markdown)...`);
    let cleanJsonStr = rawText.trim();
    if (cleanJsonStr.startsWith('\`\`\`json')) {
      cleanJsonStr = cleanJsonStr.replace(/^\`\`\`json\n?/, '').replace(/\n?\`\`\`$/, '');
    } else if (cleanJsonStr.startsWith('\`\`\`')) {
      cleanJsonStr = cleanJsonStr.replace(/^\`\`\`\n?/, '').replace(/\n?\`\`\`$/, '');
    }

    try {
      const parsedJson = JSON.parse(cleanJsonStr);
      console.log(`✅ Parsing JSON Berhasil!`);
      console.log(JSON.stringify(parsedJson, null, 2));
    } catch (e) {
      console.error(`❌ GAGAL PARSING JSON!`);
      console.error(e);
    }

  } catch (error: any) {
    const endTime = Date.now();
    const durationSec = ((endTime - startTime) / 1000).toFixed(2);
    console.error(`\n❌ Request Gagal (${durationSec} detik):`);
    console.error(error.message || error);
  }
}

async function runAllTests() {
  // Buat dummy image 1x1 pixel base64 (supaya script bisa jalan meski tak ada gambar asli)
  // Tapi idealnya user menyediakan gambar asli.
  const dummyImgPath = path.join(__dirname, 'dummy.jpg');
  if (!fs.existsSync(dummyImgPath)) {
    // Tulis 1x1 pixel jpeg
    const dummyJpegBase64 = '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=';
    fs.writeFileSync(dummyImgPath, Buffer.from(dummyJpegBase64, 'base64'));
  }

  // Minta user mengganti gambar ini dengan gambar sampah nyata
  const imageToTest = process.argv[2] || dummyImgPath;
  console.log(`Menggunakan gambar: ${imageToTest}`);
  if (imageToTest === dummyImgPath) {
    console.log(`⚠️ PERHATIAN: Mengetes dengan gambar kosong 1x1 pixel. Jalankan: bun run scratch/test_sumopod.ts <path_gambar_asli> untuk hasil akurat.`);
  }

  // Tes 1: Parameter Normal
  await testSumoPod(imageToTest, "Parameter Normal (Default)", {
    temperature: 0.2
  });

  // Tes 2: Usaha mematikan thinking mode (tergantung apakah SumoPod/Qwen 3.6 mendukung)
  // Di beberapa API Qwen, thinking mode bisa mati jika kita tak menset parameter tertentu atau menset max_tokens kecil.
  // Tapi jika max_tokens kecil, output bisa kepotong. Kita coba temperature 0 dan top_p 0.01.
  await testSumoPod(imageToTest, "Uji Tekan Thinking Mode (Temp=0.01)", {
    temperature: 0.01,
    top_p: 0.01,
    max_tokens: 1500 // Membatasi token, tapi resiko JSON kepotong jika thinking mode tak mau mati
  });
}

runAllTests();
