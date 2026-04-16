import prisma from "../../lib/prisma.js";
import { getAndLockCommands } from "./command.service.js";

// 🔵 GET /agent/commands
export async function getAgentCommands(req, res) {
  try {
    const companyId = req.user?.companyId;
    const branchId = req.user?.branchId;

    if (!companyId || !branchId) {
      return res.status(400).json({ message: "Tenant inválido" });
    }

    // 🔥 trae y bloquea (PENDING → PROCESSING o como lo manejes)
    const commands = await getAndLockCommands(companyId, branchId);

    return res.json(commands);

  } catch (error) {
    
    return res.status(500).json({ message: "Error obteniendo comandos" });
  }
}


// 🔴 POST /agent/commands/:id/complete
export async function completeCommand(req, res) {
  try {
    const { id } = req.params;
    const { status, error } = req.body;

    if (!id) {
      return res.status(400).json({ message: "ID requerido" });
    }

    if (!status || !["DONE", "ERROR"].includes(status)) {
      return res.status(400).json({ message: "Status inválido" });
    }

    // 🔍 buscar command
    const command = await prisma.command.findUnique({
      where: { id }
    });

    if (!command) {
      return res.status(404).json({ message: "Command no encontrado" });
    }

    // 🔒 seguridad multi-tenant
    if (command.branchId !== req.user.branchId) {
      return res.status(403).json({ message: "No autorizado" });
    }

    let attempts = command.attempts;

    let data = {};

    if (status === "DONE") {
      data = {
        status: "DONE",
        executedAt: new Date(),
        error: null
      };
    }

    if (status === "ERROR") {
      attempts += 1;

      data = {
        status: attempts >= 3 ? "ERROR" : "PENDING", // 🔥 retry automático
        attempts,
        error: error || "Error desconocido",
        executedAt: new Date() // 🔥 ESTA LÍNEA FALTABA
      };
    }

    await prisma.command.update({
      where: { id },
      data
    });

    return res.json({ ok: true });

  } catch (err) {
    
    return res.status(500).json({ message: "Error actualizando comando" });
  }
}


// 🔵 POST /commands (uso interno o admin)
export const createCommand = async (req, res) => {
  try {
    const { type, payload } = req.body;

    if (!type || !payload) {
      return res.status(400).json({ message: "type y payload son requeridos" });
    }

    const command = await prisma.command.create({
      data: {
        type,
        payload,
        companyId: req.user.companyId,
        branchId: req.user.branchId,
        status: "PENDING"
      }
    });

    return res.json(command);

  } catch (error) {
    
    return res.status(500).json({ message: "Error creando command" });
  }
};