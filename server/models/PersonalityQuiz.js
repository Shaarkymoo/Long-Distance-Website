import mongoose from 'mongoose';

const personalityQuizSchema = new mongoose.Schema({
  coupleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Couple', index: true },
  quizName: { type: String },
  questions: [{
    questionText: { type: String },
    options: [{ type: String }],
  }],
  answers: { type: mongoose.Schema.Types.Mixed, default: {} },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model('PersonalityQuiz', personalityQuizSchema);
