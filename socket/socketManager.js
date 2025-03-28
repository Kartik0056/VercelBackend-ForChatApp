import { Server } from "socket.io"
import { socketAuth } from "../middleware/auth.js"
import User from "../models/User.js"

// Online users tracking
const onlineUsers = {}

export const initializeSocket = (server) => {
  const io = new Server(server, {
     cors: {
    origin: [
      "http://localhost:3000",
      "https://mychatapp-production-38b5.up.railway.app",
      "https://vercel-backend-for-chat-app.vercel.app"
    ],
    methods: ["GET", "POST"],
    credentials: true,
  },
  })

  // Socket.io authentication middleware
  io.use(socketAuth)

  // Socket.io connection handler
  io.on("connection", (socket) => {
    const userId = socket.user._id.toString()

    // Update user status to online
    onlineUsers[userId] = {
      online: true,
      socketId: socket.id,
      lastSeen: new Date(),
    }

    // Update user in database
    User.findByIdAndUpdate(userId, {
      isOnline: true,
      lastSeen: new Date(),
    }).catch((err) => {
      console.error("Error updating user status:", err)
    })

    // Broadcast online users to all connected clients
    io.emit("users:online", onlineUsers)

    // Handle new message
    socket.on("message:new", (message) => {
      // Find the recipient
      const conversation = message.conversation
      const sender = message.sender

      // Emit to all participants except sender
      socket.to(`conversation:${conversation}`).emit("message:new", message)
    })

    // Join conversation room
    socket.on("conversation:join", (conversationId) => {
      socket.join(`conversation:${conversationId}`)
    })

    // Leave conversation room
    socket.on("conversation:leave", (conversationId) => {
      socket.leave(`conversation:${conversationId}`)
    })

    // Handle call signaling
    socket.on("call:signal", ({ to, signal, callType }) => {
      console.log(`Call signal from ${userId} to ${to}, type: ${callType}`)

      if (onlineUsers[to]) {
        io.to(onlineUsers[to].socketId).emit("call:incoming", {
          from: userId,
          signal,
          callType,
        })
      }
    })

    // Handle call acceptance
    socket.on("call:accept", ({ to, signal }) => {
      console.log(`Call accepted by ${userId} to ${to}`)

      if (onlineUsers[to]) {
        io.to(onlineUsers[to].socketId).emit("call:accepted", {
          from: userId,
          signal,
        })
      }
    })

    // Handle call rejection
    socket.on("call:reject", ({ to }) => {
      console.log(`Call rejected by ${userId} to ${to}`)

      if (onlineUsers[to]) {
        io.to(onlineUsers[to].socketId).emit("call:rejected", {
          from: userId,
        })
      }
    })

    // Handle call end
    socket.on("call:end", ({ to }) => {
      console.log(`Call ended by ${userId} to ${to}`)

      if (onlineUsers[to]) {
        io.to(onlineUsers[to].socketId).emit("call:ended", {
          from: userId,
        })
      }
    })

    // Handle disconnect
    socket.on("disconnect", async () => {
      if (onlineUsers[userId]) {
        onlineUsers[userId].online = false
        onlineUsers[userId].lastSeen = new Date()

        // Broadcast updated status
        io.emit("users:online", onlineUsers)

        // Update user in database
        await User.findByIdAndUpdate(userId, {
          isOnline: false,
          lastSeen: new Date(),
        }).catch((err) => {
          console.error("Error updating user status:", err)
        })

        // Remove user from online users after some time
        setTimeout(() => {
          if (onlineUsers[userId] && !onlineUsers[userId].online) {
            delete onlineUsers[userId]
            io.emit("users:online", onlineUsers)
          }
        }, 3600000) // 1 hour
      }
    })
  })

  return io
}

export const getOnlineUsers = () => {
  return onlineUsers
}

