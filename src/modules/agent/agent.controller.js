import { PrismaClient } from "@prisma/client";
import CryptoJS from "crypto-js";
import archiver from "archiver";
import fs from "fs";

const prisma = new PrismaClient();
const SECRET = process.env.DEVICE_SECRET || "secret_dev";

const decrypt = (cipherText) => {
  if (!cipherText) return null;

  const bytes = CryptoJS.AES.decrypt(cipherText, SECRET);
  return bytes.toString(CryptoJS.enc.Utf8);
};
//========================
// AGENT LOGIN
//========================


export const agentLogin = async (req, res) => {
  return res.json({
    ok: true,
    message: "Agent autenticado",
    companyId: req.user.companyId,
    branchId: req.user.branchId
  });
};
//========================
// AGENT CONFIG
//========================
export const getAgentConfig = async (req, res) => {
  try {
    const { companyId, branchId } = req.user;

    const devices = await prisma.device.findMany({
      where: {
        companyId,
        branchId,
        isActive: true
      }
    });

    const devicesWithPassword = devices.map(d => ({
  ...d,
  password: decrypt(d.password)
}));

return res.json({
  devices: devicesWithPassword
});

  } catch (error) {
    
    res.status(500).json({ message: "Error obteniendo config" });
  }
};

//========================
// AGENT HEARTBEAT
//=============================
export const agentHeartbeat = async (req, res) => {
  try {
    const agent = req.agent // 🔥 viene del middleware
    const { devices } = req.body

    // 💓 actualizar agent
    await prisma.agent.update({
      where: { id: agent.id },
      data: {
        lastSeenAt: new Date()
      }
    })

    // 🔌 actualizar dispositivos
    if (devices && devices.length > 0) {
      for (const d of devices) {
        await prisma.device.update({
          where: { id: d.deviceId },
          data: {
            lastSeenAt: new Date(),
            status: d.status,
            lastConnectionAt: new Date()
          }
        })
      }
    }

    return res.json({ ok: true })

  } catch (error) {
    console.error("Heartbeat error:", error)
    return res.status(500).json({ error: "Error en heartbeat" })
  }
}
//========================
// AGENT DOWNLOAD
//=============================
export async function downloadAgent(req, res) {
  try {
    const { companyId, branchId } = req.params;

    // 🔐 Validar que el usuario solo descargue su empresa
    if (req.user.companyId !== companyId) {
      return res.status(403).json({
        message: "No autorizado"
      });
    }

    // 📦 Ruta dentro del contenedor Docker
    const agentPath = "/app/uploads/agent/agent.exe";

    // 🔍 Verificar que existe
    if (!fs.existsSync(agentPath)) {
      return res.status(404).json({
        message: "Agent no encontrado en el servidor"
      });
    }

    // 🔥 Config dinámica
    const config = {
      WEBSOCKET_URL: "wss://apigymcloud.aplus-security.com/ws/",
      AGENT_KEY: `AGENT_${companyId}`, // puedes mejorar luego
      COMPANY_ID: companyId,
      BRANCH_ID: branchId
    };

    // 📦 Headers para descarga
    res.setHeader("Content-Type", "application/zip");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=agent-${companyId}.zip`
    );

    // 🧩 Crear ZIP
    const archive = archiver("zip", {
      zlib: { level: 9 }
    });

    archive.pipe(res);

    // 👉 agregar el .exe
    archive.file(agentPath, { name: "agent.exe" });

    // 👉 agregar config dinámica
    archive.append(JSON.stringify(config, null, 2), {
      name: "config.local.json"
    });

    await archive.finalize();

  } catch (error) {
    console.error("❌ Error descargando agent:", error);

    res.status(500).json({
      message: "Error generando el agent"
    });
  }
}
