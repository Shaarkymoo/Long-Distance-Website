import mongoose from 'mongoose';

const betSchema = new mongoose.Schema({
  coupleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Couple', index: true },
  challenger: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  challenged: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  goal: { type: String, required: true },
  points: { type: Number, default: 1 },
  winner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  createdAt: { type: Date, default: Date.now },
  resolvedAt: { type: Date },
});

export default mongoose.model('Bet', betSchema);
