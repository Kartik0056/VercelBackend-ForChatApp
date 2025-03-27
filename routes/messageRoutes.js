import express from "express"
import multer from "multer"
import path from "path"
import { fileURLToPath } from "url"
import { getMessages, sendMessage, deleteMessage, updateCallStatus } from "../controllers/messageController.js"
import { authenticate } from "../middleware/auth.js"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, "..", "uploads"))
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9)
    cb(null, uniqueSuffix + path.extname(file.originalname))
  },
})

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
})

const router = express.Router()

// Get messages for a conversation
router.get("/:conversationId/messages", authenticate, getMessages)

// Send a message
router.post("/:conversationId/messages", authenticate, upload.single("file"), sendMessage)

// Delete a message
router.delete("/:messageId", authenticate, deleteMessage)

// Update call status
router.put("/:messageId/call-status", authenticate, updateCallStatus)

export default router

