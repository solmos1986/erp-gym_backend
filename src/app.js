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

// Iniciar el trabajo para la expiración de membresías
startMembershipExpirationJob();

// =============================
// 🔥 MIDDLEWARES GLOBALES
// =============================

// Primero, manejar las solicitudes OPTIONS (CORS preflight)
app.options('*', cors());

// Configurar CORS para permitir tu frontend
app.use(cors({
  origin: 'https://gymcloud.apus-security.com',  // Reemplaza con el dominio de tu frontend
  methods: 'GET,POST,PUT,DELETE',
  credentials: true,
}));

// Configuración para recibir JSON en las solicitudes
app.use(express.json());

// 🔥🔥🔥 SERVIR IMÁGENES
app.use('/uploads', express.static('uploads'));

// =============================
// 🚀 RUTAS
// =============================

// 🔐 Rutas de autenticación
app.use("/auth", authRoutes);

// 🏢 Rutas del core (empresa, sucursales, usuarios)
app.use("/companies", companyRoutes);
app.use("/branches", branchRoutes);
app.use("/users", userRoutes);

// 🔐 Rutas para roles y permisos
app.use("/tenant-roles", roleRoutes);
app.use("/tenant-permissions", permissionRoutes);

// 💰 Rutas de negocio (planes, socios, membresías)
app.use("/plan", planRoutes);
app.use("/partners", partnerRoutes);
app.use("/memberships", membershipRoutes);

// 🖥️ Rutas para dispositivos
app.use("/devices", deviceRoutes);

// 🤖 Rutas para agentes y comandos
app.use("/commands", commandRoutes);
app.use("/agent", agentRoutes);

// Iniciar el servidor WebSocket
const wss = new WebSocketServer({ port: 8080 });

// =============================
// 🧪 RUTA DE SALUD (Health Check)
// =============================

app.get("/health", (req, res) => {
  res.json({ status: "OK" });
});

// =============================
// ❌ MANEJO DE RUTAS NO ENCONTRADAS
// =============================

app.use((req, res) => {
  res.status(404).json({
    message: "Ruta no encontrada"
  });
});

// =============================
// 🔥 MANEJO DE ERRORES GLOBALES
// =============================

app.use((err, req, res, next) => {
  console.error(err); // Registrar el error en la consola para la depuración

  res.status(500).json({
    message: "Error interno del servidor"
  });
});

export default app;