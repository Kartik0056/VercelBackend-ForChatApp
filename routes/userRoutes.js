import express from "express"
import multer from "multer"
import path from "path"
import { fileURLToPath } from "url"
import {
  getCurrentUser,
  searchUsers,
  getUserProfile,
  updateProfile,
  blockUser,
  unblockUser,
  getBlockedUsers,
  getDashboardData,
} from "../controllers/userController.js"
import { authenticate } from "../middleware/auth.js"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Configure multer for profile pictures
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, "..", "uploads"))
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9)
    cb(null, "profile-" + uniqueSuffix + path.extname(file.originalname))
  },
})

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png|gif/
    const mimetype = filetypes.test(file.mimetype)
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase())

    if (mimetype && extname) {
      return cb(null, true)
    }

    cb(new Error("Only image files are allowed"))
  },
})

const router = express.Router()

// Get current user
router.get("/me", authenticate, getCurrentUser)

// Search users
router.get("/search", authenticate, searchUsers)

// Get user profile
router.get("/:userId", authenticate, getUserProfile)

// Update profile
router.put("/profile", authenticate, upload.single("profilePicture"), updateProfile)

// Block user
router.post("/block/:userId", authenticate, blockUser)

// Unblock user
router.post("/unblock/:userId", authenticate, unblockUser)

// Get blocked users
router.get("/blocked/list", authenticate, getBlockedUsers)

// Get dashboard data
router.get("/dashboard/data", authenticate, getDashboardData)

export default router

