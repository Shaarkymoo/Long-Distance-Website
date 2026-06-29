import mongoose from 'mongoose';

const scoreSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  coupleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Couple', index: true },
  total: { type: Number, default: 0 },
  breakdown: { type: Map, of: Number, default: {} },
}, { timestamps: true });

export default mongoose.model('Score', scoreSchema);
