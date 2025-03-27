import express from "express"
import { register, login, logout } from "../controllers/authController.js"
import { authenticate } from "../middleware/auth.js"

const router = express.Router()

// Register route
router.post("/register", register)

// Login route
router.post("/login", login)

// Logout route
router.post("/logout", authenticate, logout)

export default router

