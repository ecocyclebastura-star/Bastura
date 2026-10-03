import { Hono } from "hono";
import { checkAccessToken, adminOnly } from "../auth/middleware/auth-middleware";
import { addDepositController } from "../controller/deposit-controller/add-deposit-controller";
import { editDepositController } from "../controller/deposit-controller/edit-deposit-controller";
import { deleteDepositController } from "../controller/deposit-controller/delete-deposit-controller";
import { getDepositsController, getDepositDetailController } from "../controller/deposit-controller/get-deposit-controller";

const depositApp = new Hono();

depositApp.use('/*', checkAccessToken);

depositApp.get("/", adminOnly, getDepositsController);
depositApp.get("/:id", adminOnly, getDepositDetailController);
depositApp.post("/", adminOnly, addDepositController);
depositApp.patch("/:id", adminOnly, editDepositController);
depositApp.delete("/:id", adminOnly, deleteDepositController);

export default depositApp;
