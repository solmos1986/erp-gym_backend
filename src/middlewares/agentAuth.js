export function agentAuth(req, res, next) {
  try {
    const auth = req.headers.authorization;
    
    if (!auth) {
      return res.status(401).json({ message: "No autorizado" });
    }

    const token = auth.split(" ")[1];

    if (token !== process.env.AGENT_KEY) {
      return res.status(403).json({ message: "Token inválido" });
    }

    // 🔥 IMPORTANTE: multi-tenant desde headers
    const companyId = req.headers["x-company-id"];
    const branchId = req.headers["x-branch-id"];

    if (!companyId || !branchId) {
      return res.status(400).json({ message: "Faltan headers tenant" });
    }

    req.user = {
      companyId,
      branchId
    };

    next();

  } catch (error) {
    
    res.status(500).json({ message: "Error en agent auth" });
  }
}