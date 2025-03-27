import Conversation from "../models/Conversation.js"
import User from "../models/User.js"

// Get all conversations for a user
export const getConversations = async (req, res) => {
  try {
    const conversations = await Conversation.find({
      participants: req.user._id,
      [`isDeleted.${req.user._id}`]: { $ne: true },
    })
      .populate("participants", "username email profilePicture isOnline lastSeen")
      .populate("lastMessage")
      .sort({ updatedAt: -1 })

    // Filter out conversations with blocked users
    const filteredConversations = conversations.filter((conversation) => {
      const otherParticipant = conversation.participants.find((p) => p._id.toString() !== req.user._id.toString())

      return !req.user.blockedUsers.includes(otherParticipant._id)
    })

    res.json(filteredConversations)
  } catch (error) {
    console.error("Error fetching conversations:", error)
    res.status(500).json({ message: "Server error" })
  }
}

// Create a new conversation
export const createConversation = async (req, res) => {
  try {
    const { recipientId } = req.body

    if (!recipientId) {
      return res.status(400).json({ message: "Recipient ID is required" })
    }

    // Check if recipient exists
    const recipient = await User.findById(recipientId)

    if (!recipient) {
      return res.status(404).json({ message: "Recipient not found" })
    }

    // Check if recipient is blocked
    if (req.user.blockedUsers.includes(recipientId)) {
      return res.status(403).json({ message: "You have blocked this user" })
    }

    // Check if conversation already exists
    let conversation = await Conversation.findOne({
      participants: { $all: [req.user._id, recipientId] },
    })

    if (conversation) {
      // If conversation was deleted by the user, mark it as not deleted
      if (conversation.isDeleted.get(req.user._id.toString())) {
        conversation.isDeleted.set(req.user._id.toString(), false)
        await conversation.save()
      }

      await conversation.populate("participants", "username email profilePicture isOnline lastSeen")
      return res.json(conversation)
    }

    // Create new conversation
    conversation = new Conversation({
      participants: [req.user._id, recipientId],
    })

    await conversation.save()

    // Populate participants
    await conversation.populate("participants", "username email profilePicture isOnline lastSeen")

    res.status(201).json(conversation)
  } catch (error) {
    console.error("Error creating conversation:", error)
    res.status(500).json({ message: "Server error" })
  }
}

// Delete a conversation
export const deleteConversation = async (req, res) => {
  try {
    const { conversationId } = req.params

    // Find the conversation
    const conversation = await Conversation.findOne({
      _id: conversationId,
      participants: req.user._id,
    })

    if (!conversation) {
      return res.status(404).json({ message: "Conversation not found" })
    }

    // Mark conversation as deleted for this user
    conversation.isDeleted.set(req.user._id.toString(), true)
    await conversation.save()

    res.json({ message: "Conversation deleted successfully" })
  } catch (error) {
    console.error("Error deleting conversation:", error)
    res.status(500).json({ message: "Server error" })
  }
}

