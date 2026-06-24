import mongoose from 'mongoose';

const challengeSchema = new mongoose.Schema({
  challengeText: { type: String },
  category: { type: String, enum: ['fun', 'adventurous', 'romantic', 'silly'] },
  used: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model('Challenge', challengeSchema);
