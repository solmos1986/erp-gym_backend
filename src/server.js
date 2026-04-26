// import app from "./app.js";

// const PORT = 3000;

// app.listen(PORT, '0.0.0.0',() => {
//   console.log('Backend está corriendo en http://0.0.0.0:3000');
// });
import { createServer } from "http";
import { WebSocketServer } from "ws";
import app from "./app.js";

const PORT = 3000;

// Crear servidor HTTP
const server = createServer(app);

// 🔥 WebSocket en el MISMO servidor
const wss = new WebSocketServer({ server });

wss.on("connection", (ws, req) => {
  console.log("🔌 Agent conectado");

  ws.on("message", (msg) => {
    console.log("📩 Mensaje:", msg.toString());
  });

  ws.on("close", () => {
    console.log("❌ Agent desconectado");
  });
});

// Levantar TODO junto
server.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Backend + WS corriendo en ${PORT}`);
});