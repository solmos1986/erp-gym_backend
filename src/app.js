import express from "express";
import cors from "cors";

// =============================
// 📦 IMPORTS DE RUTAS
// =============================
import authRoutes from "./modules/auth/auth.routes.js";
import companyRoutes from "./modules/company/company.routes.js";
import roleRoutes from "./modules/tenantrole/tenantrole.routes.js";
import permissionRoutes from "./modules/permission/permission.routes.js";
import userRoutes from "./modules/user/user.routes.js";
import branchRoutes from "./modules/branch/branch.routes.js";
import planRoutes from "./modules/plans/plan.routes.js";
import partnerRoutes from "./modules/partner/partner.routes.js";
import membershipRoutes from "./modules/membership/membership.routes.js";
import commandRoutes from "./modules/command/command.routes.js";
import deviceRoutes from "./modules/device/device.routes.js";
import agentRoutes from "./modules/agent/agent.routes.js";
import { startMembershipExpirationJob } from "./jobs/membershipsExpiration.job.js";
import dashboardRoutes from "./modules/dashboard/dashboard.routes.js";
import productCategoryRoutes from "./modules/productCategory/productCategory.routes.js";
import productRoutes from "./modules/product/product.routes.js";
import inventoryMovementRoutes from "./modules/inventoryMovement/inventoryMovement.routes.js";
import cashRegisterRoutes from "./modules/cashRegister/cashRegister.routes.js";
import cashMovementRoutes from "./modules/cashMovement/cashMovement.routes.js";
import saleRoutes from "./modules/sale/sale.routes.js";
import productSaleRoutes from "./modules/productSale/productSale.routes.js";
import purchaseRoutes from "./modules/purchase/purchase.routes.js";
import inventoryRoutes from "./modules/inventory/inventory.routes.js";
import reportsRoutes from "./modules/report/reports.routes.js";
import businessTemplateRoutes from "./modules/businessTemplate/businessTemplate.routes.js";
import productionRoutes from "./modules/production/production.routes.js";

const app = express();

// =============================
// 🔥 MIDDLEWARES GLOBALES
// =============================
app.use(
  cors({
    origin: ["https://gymcloud.aplus-security.com", "http://localhost:8080", "http://127.0.0.1:8080"], // Reemplaza esto con el dominio de tu frontend
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    credentials: true // Si estás utilizando cookies o sesiones
  })
);
startMembershipExpirationJob();
app.set("trust proxy", true);
app.use(express.json());

// 🔥🔥🔥 IMPORTANTE (SERVIR IMÁGENES)
app.use("/uploads", express.static("uploads"));

// =============================
// 🚀 ROUTES
// =============================
console.log("llegue app.js");
// 🔐 AUTH
app.use("/auth", authRoutes);

// 🏢 CORE
app.use("/companies", companyRoutes);
app.use("/branches", branchRoutes);
app.use("/users", userRoutes);

// 🔐 RBAC
app.use("/roles", roleRoutes);
app.use("/permissions", permissionRoutes);

// 💰 NEGOCIO
app.use("/plan", planRoutes);
app.use("/partners", partnerRoutes);
app.use("/memberships", membershipRoutes);

// 🖥️ DEVICES
app.use("/devices", deviceRoutes);

// 🤖 AGENT
app.use("/commands", commandRoutes);
app.use("/agent", agentRoutes);

// 📊 DASHBOARD
app.use("/dashboard", dashboardRoutes);
// Iniciar el servidor WebSocket
//const wss = new WebSocketServer({ port: 8080 });

// CATEGORÍAS DE PRODUCTOS
app.use("/product-categories", productCategoryRoutes);

// PRODUCTOS
app.use("/products", productRoutes);

// MOVIMIENTOS DE INVENTARIO
app.use("/inventory-movements", inventoryMovementRoutes);

// CAJA
app.use("/cash-registers", cashRegisterRoutes);

// MOVIMIENTOS DE CAJA
app.use("/cash-movements", cashMovementRoutes);

// VENTAS
app.use("/sales", saleRoutes);

// VENTAS DE PRODUCTOSs
app.use("/product-sales", productSaleRoutes);

// PURCHASES
app.use("/purchases", purchaseRoutes);

// INVENTARIO
app.use("/inventory", inventoryRoutes);

// REPORTES
app.use("/reports", reportsRoutes);

// BUSINESS TEMPLATES
app.use("/business-templates", businessTemplateRoutes);

app.use("/production", productionRoutes);
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
  console.error("🔥 ERROR:");
  console.error(err);

  res.status(500).json({
    message: err.message,
    stack: process.env.NODE_ENV !== "production" ? err.stack : undefined
  });
});

export default app;
