import jwt from "jsonwebtoken"
import User from "../models/User.js"

// Register a new user
export const register = async (req, res) => {
  try {
    const { username, email, password } = req.body

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ email }, { username }],
    })

    if (existingUser) {
      return res.status(400).json({
        message: "User with this email or username already exists",
      })
    }

    // Create new user
    const user = new User({ username, email, password })
    await user.save()

    // Generate JWT token
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET || "kartik", { expiresIn: "7d" })

    res.status(201).json({
      token,
      user: {
        _id: user._id,
        username: user.username,
        email: user.email,
        profilePicture: user.profilePicture,
        bio: user.bio,
      },
    })
  } catch (error) {
    console.error("Registration error:", error)
    res.status(500).json({ message: "Server error" })
  }
}

// Login user
export const login = async (req, res) => {
  try {
    const { email, password } = req.body

    // Find user by email
    const user = await User.findOne({ email })

    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" })
    }

    // Compare passwords
    const isMatch = await user.comparePassword(password)

    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" })
    }

    // Update last seen and online status
    user.lastSeen = new Date()
    user.isOnline = true
    await user.save()

    // Generate JWT token
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET || "kartik", { expiresIn: "7d" })

    res.json({
      token,
      user: {
        _id: user._id,
        username: user.username,
        email: user.email,
        profilePicture: user.profilePicture,
        bio: user.bio,
      },
    })
  } catch (error) {
    console.error("Login error:", error)
    res.status(500).json({ message: "Server error" })
  }
}

// Logout user
export const logout = async (req, res) => {
  try {
    // Update last seen and online status
    const user = await User.findById(req.user._id)
    if (user) {
      user.lastSeen = new Date()
      user.isOnline = false
      await user.save()
    }

    res.json({ message: "Logged out successfully" })
  } catch (error) {
    console.error("Logout error:", error)
    res.status(500).json({ message: "Server error" })
  }
}

