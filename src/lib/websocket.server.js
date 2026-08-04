import { WebSocketServer } from "ws";
import jwt from "jsonwebtoken";

// ======================================================
// 🤖 AGENTS
// ======================================================
const agents = new Map();

// ======================================================
// 🖥️ FRONTENDS
// key = WebSocket
// value = contexto autenticado
// ======================================================
const frontends = new Map();

export function initWebSocket(server) {
  const wss = new WebSocketServer({ server });

  wss.on("connection", (ws) => {
    ws.on("message", (message) => {
      try {
        const data = JSON.parse(message);

        // ==================================================
        // REGISTER AGENT
        // ==================================================
        if (data.type === "REGISTER") {
          const { agentKey, companyId, branchId } = data;

          agents.set(agentKey, {
            ws,
            companyId,
            branchId
          });

          console.log("🤖 Agent conectado:", {
            agentKey,
            companyId,
            branchId
          });

          return;
        }

        // ==================================================
        // REGISTER FRONTEND
        // ==================================================
        if (data.type === "REGISTER_FRONTEND") {
          if (!data.token) {
            ws.close();
            return;
          }

          let decoded;

          try {
            decoded = jwt.verify(data.token, process.env.JWT_SECRET);
          } catch {
            ws.close();
            return;
          }

          frontends.set(ws, {
            userId: decoded.userId,
            companyId: decoded.companyId,
            branchId: decoded.branchId
          });

          console.log("🖥️ Frontend conectado:", {
            userId: decoded.userId,
            companyId: decoded.companyId,
            branchId: decoded.branchId
          });

          return;
        }
      } catch (err) {
        console.error("WS ERROR:", err);
      }
    });

    ws.on("close", () => {
      // ==========================================
      // limpiar agents
      // ==========================================
      for (const [key, agent] of agents.entries()) {
        if (agent.ws === ws) {
          agents.delete(key);

          break;
        }
      }

      // ==========================================
      // limpiar frontends
      // ==========================================
      frontends.delete(ws);
    });
  });
}

// ======================================================
// AGENTS
// ======================================================
export function sendCommandToAgent(companyId, branchId, payload) {
  for (const agent of agents.values()) {
    if (
      agent.companyId === companyId &&
      agent.branchId === branchId &&
      agent.ws.readyState === 1
    ) {
      agent.ws.send(JSON.stringify(payload));
    }
  }
}

// ======================================================
// TODOS
// ======================================================
export function notifyAll(event) {
  for (const [ws] of frontends) {
    if (ws.readyState === 1) {
      ws.send(JSON.stringify(event));
    }
  }
}

// ======================================================
// EMPRESA
// ======================================================
export function notifyCompany({ companyId, event }) {
  for (const [ws, client] of frontends) {
    if (client.companyId === companyId && ws.readyState === 1) {
      ws.send(JSON.stringify(event));
    }
  }
}

// ======================================================
// SUCURSAL
// ======================================================
export function notifyBranch({ companyId, branchId, event }) {
  for (const [ws, client] of frontends) {
    if (client.companyId === companyId && client.branchId === branchId && ws.readyState === 1) {
      ws.send(JSON.stringify(event));
    }
  }
}

// ======================================================
// USUARIO
// ======================================================
export function notifyUser({ userId, event }) {
  for (const [ws, client] of frontends) {
    if (client.userId === userId && ws.readyState === 1) {
      ws.send(JSON.stringify(event));
    }
  }
}

// ======================================================
// COMPATIBILIDAD (TEMPORAL)
// ======================================================
export const notifyFrontend = notifyAll;
