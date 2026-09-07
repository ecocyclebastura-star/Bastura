import { Hono } from "hono";
import { checkAccessToken } from "../auth/middleware/auth-middleware";
import { getCatalogController } from "../controller/catalog/get-catalog-controller";
import { getCatalogPhotoController } from "../controller/catalog/get-catalog-photo";

const catalogApp = new Hono();
catalogApp.use('/*', checkAccessToken);
catalogApp.get("/catalog", getCatalogController);
catalogApp.get("/catalog/photo/:filename", getCatalogPhotoController);

export default catalogApp