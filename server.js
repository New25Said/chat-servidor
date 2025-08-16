const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// servir el index.html en la raíz
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// manejar conexiones de socket
io.on("connection", (socket) => {
  console.log("Un usuario se conectó");

  socket.on("chat message", (msg) => {
    io.emit("chat message", msg); // reenviar a todos
  });

  socket.on("disconnect", () => {
    console.log("Un usuario se desconectó");
  });
});

// Render asigna el puerto en process.env.PORT
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Servidor chat listo en puerto ${PORT}`);
});
