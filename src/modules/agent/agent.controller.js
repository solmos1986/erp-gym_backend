import { PrismaClient } from "@prisma/client";
import CryptoJS from "crypto-js";

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

