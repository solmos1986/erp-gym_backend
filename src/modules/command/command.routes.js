import express from "express";
import { createCommand } from "./command.controller.js";
import { requireAuth } from "../../middlewares/auth.middleware.js";

const router = express.Router();

// ERP crea comandos
router.post("/", requireAuth, createCommand);

export default router;