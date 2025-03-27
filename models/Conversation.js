import mongoose from "mongoose"

const conversationSchema = new mongoose.Schema(
  {
    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    lastMessage: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message",
    },
    isDeleted: {
      type: Map,
      of: Boolean,
      default: {},
    },
  },
  { timestamps: true },
)

const Conversation = mongoose.model("Conversation", conversationSchema)

export default Conversation

