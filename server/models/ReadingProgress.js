import mongoose from 'mongoose';

const readingProgressSchema = new mongoose.Schema({
  bookId:      { type: mongoose.Schema.Types.ObjectId, ref: 'Book', required: true },
  userId:      { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  currentPage: { type: Number, default: 0 },
  updatedAt:   { type: Date, default: Date.now },
});

readingProgressSchema.index({ bookId: 1, userId: 1 }, { unique: true });

export default mongoose.model('ReadingProgress', readingProgressSchema);
