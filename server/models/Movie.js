import mongoose from 'mongoose';

const movieSchema = new mongoose.Schema({
  coupleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Couple', index: true },
  title: { type: String, required: true },
  assignedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  watched: { type: Boolean, default: false },
  watchedAt: { type: Date },
  link: { type: String },
  notes: { type: String },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model('Movie', movieSchema);
