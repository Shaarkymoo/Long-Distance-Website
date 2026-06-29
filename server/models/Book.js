import mongoose from 'mongoose';

const bookSchema = new mongoose.Schema({
  coupleId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Couple', index: true },
  title:      { type: String, required: true },
  author:     { type: String, default: 'Unknown' },
  totalPages: { type: Number, required: true },
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  gridfsId:  { type: mongoose.Schema.Types.ObjectId },
  uploadedAt: { type: Date, default: Date.now },
});

export default mongoose.model('Book', bookSchema);
