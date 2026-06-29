import mongoose from 'mongoose';

const expeditionSchema = new mongoose.Schema({
  coupleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Couple', index: true },
  title: { type: String, required: true },
  challenge: { type: String, required: true },
  generatedBy: { type: String, default: 'gemini' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  expiresAt: { type: Date },
  votes: [{
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    vote: { type: String, enum: ['go', 'no-go'] },
    votedAt: { type: Date },
  }],
  status: { type: String, enum: ['pending', 'active', 'completed', 'expired'], default: 'pending' },
  completedAt: { type: Date },
  scoreAwarded: { type: Number, default: 0 },
  readyCount: { type: Number, default: 0 },
}, { timestamps: true });

export default mongoose.model('Expedition', expeditionSchema);
