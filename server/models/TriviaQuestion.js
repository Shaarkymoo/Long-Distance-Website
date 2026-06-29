import mongoose from 'mongoose';

const triviaQuestionSchema = new mongoose.Schema({
  coupleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Couple', index: true },
  question: { type: String },
  options: [{ type: String }],
  correctAnswer: { type: String },
  category: { type: String },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  answeredBy: [{
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    correct: { type: Boolean },
  }],
});

export default mongoose.model('TriviaQuestion', triviaQuestionSchema);
