const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

let history = []; // historial en memoria

// servir index.html
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// socket.io
io.on("connection", (socket) => {
  console.log("Un usuario se conectó");

  // enviar historial al nuevo usuario
  socket.emit("chat history", history);

  // nombre del usuario
  socket.on("join", (username) => {
    socket.username = username;
    io.emit("system", `👤 ${username} se unió al chat`);
  });

  // mensajes
  socket.on("chat message", (msg) => {
    history.push(msg);
    if (history.length > 50) history.shift(); // guarda solo los últimos 50
    io.emit("chat message", msg);
  });

  socket.on("disconnect", () => {
    if (socket.username) {
      io.emit("system", `❌ ${socket.username} salió del chat`);
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Servidor chat listo en puerto ${PORT}`);
});
