// Servidor de chat con WebSockets (Render)
const express = require("express");
const http = require("http");
const { WebSocketServer } = require("ws");

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: "/ws" });

const clients = new Set();

function broadcast(data, except = null) {
  const msg = JSON.stringify(data);
  for (const ws of clients) {
    if (ws !== except && ws.readyState === ws.OPEN) {
      ws.send(msg);
    }
  }
}

wss.on("connection", (ws) => {
  clients.add(ws);

  ws.send(JSON.stringify({
    type: "system",
    text: "✅ Conectado al chat",
    time: Date.now()
  }));

  ws.on("message", (raw) => {
    let data;
    try { data = JSON.parse(raw.toString()); } catch { return; }

    if (data?.type === "chat") {
      const payload = {
        type: "chat",
        name: String(data.name || "Anónimo").slice(0, 20),
        text: String(data.text || "").slice(0, 500),
        time: Date.now(),
      };
      broadcast(payload);
    }
  });

  ws.on("close", () => clients.delete(ws));
});

// Render usa process.env.PORT
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log("Servidor chat listo en puerto " + PORT);
});
