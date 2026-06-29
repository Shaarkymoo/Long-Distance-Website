import mongoose from 'mongoose';

const rippleRoundSchema = new mongoose.Schema({
  coupleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Couple', index: true },
  question: { type: String, required: true },
  submissions: [{
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    answer: { type: String, required: true },
    submittedAt: { type: Date, default: Date.now },
  }],
  results: [{
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    opponentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    verdict: String,
    explanation: String,
  }],
  status: { type: String, enum: ['open', 'judging', 'complete'], default: 'open' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

export default mongoose.model('RippleRound', rippleRoundSchema);
