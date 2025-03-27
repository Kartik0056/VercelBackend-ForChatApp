import User from "../models/User.js"
import Conversation from "../models/Conversation.js"
import Message from "../models/Message.js"
import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"
import mongoose from "mongoose"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Get current user
export const getCurrentUser = (req, res) => {
  res.json({
    _id: req.user._id,
    username: req.user.username,
    email: req.user.email,
    profilePicture: req.user.profilePicture,
    bio: req.user.bio,
    blockedUsers: req.user.blockedUsers,
  })
}

// Search users
export const searchUsers = async (req, res) => {
  try {
    const { query } = req.query

    if (!query) {
      return res.status(400).json({ message: "Search query is required" })
    }

    // Find users matching the query, excluding the current user and blocked users
    const users = await User.find({
      $and: [
        { _id: { $ne: req.user._id } }, // Exclude current user
        { _id: { $nin: req.user.blockedUsers } }, // Exclude blocked users
        {
          $or: [{ username: { $regex: query, $options: "i" } }, { email: { $regex: query, $options: "i" } }],
        },
      ],
    }).select("username email profilePicture bio")

    res.json(users)
  } catch (error) {
    console.error("Error searching users:", error)
    res.status(500).json({ message: "Server error" })
  }
}

// Get user profile
export const getUserProfile = async (req, res) => {
  try {
    const { userId } = req.params

    // Validate if userId is a valid ObjectId before querying
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: "Invalid user ID" })
    }

    const user = await User.findById(userId).select("username email profilePicture bio createdAt")

    if (!user) {
      return res.status(404).json({ message: "User not found" })
    }

    // Check if user is blocked
    if (req.user?.blockedUsers?.includes(userId)) {
      return res.status(403).json({ message: "You have blocked this user" })
    }

    res.json(user)
  } catch (error) {
    console.error("Error fetching user profile:", error)
    res.status(500).json({ message: "Server error" })
  }
}

// Update user profile
export const updateProfile = async (req, res) => {
  try {
    const { username, bio } = req.body
    const profilePicture = req.file

    const user = await User.findById(req.user._id)

    if (username) user.username = username
    if (bio) user.bio = bio

    if (profilePicture) {
      // Delete old profile picture if exists
      if (user.profilePicture) {
        const oldPicturePath = path.join(__dirname, "..", "uploads", path.basename(user.profilePicture))
        if (fs.existsSync(oldPicturePath)) {
          fs.unlinkSync(oldPicturePath)
        }
      }

      user.profilePicture = `/uploads/${profilePicture.filename}`
    }

    await user.save()

    res.json({
      _id: user._id,
      username: user.username,
      email: user.email,
      profilePicture: user.profilePicture,
      bio: user.bio,
    })
  } catch (error) {
    console.error("Error updating profile:", error)
    res.status(500).json({ message: "Server error" })
  }
}

// Block user
export const blockUser = async (req, res) => {
  try {
    const { userId } = req.params

    // Check if user exists
    const userToBlock = await User.findById(userId)
    if (!userToBlock) {
      return res.status(404).json({ message: "User not found" })
    }

    // Add user to blocked list if not already blocked
    if (!req.user.blockedUsers.includes(userId)) {
      req.user.blockedUsers.push(userId)
      await req.user.save()
    }

    res.json({ message: "User blocked successfully" })
  } catch (error) {
    console.error("Error blocking user:", error)
    res.status(500).json({ message: "Server error" })
  }
}

// Unblock user
export const unblockUser = async (req, res) => {
  try {
    const { userId } = req.params

    // Remove user from blocked list
    req.user.blockedUsers = req.user.blockedUsers.filter((id) => id.toString() !== userId)

    await req.user.save()

    res.json({ message: "User unblocked successfully" })
  } catch (error) {
    console.error("Error unblocking user:", error)
    res.status(500).json({ message: "Server error" })
  }
}

// Get blocked users
export const getBlockedUsers = async (req, res) => {
  try {
    // console.log("Request User:", req.user); // Debug req.user

    if (!req.user) {
      return res.status(400).json({ message: "User not found in request" });
    }

    const user = await User.findById(req.user._id).populate(
      "blockedUsers",
      "username email profilePicture"
    );

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json(user.blockedUsers);
  } catch (error) {
    console.error("Error fetching blocked users:", error);
    res.status(500).json({ message: "Server error" });
  }
};


// Get user dashboard data
export const getDashboardData = async (req, res) => {
  try {
    // Get total conversations
    const totalConversations = await Conversation.countDocuments({
      participants: req.user._id,
      [`isDeleted.${req.user._id}`]: { $ne: true },
    })

    // Get total messages sent
    const totalMessagesSent = await Message.countDocuments({
      sender: req.user._id,
      isDeleted: false,
    })

    // Get total messages received
    const totalMessagesReceived = await Message.countDocuments({
      conversation: { $in: await Conversation.find({ participants: req.user._id }).distinct("_id") },
      sender: { $ne: req.user._id },
      isDeleted: false,
    })

    // Get recent conversations
    const recentConversations = await Conversation.find({
      participants: req.user._id,
      [`isDeleted.${req.user._id}`]: { $ne: true },
    })
      .populate("participants", "username email profilePicture")
      .populate("lastMessage")
      .sort({ updatedAt: -1 })
      .limit(5)

    res.json({
      totalConversations,
      totalMessagesSent,
      totalMessagesReceived,
      recentConversations,
    })
  } catch (error) {
    console.error("Error fetching dashboard data:", error)
    res.status(500).json({ message: "Server error" })
  }
}

