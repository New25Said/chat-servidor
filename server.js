// server.js
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// ✅ Sirve archivos estáticos (index.html, styles.css, etc.)
app.use(express.static(__dirname));

// 🗂️ Historial en memoria (últimos 100 mensajes)
const HISTORY_LIMIT = 100;
const history = []; // { user, text, time }

// Ruta raíz (opcional; express.static ya sirve index.html si existe)
app.get("/", (_req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

io.on("connection", (socket) => {
  // Enviar historial al recién conectado
  socket.emit("chat history", history);

  // User envía su nombre
  socket.on("join", (username) => {
    socket.data.username = String(username || "Anónimo").slice(0, 20);
    io.emit("system", `👋 ${socket.data.username} se unió al chat`);
  });

  // Mensajes del chat
  socket.on("chat message", (msg) => {
    const user = socket.data.username || "Anónimo";
    const text = String(msg?.text ?? "").trim().slice(0, 500);
    if (!text) return;

    const payload = { user, text, time: Date.now() };
    history.push(payload);
    if (history.length > HISTORY_LIMIT) history.shift();

    io.emit("chat message", payload);
  });

  socket.on("disconnect", () => {
    if (socket.data.username) {
      io.emit("system", `👋 ${socket.data.username} salió del chat`);
    }
  });
});

// ⚠️ Render asigna el puerto en process.env.PORT
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`✅ Servidor chat listo en puerto ${PORT}`);
});
