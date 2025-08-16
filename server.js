// server.js
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  // Si lo necesitas detrás de proxies/CDN
  cors: { origin: "*" }
});

// ✅ Servir archivos estáticos (index.html, styles.css, imágenes, etc.)
app.use(express.static(__dirname, {
  setHeaders: (res, filePath) => {
    // cache suave para assets estáticos
    if (/\.(css|js|png|jpg|jpeg|gif|svg)$/.test(filePath)) {
      res.setHeader("Cache-Control", "public, max-age=3600");
    }
  }
}));

// Ruta principal (opcional; express.static ya sirve index.html si existe)
app.get("/", (_req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// 🗂️ Historial simple en memoria
const history = [];            // { user, text, time }
const HISTORY_LIMIT = 100;

io.on("connection", (socket) => {
  console.log("🔌 Usuario conectado:", socket.id);

  // Enviar historial al recién conectado
  socket.emit("chat history", history);

  // Usuario envía su nombre
  socket.on("join", (username) => {
    socket.data.username = String(username || "Anónimo").slice(0, 20);
    io.emit("system", `👋 ${socket.data.username} se unió al chat`);
  });

  // Mensajes del chat
  socket.on("chat message", (msg) => {
    // Normaliza y valida
    const user = socket.data.username || "Anónimo";
    const text = String(msg?.text ?? "").slice(0, 500).trim();
    if (!text) return;

    const payload = { user, text, time: Date.now() };

    // Guarda en historial (máx. 100)
    history.push(payload);
    if (history.length > HISTORY_LIMIT) history.shift();

    // Reenvía a todos
    io.emit("chat message", payload);
  });

  socket.on("disconnect", () => {
    if (socket.data.username) {
      io.emit("system", `👋 ${socket.data.username} salió del chat`);
    }
    console.log("❌ Usuario desconectado:", socket.id);
  });
});

// Render asigna el puerto en process.env.PORT
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`✅ Servidor chat listo en puerto ${PORT}`);
});
