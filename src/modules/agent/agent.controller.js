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
    const { branchId } = req.params;

    // 🔎 1. Buscar sucursal
    const branch = await prisma.branch.findUnique({
      where: { id: branchId }
    });

    if (!branch) {
      return res.status(404).json({
        message: "Sucursal no existe"
      });
    }

    // 🔐 2. Validar acceso
    const isSystemAdmin = req.user.systemRoles?.includes('SYSTEM_ADMIN');

    if (!isSystemAdmin) {
      if (req.user.companyId !== branch.companyId) {
        return res.status(403).json({
          message: "No autorizado"
        });
      }
    }

    // 🔥 3. Buscar agent
    const agent = await prisma.agent.findFirst({
      where: {
        branchId: branch.id,
        isActive: true
      }
    });

    if (!agent) {
      return res.status(404).json({
        message: "Agent no encontrado"
      });
    }

    // 🔥 4. Configuración
    const config = {
      WEBSOCKET_URL: "wss://apigymcloud.aplus-security.com/ws/",
      AGENT_KEY: agent.agentKey,
      COMPANY_ID: branch.companyId,
      BRANCH_ID: branch.id
    };

    // 📄 Enviar como archivo descargable
    res.setHeader("Content-Type", "application/json");
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=config.local.json"
    );

    res.send(JSON.stringify(config, null, 2));

  } catch (error) {
    console.error("❌ Error generando config:", error);

    res.status(500).json({
      message: "Error generando config"
    });
  }
}

export async function downloadAgentExe(req, res) {
  try {
    const agentPath = "/app/uploads/agent/agent.rar";

    if (!fs.existsSync(agentPath)) {
      return res.status(404).json({
        message: "Agent.rar no encontrado"
      });
    }

    res.download(agentPath, "agent.rar");

  } catch (error) {
    res.status(500).json({
      message: "Error descargando agent"
    });
  }
}