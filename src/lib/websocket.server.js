import { WebSocketServer } from "ws";

const clients = new Map(); // 🤖 agents
const frontends = new Set(); // 🖥️ frontends

export function initWebSocket(server) {
  const wss = new WebSocketServer({ server });

  wss.on("connection", (ws) => {
    ws.on("message", (message) => {
      try {
        const data = JSON.parse(message);

        // ==========================
        // 🤖 AGENT (lo tuyo, intacto)
        // ==========================
        if (data.type === "REGISTER") {
          const { agentKey, companyId, branchId } = data;

          clients.set(agentKey, {
            ws,
            companyId,
            branchId
          });
        }

        // ==========================
        // 🖥️ FRONTEND (nuevo)
        // ==========================
        if (data.type === "REGISTER_FRONTEND") {
          ws.clientType = "FRONTEND";
          frontends.add(ws);
        }
      } catch (err) {
        console.error("❌ WS error:", err);
      }
    });

    ws.on("close", () => {
      // limpiar agents
      for (const [key, client] of clients.entries()) {
        if (client.ws === ws) {
          clients.delete(key);
        }
      }

      // limpiar frontends
      if (frontends.has(ws)) {
        frontends.delete(ws);
      }
    });
  });
}

// ==========================
// 🤖 AGENT (lo tuyo intacto)
// ==========================
export function sendCommandToAgent({ companyId, branchId, payload }) {
  for (const client of clients.values()) {
    if (client.companyId === companyId && client.branchId === branchId) {
      client.ws.send(
        JSON.stringify({
          type: payload
        })
      );
    }
  }
}

// ==========================
// 🖥️ FRONTEND (nuevo)
// ==========================
export function notifyFrontend(event) {
  for (const ws of frontends) {
    if (ws.readyState === 1) {
      ws.send(JSON.stringify(event));
    }
  }
}
