import http from "http";
import express from "express";
import { Server } from "socket.io"; 
import { instrument } from "@socket.io/admin-ui";
import { TextRotationNone } from "@material-ui/icons";

const app = express();

app.set("view engine", "pug");
app.set("views", __dirname + "/views");
app.use("/public", express.static(__dirname + "/public"));
app.get("/", (req, res) => res.render("home"));
app.get("/*", (req, res) => res.redirect("/"));

const handleListen = () => console.log(`Listening on http://localhost:3000`);

const httpServer = http.createServer(app);
const wsServer = new Server(httpServer, {
    cors: {
        origin: ["https://admin.socket.io"],
        credentials: true,
    },
});

instrument(wsServer, {
    auth: false,
});

function publicRooms() {
  const {
    sockets: {
      adapter: { sids, rooms },
    },
  } = wsServer;
  const publicRooms = [];
  rooms.forEach((_, key) => {
      if(sids.get(key) === undefined){
          publicRooms.push(key)
      }
  })
  return publicRooms;
}

function countRoom(roomName){
   return wsServer.sockets.adapter.rooms.get(roomName)?.size;
}

wsServer.on("connection", (socket) => {
  socket["nickname"] = "Anon";
  socket.onAny((event) => {
    console.log(`Socket Event : ${event}`);
  });
  socket.on("enter_room", (roomName, done) => {
    //방 참가
    socket.join(roomName);
    done();
    socket.to(roomName).emit("welcome", socket.nickname, countRoom(roomName));
    wsServer.sockets.emit("room_change", publicRooms());
});
  socket.on("disconnecting", () => {
    socket.rooms.forEach((room) =>
      socket.to(room).emit("bye", socket.nickname, countRoom(room) - 1)
    );
  });
  socket.on("disconnect", () => {
      wsServer.sockets.emit("room_change", publicRooms());
  })
  //어느 방에 메시지를 보낼까?
  socket.on("new_message", (msg, roomName, done) => {
    socket.to(roomName).emit("new_message", `${socket.nickname} : ${msg}`);
    done();
  });
  //닉네임
  socket.on("nickname", (nickname) => (socket["nickname"] = nickname));
});

// function onSocketClose(){
//     console.log("Disconnected from Browser ❌")

// }

// const sockets = [];

// wss.on("connection", (socket) => {
//     sockets.push(socket);
//     socket["nickname"] = "Anonymous";
//     console.log("Connected to Browser ✅")
//     socket.on("close", onSocketClose)
//     socket.on("message", (msg) => {
//         const message = JSON.parse(msg);
//         switch(message.type) {
//             case "new_message" :
//                 sockets.forEach((aSocket) => {
//                     aSocket.send(`${socket.nickname} : ${message.payload}`);
//             });
//             case "nickname" :
//                 socket["nickname"] = message.payload;
//         }

// });
// });

httpServer.listen(3000, handleListen);
