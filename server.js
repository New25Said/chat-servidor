const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");
const fs = require("fs");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Servir carpeta public
app.use(express.static(path.join(__dirname, "public")));

const HISTORY_FILE = path.join(__dirname, "chatHistory.json");

// Cargar historial persistente
let chatHistory = [];
if (fs.existsSync(HISTORY_FILE)) {
  try {
    chatHistory = JSON.parse(fs.readFileSync(HISTORY_FILE, "utf8"));
  } catch (e) {
    console.error("Error leyendo historial:", e);
  }
}
function saveHistory() {
  try {
    fs.writeFileSync(HISTORY_FILE, JSON.stringify(chatHistory, null, 2));
  } catch (e) {
    console.error("Error guardando historial:", e);
  }
}

// Estado en memoria
// users: socketId -> nickname
let users = {};
// groups: groupName -> [nicknames]
let groups = {};

io.on("connection", (socket) => {
  console.log("Usuario conectado:", socket.id);

  // Registrar nickname y mandar listas al cliente
  socket.on("set nickname", (nickname) => {
    users[socket.id] = nickname;

    // Enviar al que se conectó: historial + listas
    socket.emit("chat history", chatHistory);
    socket.emit("group list", Object.keys(groups));
    // Enviar a todos: lista de usuarios
    io.emit("user list", Object.values(users));
  });

  // Mensaje público
  socket.on("chat public", (text) => {
    const msg = {
      id: socket.id,
      name: users[socket.id],
      text,
      time: Date.now(),
      type: "public",
      target: null,
    };
    chatHistory.push(msg);
    saveHistory();
    io.emit("chat message", msg);
  });

  // Mensaje privado
  socket.on("chat private", ({ target, text }) => {
    const fromNick = users[socket.id];
    const targetId = Object.keys(users).find((id) => users[id] === target);
    if (!fromNick || !targetId) return;

    const msg = {
      id: socket.id,
      name: fromNick,
      text,
      time: Date.now(),
      type: "private",
      target, // nickname destino
    };
    chatHistory.push(msg);
    saveHistory();
    // Emite a emisor y receptor
    socket.emit("chat message", msg);
    io.to(targetId).emit("chat message", msg);
  });

  // Mensaje a grupo
  socket.on("chat group", ({ groupName, text }) => {
    const fromNick = users[socket.id];
    if (!fromNick) return;
    if (!groups[groupName]) return;
    if (!groups[groupName].includes(fromNick)) return;

    const msg = {
      id: socket.id,
      name: fromNick,
      text,
      time: Date.now(),
      type: "group",
      target: groupName,
    };
    chatHistory.push(msg);
    saveHistory();

    // Enviar solo a miembros del grupo
    Object.entries(users).forEach(([sid, nick]) => {
      if (groups[groupName].includes(nick)) {
        io.to(sid).emit("chat message", msg);
      }
    });
  });

  // Crear grupo con miembros por nickname
  socket.on("create group", ({ groupName, members }) => {
    const creator = users[socket.id];
    if (!creator) return;
    if (!groupName || typeof groupName !== "string") return;

    const unique = new Set(members.filter(Boolean).map((m) => m.trim()));
    unique.add(creator); // asegura incluir al creador

    groups[groupName] = Array.from(unique);
    // Notificar a todos la lista actualizada de grupos
    io.emit("group list", Object.keys(groups));
  });

  // Indicador de escribiendo (opcional)
  socket.on("typing", ({ type, target }) => {
    const who = users[socket.id];
    if (!who) return;

    if (type === "public") {
      socket.broadcast.emit("typing", who);
    } else if (type === "private" && target) {
      const targetId = Object.keys(users).find((id) => users[id] === target);
      if (targetId) io.to(targetId).emit("typing", who);
    } else if (type === "group" && target && groups[target]) {
      groups[target].forEach((nick) => {
        const sid = Object.keys(users).find((id) => users[id] === nick);
        if (sid && sid !== socket.id) io.to(sid).emit("typing", who);
      });
    }
  });

  socket.on("disconnect", () => {
    const gone = users[socket.id];
    delete users[socket.id];
    io.emit("user list", Object.values(users));
    console.log("Usuario desconectado:", gone || socket.id);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Servidor listo en puerto ${PORT}`));
