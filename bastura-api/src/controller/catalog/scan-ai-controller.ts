import { Context } from "hono";
import sharp from "sharp";
import { getCatalogForAIModel } from "../../model/catalog/get-catalog-for-ai";
import { analyzeWasteImage } from "../../ai/sumopod-client";
import { sendcatalogResponse } from "../../logs/w_catalog/catalog-logs";

export const scanAiController = async (c: Context) => {
    const action = "scan_ai_catalog";
    try {
        const payload = c.get('jwtPayload') as { sub: string };
        const sub = payload.sub;

        if (!sub) {
            return sendcatalogResponse(c, 401, 'SCAN_AI', 'error', action, 'Unauthorized', 'ID tidak ditemukan', null, 'UNAUTHORIZED');
        }

        // 1. Ambil body request multipart
        const body = await c.req.parseBody();
        const imageFile = body['image'] as File | undefined;

        if (!imageFile) {
            return sendcatalogResponse(c, 400, 'SCAN_AI', 'error', action, 'Gambar tidak ditemukan', 'Harap unggah gambar', null, 'IMAGE_REQUIRED');
        }

        // Validasi tipe file
        const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
        if (!validTypes.includes(imageFile.type)) {
            return sendcatalogResponse(c, 400, 'SCAN_AI', 'error', action, 'Format file tidak valid', 'Hanya menerima JPG, PNG, WEBP', null, 'INVALID_FILE_TYPE');
        }

        // Validasi ukuran (Maks 5MB)
        if (imageFile.size > 5 * 1024 * 1024) {
            return sendcatalogResponse(c, 400, 'SCAN_AI', 'error', action, 'Ukuran file terlalu besar', 'Ukuran gambar maksimal 5MB', null, 'FILE_TOO_LARGE');
        }

        // 2. Resize & Kompres Gambar dengan Sharp
        const arrayBuffer = await imageFile.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        const processedImageBuffer = await sharp(buffer)
            .rotate() // terapkan EXIF rotation
            .resize(768, 768, {
                fit: 'inside',
                withoutEnlargement: true
            })
            .jpeg({ quality: 80 }) // kompres menjadi JPEG
            .toBuffer();

        const base64Image = processedImageBuffer.toString('base64');

        // 3. Ambil data katalog (aktif) dari DB
        const catalogItems = await getCatalogForAIModel() as any[];

        // 4. Panggil AI
        const aiResult = await analyzeWasteImage(base64Image, catalogItems);

        // 5. Kalkulasi dan Strukturisasi Response
        // 5. Kalkulasi dan Strukturisasi Response
        if (aiResult.status === "unclear_image") {
            return c.json({
                status: "unclear_image",
                message: "Gambar tidak menampilkan sampah dengan jelas, mohon ulang pengambilan gambar",
                items: [],
                disclaimer: "Harga bersifat perkiraan dan dapat berubah. Harga akhir ditentukan admin saat penimbangan."
            }, 200);
        }

        if (aiResult.status === "not_in_catalog" || !aiResult.items || aiResult.items.length === 0) {
            return c.json({
                status: "not_in_catalog",
                message: "sampah ini tidak bernilai jual",
                items: [],
                disclaimer: "Harga bersifat perkiraan dan dapat berubah. Harga akhir ditentukan admin saat penimbangan."
            }, 200);
        }

        const itemsResponse = [];
        let hasValueItem = false;

        for (const aiItem of aiResult.items) {
            const dbItem = catalogItems.find(c => c.id_waste === aiItem.catalog_id);
            if (!dbItem) continue;

            const pricePerKg = Number(dbItem.price) || 0;
            const accepted = pricePerKg > 0;

            if (accepted) {
                hasValueItem = true;
            }

            itemsResponse.push({
                catalog_id: dbItem.id_waste,
                name: dbItem.name,
                condition: aiItem.condition,
                price_per_kg: pricePerKg,
                accepted: accepted,
                confidence: aiItem.confidence
            });
        }

        let finalStatus = "ok";
        let finalMessage = null;
        let finalItems = itemsResponse;

        if (itemsResponse.length === 0) {
             return c.json({
                status: "not_in_catalog",
                message: "sampah ini tidak bernilai jual",
                items: [],
                disclaimer: "Harga bersifat perkiraan dan dapat berubah. Harga akhir ditentukan admin saat penimbangan."
            }, 200);
        }

        if (hasValueItem) {
            finalStatus = "ok";
            // Buang item yang price_per_kg === 0 jika ada item bernilai
            finalItems = itemsResponse.filter(item => item.price_per_kg > 0);
        } else {
            finalStatus = "not_accepted";
            finalMessage = "Tidak diterima";
        }

        return c.json({
            status: finalStatus,
            message: finalMessage,
            items: finalItems,
            disclaimer: "Harga bersifat perkiraan dan dapat berubah. Harga akhir ditentukan admin saat penimbangan."
        }, 200);

    } catch (error: any) {
        console.error("Error di scan-ai-controller:", error);
        return sendcatalogResponse(c, 500, 'SCAN_AI', 'error', action, 'Gagal memproses gambar: ' + (error.message || 'Error internal'), 'Gagal memproses gambar', null, 'INTERNAL_SERVER_ERROR');
    }
}
