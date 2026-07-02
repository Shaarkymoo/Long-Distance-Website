import mongoose from 'mongoose';

const quizEntrySchema = new mongoose.Schema({
  coupleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Couple', index: true },
  quizTitle: { type: String, required: true },
  addedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  myResult: { type: String, default: '' },
  partnerResult: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model('QuizEntry', quizEntrySchema);
