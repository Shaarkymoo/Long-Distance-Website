import mongoose from 'mongoose';

const movieSchema = new mongoose.Schema({
  coupleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Couple', index: true },
  title: { type: String, required: true },
  suggestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  watchedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  link: { type: String },
  notes: { type: String },
  resolved: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model('Movie', movieSchema);
