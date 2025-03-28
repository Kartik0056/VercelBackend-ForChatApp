import jwt from "jsonwebtoken"
import User from "../models/User.js"

export const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Authentication required" })
    }

    const token = authHeader.split(" ")[1]
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "kartik")

    const user = await User.findById(decoded.userId)
    if (!user) {
      return res.status(401).json({ message: "User not found" })
    }

    req.user = user
    next()
  } catch (error) {
    return res.status(401).json({ message: "Invalid token" })
  }
}

export const socketAuth = async (socket, next) => {
  try {
    const token = socket.handshake.auth.token

    if (!token) {
      return next(new Error("Authentication required"))
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || "kartik")
    const user = await User.findById(decoded.userId)

    if (!user) {
      return next(new Error("User not found"))
    }

    socket.user = user
    next()
  } catch (error) {
    console.error("Socket authentication error:", error.message)
    next(new Error("Invalid token or authentication failed"))
  }
}

