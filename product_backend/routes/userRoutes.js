import express from "express";
import { getVault, addToVault, removeFromVault, getHistory, addHistory } from "../controllers/userController.js";
import { authenticateToken } from "../utils/authMiddleware.js";

const router = express.Router();

router.use(authenticateToken);

router.get("/vault", getVault);
router.post("/vault", addToVault);
router.delete("/vault/:productId", removeFromVault);
router.get("/history", getHistory);
router.post("/history", addHistory);

export default router;
