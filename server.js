import express from "express"
import mongoose from "mongoose"
import http from "http"
import cors from "cors"
import dotenv from "dotenv"
import path from "path"
import { fileURLToPath } from "url"
import fs from "fs"
import { ExpressPeerServer } from "peer"

// Import routes
import authRoutes from "./routes/authRoutes.js"
import userRoutes from "./routes/userRoutes.js"
import conversationRoutes from "./routes/conversationRoutes.js"
import messageRoutes from "./routes/messageRoutes.js"

// Import socket manager
import { initializeSocket } from "./socket/socketManager.js"

// Load environment variables
dotenv.config()

// ES module __dirname equivalent
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Initialize Express app
const app = express()
const server = http.createServer(app)

// Initialize Socket.io
const io = initializeSocket(server)

// Initialize PeerJS server
const peerServer = ExpressPeerServer(server, {
  debug: true,
  path: "/peerjs",
})

app.use("/peerjs", peerServer)

// Middleware
app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "https://mychatapp-production-38b5.up.railway.app",
      "https://vercel-backend-for-chat-app.vercel.app",
      "https://vercelbackend-forchatapp-production.up.railway.app",
    ],
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
    allowedHeaders: ["Authorization", "Content-Type"],
  }),
)
app.use(express.json())
app.use("/uploads", express.static(path.join(__dirname, "uploads")))

// Create uploads directory if it doesn't exist
if (!fs.existsSync(path.join(__dirname, "uploads"))) {
  fs.mkdirSync(path.join(__dirname, "uploads"))
}

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok", message: "Server is running" })
})

// Connect to MongoDB
mongoose
  .connect(process.env.MONGO_URI || "mongodb://localhost:27017/chat-app")
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("MongoDB connection error:", err))

// Routes
app.use("/api/auth", authRoutes)
app.use("/api/users", userRoutes)
app.use("/api/conversations", conversationRoutes)
app.use("/api/messages", messageRoutes)

// Start server
const PORT = process.env.PORT || 4000
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
  console.log(`PeerJS server running on port ${PORT}/peerjs`)
})

