import express from "express"
import { getConversations, createConversation, deleteConversation } from "../controllers/conversationController.js"
import { authenticate } from "../middleware/auth.js"

const router = express.Router()

// Get all conversations
router.get("/", authenticate, getConversations)

// Create a new conversation
router.post("/", authenticate, createConversation)

// Delete a conversation
router.delete("/:conversationId", authenticate, deleteConversation)

export default router

