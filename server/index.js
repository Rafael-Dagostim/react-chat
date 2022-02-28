const express = require("express");
const cors = require("cors");
const socketio = require("socket.io");
const http = require("http");

const { addUser, removeUser, getUser, getUsersInRoom } = require("./users");

const router = require("./router");

const PORT = process.env.PORT || 5000;

const app = express();

app.use(cors());

app.use(router);

const server = http.createServer(app);

const io = socketio(server, {
  cors: {
    origin: "*",
    methods: "*",
  },
});

io.on("connection", (socket) => {
  socket.on("join", ({ name, room }, callback) => {
    const { error, user } = addUser({ id: socket.id, name, room });
    if (error) return callback(error);
    socket.emit("message", {
      user: "admin",
      text: `${user.name}, welcome to the room ${user.room}`,
    });
    socket.broadcast
      .to(user.room)
      .emit("message", {
        user: "admin",
        text: `user ${user.name}, has joined!`,
      });
    socket.join(user.room);

    io.to(user.room).emit('roomData', { room: user.room , users: getUsersInRoom(user.room)})

    callback();
  });

  socket.on("sendMessage", (message, callback) => {
    const user = getUser(socket.id);

    io.to(user.room).emit("message", { user: user.name, text: message });

    callback();
  });

  socket.on("disconnect", () => {
    console.log("User had left");
    const user = removeUser(socket.id);
    if(user){
      io.to(user.room).emit('roomData', { room: user.room , users: getUsersInRoom(user.room)})
    }
    if (user) {
      io.to(user.room).emit("message", {
        user: 'admin',
        text: `${user.name} has left`,
      });
    }
  });
});

server.listen(PORT, () => console.log(`Server started on port ${PORT}`));
