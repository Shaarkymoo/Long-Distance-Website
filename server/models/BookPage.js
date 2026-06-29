import mongoose from 'mongoose';

const bookPageSchema = new mongoose.Schema({
  coupleId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Couple', index: true },
  bookId:     { type: mongoose.Schema.Types.ObjectId, ref: 'Book', required: true, index: true },
  pageNumber: { type: Number, required: true },
  content:    { type: String, required: true },
});

bookPageSchema.index({ bookId: 1, pageNumber: 1 }, { unique: true });

export default mongoose.model('BookPage', bookPageSchema);
