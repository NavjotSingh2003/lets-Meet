const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);

app.use(cors());

// ✅ Initialize Socket.IO once (no duplicate)
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",  // frontend (Vite)
    methods: ["GET", "POST"],
    credentials: true
  },
  transports: ["websocket", "polling"]
});

// ✅ Simple status route
app.get('/api/status', (req, res) => {
  res.send({ status: '✅ Server is live' });
});

// ✅ Room management
const roomMembers = {};
const socketUsernames = {};

io.on('connection', (socket) => {
  console.log('🟢 New client connected:', socket.id);

  socket.conn.on('upgrade', () => {
    console.log(`Client ${socket.id} upgraded transport to: ${socket.conn.transport.name}`);
  });

  // Join Room
  socket.on('join-room', ({ roomId, username }) => {
    socket.join(roomId);
    console.log(`📢 ${socket.id} (${username}) joined room ${roomId}`);

    socketUsernames[socket.id] = username;

    if (!roomMembers[roomId]) roomMembers[roomId] = [];
    roomMembers[roomId].push(socket.id);

    socket.to(roomId).emit('user-joined', { id: socket.id, name: username });
    io.to(roomId).emit('room-participants', roomMembers[roomId].length);

    console.log(`👥 Room ${roomId} members:`, roomMembers[roomId]);
  });

  // Chat Message
  socket.on('chat-message', ({ roomId, message, senderName }) => {
    io.to(roomId).emit('chat-message', {
      message,
      senderId: socket.id,
      senderName: senderName || socketUsernames[socket.id]
    });
  });

  // WebRTC Signaling
  socket.on('signal', ({ roomId, signal, to }) => {
    console.log(`📤 ${socket.id} signaling ${to} in room ${roomId}`);
    io.to(to).emit('signal', {
      from: socket.id,
      signal,
    });
  });

  // Typing indicators
  socket.on('typing', ({ roomId }) => {
    socket.to(roomId).emit('typing', { senderId: socket.id });
  });

  socket.on('stop-typing', ({ roomId }) => {
    socket.to(roomId).emit('stop-typing');
  });

  // Disconnect logic
  socket.on('disconnect', () => {
    console.log('🔴 Client disconnected:', socket.id);

    for (const roomId in roomMembers) {
      roomMembers[roomId] = roomMembers[roomId].filter(id => id !== socket.id);
      socket.to(roomId).emit('user-disconnected', socket.id);

      if (roomMembers[roomId].length === 0) {
        delete roomMembers[roomId];
      } else {
        io.to(roomId).emit('room-participants', roomMembers[roomId].length);
      }
    }

    delete socketUsernames[socket.id];
  });
});

// ✅ Server start
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
});
