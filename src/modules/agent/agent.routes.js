import express from "express";
import { agentAuth } from "../../middlewares/agentAuth.middleware.js";
import {
  agentLogin,
  getAgentConfig,
  agentHeartbeat
} from "./agent.controller.js";

import {
  getAgentCommands,
  completeCommand
} from "../command/command.controller.js";

const router = express.Router();

router.post("/auth", agentAuth, agentLogin);
router.get("/config", agentAuth, getAgentConfig);
router.post("/heartbeat", agentAuth, agentHeartbeat);

router.get("/commands", agentAuth, getAgentCommands);
router.post("/commands/:id/complete", agentAuth, completeCommand);

export default router;