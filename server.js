// server.js
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(__dirname));

const HISTORY_LIMIT = 100;
const history = [];

app.get("/", (_req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

io.on("connection", (socket) => {
  socket.emit("chat history", history);

  socket.on("join", (username) => {
    socket.data.username = String(username || "Anónimo").slice(0, 20);
    io.emit("system", `👋 ${socket.data.username} se unió al chat`);
  });

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

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`✅ Servidor chat listo en puerto ${PORT}`);
});
