import { Hono } from "hono";
import { checkAccessToken } from "../auth/middleware/auth-middleware";
import { getCatalogController } from "../controller/catalog/get-catalog-controller";
import { getCatalogPhotoController } from "../controller/catalog/get-catalog-photo";
import { addCatalogController } from "../controller/catalog/add-catalog-controller";
import { editCatalogController } from "../controller/catalog/edit-catalog-controller";
import { deleteCatalogController } from "../controller/catalog/delete-catalog-controller";
import { uploadCatalogImgController } from "../controller/catalog/upload-catalog-img-controller";
import { getCategoriesController } from "../controller/catalog/get-categories-controller";
import { scanAiController } from "../controller/catalog/scan-ai-controller";
import { getAiQuotaController } from "../controller/catalog/get-quota-controller";

const catalogApp = new Hono();
catalogApp.use('/*', checkAccessToken);
catalogApp.get("/catalog", getCatalogController);
catalogApp.get("/catalog-categories", getCategoriesController);
catalogApp.get("/catalog/photo/:filename", getCatalogPhotoController);
catalogApp.post("/catalog", addCatalogController);
catalogApp.patch("/catalog/:id", editCatalogController);
catalogApp.delete("/catalog/:id", deleteCatalogController);
catalogApp.post("/catalog/photo/:id", uploadCatalogImgController);
catalogApp.post("/catalog/scan-ai", scanAiController);
catalogApp.get("/catalog/scan-ai/quota", getAiQuotaController);

export default catalogApp