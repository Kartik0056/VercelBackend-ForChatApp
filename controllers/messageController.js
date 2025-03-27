import Message from "../models/Message.js"
import Conversation from "../models/Conversation.js"
import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Get messages for a conversation
export const getMessages = async (req, res) => {
  try {
    const { conversationId } = req.params

    // Check if conversation exists and user is a participant
    const conversation = await Conversation.findOne({
      _id: conversationId,
      participants: req.user._id,
      [`isDeleted.${req.user._id}`]: { $ne: true },
    })

    if (!conversation) {
      return res.status(404).json({ message: "Conversation not found" })
    }

    // Get other participant
    const otherParticipantId = conversation.participants.find((p) => p.toString() !== req.user._id.toString())

    // Check if other participant is blocked
    if (req.user.blockedUsers.includes(otherParticipantId)) {
      return res.status(403).json({ message: "You have blocked this user" })
    }

    const messages = await Message.find({
      conversation: conversationId,
      isDeleted: false,
    }).sort({ createdAt: 1 })

    res.json(messages)
  } catch (error) {
    console.error("Error fetching messages:", error)
    res.status(500).json({ message: "Server error" })
  }
}

// Send a message
export const sendMessage = async (req, res) => {
  try {
    const { conversationId } = req.params
    const { text, callType } = req.body
    const file = req.file

    // Check if conversation exists and user is a participant
    const conversation = await Conversation.findOne({
      _id: conversationId,
      participants: req.user._id,
      [`isDeleted.${req.user._id}`]: { $ne: true },
    }).populate("participants")

    if (!conversation) {
      return res.status(404).json({ message: "Conversation not found" })
    }

    // Get other participant
    const otherParticipant = conversation.participants.find((p) => p._id.toString() !== req.user._id.toString())

    // Check if other participant is blocked
    if (req.user.blockedUsers.includes(otherParticipant._id)) {
      return res.status(403).json({ message: "You have blocked this user" })
    }

    // Create message
    const message = new Message({
      conversation: conversationId,
      sender: req.user._id,
      text: text || "",
      file: file
        ? {
            filename: file.filename,
            originalname: file.originalname,
            mimetype: file.mimetype,
            size: file.size,
          }
        : undefined,
      callType: callType || "none",
      callStatus: callType ? "initiated" : "none",
    })

    await message.save()

    // Update conversation's last message
    conversation.lastMessage = message._id

    // If conversation was deleted by the other user, mark it as not deleted
    if (conversation.isDeleted.get(otherParticipant._id.toString())) {
      conversation.isDeleted.set(otherParticipant._id.toString(), false)
    }

    await conversation.save()

    res.status(201).json(message)
  } catch (error) {
    console.error("Error sending message:", error)
    res.status(500).json({ message: "Server error" })
  }
}

// Delete a message
export const deleteMessage = async (req, res) => {
  try {
    const { messageId } = req.params

    // Find the message
    const message = await Message.findOne({
      _id: messageId,
      sender: req.user._id,
    })

    if (!message) {
      return res.status(404).json({ message: "Message not found or you are not the sender" })
    }

    // Delete file if exists
    if (message.file && message.file.filename) {
      const filePath = path.join(__dirname, "..", "uploads", message.file.filename)
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath)
      }
    }

    // Mark message as deleted
    message.isDeleted = true
    await message.save()

    // Update conversation's last message if needed
    const conversation = await Conversation.findById(message.conversation)
    if (conversation && conversation.lastMessage && conversation.lastMessage.toString() === messageId) {
      // Find the last non-deleted message
      const lastMessage = await Message.findOne({
        conversation: conversation._id,
        isDeleted: false,
      }).sort({ createdAt: -1 })

      if (lastMessage) {
        conversation.lastMessage = lastMessage._id
      } else {
        conversation.lastMessage = null
      }

      await conversation.save()
    }

    res.json({ message: "Message deleted successfully" })
  } catch (error) {
    console.error("Error deleting message:", error)
    res.status(500).json({ message: "Server error" })
  }
}

// Update call status
export const updateCallStatus = async (req, res) => {
  try {
    const { messageId } = req.params
    const { status, duration } = req.body

    // Find the message
    const message = await Message.findById(messageId)

    if (!message) {
      return res.status(404).json({ message: "Message not found" })
    }

    // Check if user is a participant in the conversation
    const conversation = await Conversation.findOne({
      _id: message.conversation,
      participants: req.user._id,
    })

    if (!conversation) {
      return res.status(403).json({ message: "You are not a participant in this conversation" })
    }

    // Update call status
    if (status && ["accepted", "rejected", "ended"].includes(status)) {
      message.callStatus = status
    }

    // Update call duration if provided
    if (duration && status === "ended") {
      message.callDuration = duration
    }

    await message.save()

    res.json(message)
  } catch (error) {
    console.error("Error updating call status:", error)
    res.status(500).json({ message: "Server error" })
  }
}

