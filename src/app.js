import express from "express";
import cors from "cors";

// =============================
// 📦 IMPORTS DE RUTAS
// =============================
import authRoutes from "./modules/auth/auth.routes.js";
import companyRoutes from "./modules/company/company.routes.js";
import roleRoutes from "./modules/tenantrole/tenantrole.routes.js";
import permissionRoutes from "./modules/permission/tenantpermission.routes.js";
import userRoutes from "./modules/user/user.routes.js";
import branchRoutes from "./modules/branch/branch.routes.js";
import planRoutes from "./modules/plans/plan.routes.js";
import partnerRoutes from "./modules/partner/partner.routes.js";
import membershipRoutes from "./modules/membership/membership.routes.js";
import commandRoutes from "./modules/command/command.routes.js";
import deviceRoutes from "./modules/device/device.routes.js";
import agentRoutes from "./modules/agent/agent.routes.js";
import { startMembershipExpirationJob } from './jobs/membershipsExpiration.job.js';
import { WebSocketServer } from 'ws';
import { sendCommandToAgent } from './lib/websocket.server.js';

const app = express();
startMembershipExpirationJob();
// =============================
// 🔥 MIDDLEWARES GLOBALES
// =============================
app.use(cors());
app.use(express.json());

// 🔥🔥🔥 IMPORTANTE (SERVIR IMÁGENES)
app.use('/uploads', express.static('uploads'));

// =============================
// 🚀 ROUTES
// =============================

// 🔐 AUTH
app.use("/auth", authRoutes);

// 🏢 CORE
app.use("/companies", companyRoutes);
app.use("/branches", branchRoutes);
app.use("/users", userRoutes);

// 🔐 RBAC
app.use("/tenant-roles", roleRoutes);
app.use("/tenant-permissions", permissionRoutes);

// 💰 NEGOCIO
app.use("/plan", planRoutes);
app.use("/partners", partnerRoutes);
app.use("/memberships", membershipRoutes);

// 🖥️ DEVICES
app.use("/devices", deviceRoutes);

// 🤖 AGENT
app.use("/commands", commandRoutes);
app.use("/agent", agentRoutes);

// Iniciar el servidor WebSocket
const wss = new WebSocketServer({ port: 8080 });


// =============================
// 🧪 HEALTH CHECK
// =============================
app.get("/health", (req, res) => {
  res.json({ status: "OK" });
});

// =============================
// ❌ 404 HANDLER
// =============================
app.use((req, res) => {
  res.status(404).json({
    message: "Ruta no encontrada"
  });
});

// =============================
// 🔥 ERROR GLOBAL HANDLER
// =============================
app.use((err, req, res, next) => {
  

  res.status(500).json({
    message: "Error interno del servidor"
  });
});

export default app;