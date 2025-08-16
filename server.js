const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Servir archivos estáticos (index.html y styles.css)
app.use(express.static(path.join(__dirname)));

// Manejo de sockets
io.on("connection", (socket) => {
  console.log("✅ Usuario conectado:", socket.id);

  socket.on("chat message", (msg) => {
    io.emit("chat message", { id: socket.id, text: msg });
  });

  socket.on("disconnect", () => {
    console.log("❌ Usuario desconectado:", socket.id);
  });
});

// Render asigna el puerto en process.env.PORT
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`✅ Servidor chat listo en puerto ${PORT}`);
});
