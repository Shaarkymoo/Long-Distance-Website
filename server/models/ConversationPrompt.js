import mongoose from 'mongoose';

const conversationPromptSchema = new mongoose.Schema({
  promptText: { type: String },
  used: { type: Boolean, default: false },
  isCurrent: { type: Boolean, default: false },
  // { userId: { text: String, updatedAt: Date } }
  thoughts: { type: Object, default: {} },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model('ConversationPrompt', conversationPromptSchema);
