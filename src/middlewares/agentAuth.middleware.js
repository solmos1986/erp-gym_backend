import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const agentAuth = async (req, res, next) => {
  try {
    const auth = req.headers.authorization;

    if (!auth) {
      return res.status(401).json({ message: "No autorizado" });
    }

    const token = auth.split(" ")[1];

    // 🔥 VALIDAR CONTRA DB
    const agent = await prisma.agent.findUnique({
      where: { agentKey: token }
    });

    if (!agent || !agent.isActive) {
      return res.status(403).json({ message: "Agent inválido o inactivo" });
    }

    // 🔥 CLAVE: guardar agent completo
    req.agent = agent;

    // 🔥 MULTI-TENANT
    req.user = {
      companyId: agent.companyId,
      branchId: agent.branchId,
      agentId: agent.id
    };

    next();

  } catch (error) {
    
    res.status(500).json({ message: "Error en agent auth" });
  }
};