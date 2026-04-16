import { WebSocketServer } from 'ws';  // Asegúrate de importar 'ws' correctamente

let clients = [];  // Almacenar las conexiones WebSocket

// Crear el servidor WebSocket en el puerto 8081
const wss = new WebSocketServer({ port: 8081 });

wss.on('connection', (ws, req) => {
  // Extraer companyId y branchId de la URL de la solicitud
  const params = new URLSearchParams(req.url.slice(1));  // Extraemos los parámetros de la URL
  const companyId = params.get('companyId');
  const branchId = params.get('branchId');

  // Verificar que los valores estén correctos
  

  // Generar una clave única para cada conexión
  const key = `${companyId}:${branchId}`;

  // Depuración: Verificar la clave generada
  

  // Almacenar la conexión WebSocket
  clients.push({ key, ws });

  
    // Verifica los clientes conectados

  // Enviar un mensaje de bienvenida al agent
  const welcomeMessage = { message: "Conexión establecida con el servidor WebSocket" };
  ws.send(JSON.stringify(welcomeMessage));  // Enviar el mensaje como JSON

  ws.on('message', (message) => {
    
  });

  ws.on('close', () => {
    // Eliminar la conexión cuando el agent se desconecta
    clients = clients.filter(client => client.ws !== ws);
    
      // Verifica los clientes conectados después del cierre
  });

  ws.on('error', (error) => {
    
  });
});

// Función para enviar comandos a un agent específico por su companyId y branchId
function sendCommandToAgent(companyId, branchId, command) {
  const key = `${companyId}:${branchId}`;  // Formar la clave
    // Verificación en consola
  const client = clients.find(c => c.key === key);  // Buscar por la clave generada

  if (client) {
      // Verificación
    // Verificar si el WebSocket está abierto (readyState === 1)
    if (client.ws.readyState === 1) {
      // Enviar el comando al WebSocket del agent
      client.ws.send(JSON.stringify(command));  // Enviar el comando como JSON
      
    } else {
      
    }
  } else {
    
      // Verifica los clientes conectados
  }
}

export { sendCommandToAgent };