import mongoose from "mongoose"

const messageSchema = new mongoose.Schema(
  {
    conversation: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Conversation",
      required: true,
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    text: {
      type: String,
    },
    file: {
      filename: String,
      originalname: String,
      mimetype: String,
      size: Number,
    },
    read: {
      type: Boolean,
      default: false,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    callType: {
      type: String,
      enum: ["none", "audio", "video"],
      default: "none",
    },
    callStatus: {
      type: String,
      enum: ["none", "initiated", "accepted", "rejected", "ended"],
      default: "none",
    },
    callDuration: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true },
)

const Message = mongoose.model("Message", messageSchema)

export default Message

