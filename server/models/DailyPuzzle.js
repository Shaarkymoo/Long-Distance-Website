import mongoose from 'mongoose';

const dailyPuzzleSchema = new mongoose.Schema({
  date: { type: String },
  title: { type: String },
  link: { type: String },
  completedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  puzzleType: { type: String },
});

export default mongoose.model('DailyPuzzle', dailyPuzzleSchema);
