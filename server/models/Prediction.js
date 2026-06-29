import mongoose from 'mongoose';

const predictionSchema = new mongoose.Schema({
  coupleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Couple', index: true },
  title: { type: String },
  predictedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  result: { type: String, enum: ['pending', 'correct', 'wrong'], default: 'pending' },
  createdAt: { type: Date, default: Date.now },
  resolvedAt: { type: Date },
});

export default mongoose.model('Prediction', predictionSchema);
