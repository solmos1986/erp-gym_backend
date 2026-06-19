import http from "http";
import app from "./app.js";
import { initWebSocket } from "./lib/websocket.server.js";

const PORT = process.env.PORT || 3000;

// 🔥 crear server real
const server = http.createServer(app);

// 🔥 conectar WebSocket
initWebSocket(server);

server.listen(PORT, () => {
  console.log(`🚀 Server corriendo en puerto ${PORT}`);
});
