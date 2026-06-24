import mongoose from 'mongoose';

const musicLinkSchema = new mongoose.Schema({
  title: { type: String },
  url: { type: String },
  addedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  embedType: { type: String, enum: ['youtube', 'spotify'] },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model('MusicLink', musicLinkSchema);
