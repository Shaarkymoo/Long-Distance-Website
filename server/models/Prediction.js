import mongoose from 'mongoose';

const predictionSchema = new mongoose.Schema({
  title: { type: String },
  predictedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  result: { type: String, enum: ['pending', 'correct', 'wrong'], default: 'pending' },
  createdAt: { type: Date, default: Date.now },
  resolvedAt: { type: Date },
});

export default mongoose.model('Prediction', predictionSchema);
