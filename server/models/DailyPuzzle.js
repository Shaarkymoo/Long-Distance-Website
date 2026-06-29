import mongoose from 'mongoose';

const dailyPuzzleSchema = new mongoose.Schema({
  coupleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Couple', index: true },
  date: { type: String },
  title: { type: String },
  link: { type: String },
  completedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  puzzleType: { type: String },
});

export default mongoose.model('DailyPuzzle', dailyPuzzleSchema);
