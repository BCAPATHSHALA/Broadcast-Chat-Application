import express from "express";
import http from "http";
import { WebSocketServer, WebSocket, RawData } from "ws";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

const rooms = new Map<string, { users: Set<WebSocket>; messages: any[] }>();

function generateRoomCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

wss.on("connection", (ws: WebSocket) => {
  console.log("Client connected");
  ws.on("message", (message: RawData) => {
    try {
      const { type, payload } = JSON.parse(message.toString());
      console.log("type:", type, "payload:", payload);

      switch (type) {
        case "create_room": {
          const roomCode = generateRoomCode();
          rooms.set(roomCode, { users: new Set([ws]), messages: [] });
          (ws as any).roomCode = roomCode;
          ws.send(JSON.stringify({ type: "room_created", roomCode }));
          break;
        }

        case "join_room": {
          // Step 1: Get the room code from map
          const room = rooms.get(payload.roomCode);

          // Step 2: Check if the room exists
          if (room && room.users.size < 10) {
            // Add the user to the room
            room.users.add(ws);

            // Send a message to current user
            (ws as any).roomCode = payload.roomCode; // attached the roomCode to the ws for using while trigering the send message type
            (ws as any).userName = payload.userName; // attach the userName to the ws
            ws.send(
              JSON.stringify({
                type: "room_joined",
                payload: {
                  roomCode: payload.roomCode,
                  messages: room.messages,
                },
              })
            );

            // Send a message to the other user in the room
            broadcastToRoom(payload.roomCode, {
              type: "user_joined",
              payload: {
                userCount: room.users.size, // Update the user count
              },
            });
          } else {
            // If the room is full, send an error message
            ws.send(
              JSON.stringify({
                type: "error",
                payload: {
                  message: "Room not found or full",
                },
              })
            );
          }
          break;
        }

        case "send_message": {
          const roomCode = (ws as any).roomCode; // Used the roomCode attached to the ws when the user joined the room
          const chatRoom = rooms.get(roomCode);
          console.log("RoomCode: ", roomCode, " ChatRoom:", chatRoom);
          /*
              type: send_message payload: { sender: 'User MJ', content: 'cxcx' }
              RoomCode:  OZJRG0  ChatRoom: {
                users: Set(1) {
                  WebSocket {
                    _events: [Object: null prototype],
                    _eventsCount: 2,
                    _maxListeners: undefined,
                    _binaryType: 'nodebuffer',
                    _closeCode: 1006,
                    _closeFrameReceived: false,
                    _closeFrameSent: false,
                    _closeMessage: <Buffer >,
                    _closeTimer: null,
                    _errorEmitted: false,
                    _extensions: {},
                    _paused: false,
                    _protocol: '',
                    _readyState: 1,
                    _receiver: [Receiver],
                    _sender: [Sender],
                    _socket: [Socket],
                    _autoPong: true,
                    _isServer: true,
                    roomCode: 'OZJRG0',
                    [Symbol(kCapture)]: false
                  }
                },
                messages: [
                  {
                    sender: 'User MJ',
                    content: 'hi from manoj',
                    timestamp: '2024-12-03T10:58:55.496Z'
                  }
                ]
              }
          */
          if (chatRoom) {
            const messageData = {
              sender: (ws as any).userName || payload.sender,
              content: payload.content,
              timestamp: new Date().toISOString(),
            };
            chatRoom.messages.push(messageData);
            broadcastToRoom(roomCode, {
              type: "new_message",
              payload: messageData,
            });
          }
          break;
        }
      }
    } catch (error) {
      console.error("Error processing message:", error);
    }
  });

  // this event trigger when a client disconnects
  ws.on("close", () => {
    const roomCode = (ws as any).roomCode;
    if (roomCode) {
      const room = rooms.get(roomCode);
      if (room) {
        room.users.delete(ws);
        if (room.users.size === 0) {
          rooms.delete(roomCode);
        } else {
          broadcastToRoom(roomCode, {
            type: "user_left",
            payload: {
              userCount: room.users.size,
            },
          });
        }
      }
    }
  });
});

// Method to broadcast a message to all users in a room
function broadcastToRoom(roomCode: string, message: any) {
  const room = rooms.get(roomCode);
  if (room) {
    // send the message to all connected users in the rooms map
    room.users.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(message));
      }
    });
  }
}

// Route for creating the chat room and store it in the rooms map
app.post("/api/create-room", (req, res) => {
  const roomCode = generateRoomCode();
  const result = rooms.set(roomCode, { users: new Set(), messages: [] });
  console.log(result);
  res.json({ roomCode });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
