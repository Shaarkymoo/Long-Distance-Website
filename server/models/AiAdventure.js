import mongoose from 'mongoose';

const messageEntrySchema = new mongoose.Schema({
  author: { type: String, enum: ['user1', 'user2', 'ai'], required: true },
  content: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
}, { _id: false });

const aiAdventureSchema = new mongoose.Schema({
  title: { type: String, default: '' },
  persona: { type: String, required: true },
  environment: { type: String, required: true },
  user1Profile: { type: String, default: '' },
  user2Profile: { type: String, default: '' },
  user1: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  user2: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  maxRounds: { type: Number, required: true, default: 30, min: 1, max: 100 },
  currentRound: { type: Number, default: 0 },
  status: { type: String, enum: ['active', 'concluded'], default: 'active' },
  currentTurn: { type: String, enum: ['user1', 'user2'], default: 'user1' },
  history: [messageEntrySchema],
}, { timestamps: true });

export default mongoose.model('AiAdventure', aiAdventureSchema);
