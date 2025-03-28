import express from "express";
import mongoose from "mongoose";
import http from "http";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import { ExpressPeerServer } from "peer";
import { Server } from "socket.io"; // Import Socket.IO

// Import routes
import authRoutes from "./routes/authRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import conversationRoutes from "./routes/conversationRoutes.js";
import messageRoutes from "./routes/messageRoutes.js";

// Import socket manager
import { initializeSocket } from "./socket/socketManager.js";

dotenv.config();

// ES module __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Express app
const app = express();
const server = http.createServer(app);

// Initialize Socket.io with WebSocket
const io = new Server(server, {
  cors: {
    origin: [
      "http://localhost:3000",
      "https://mychatapp-production-38b5.up.railway.app",
      "https://my-chat-app-lac.vercel.app"
    ],
    methods: ["GET", "POST"],
    credentials: true
  },
  transports: ["websocket", "polling"], //  Ensure WebSocket transport
  allowEIO3: true, //  Enable support for older Socket.IO clients
});

//  Call initializeSocket with io
initializeSocket(io);

//  Initialize PeerJS Server
const peerServer = ExpressPeerServer(server, {
  debug: true,
  path: "/peerjs",
});
app.use("/peerjs", peerServer);

// Middleware
app.use(cors({
  origin: [
    "http://localhost:3000",
    "https://mychatapp-production-38b5.up.railway.app",
    "https://vercel-backend-for-chat-app.vercel.app"
  ],
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true
}));
app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Create uploads directory if not exists
if (!fs.existsSync(path.join(__dirname, "uploads"))) {
  fs.mkdirSync(path.join(__dirname, "uploads"));
}

// Connect to MongoDB
const mongoURI = process.env.MONGO_URI;
mongoose.connect(mongoURI)
  .then(() => console.log("Connected to MongoDB Compass"))
  .catch((err) => console.error("MongoDB connection error:", err));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/conversations", conversationRoutes);
app.use("/api/messages", messageRoutes);
app.get("/", (req, res) => {
  res.send("Backend is running!");
});

// Start server
const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`PeerJS server running on port ${PORT}/peerjs`);
});
