import mongoose from 'mongoose';

const coupleSchema = new mongoose.Schema({
  name: { type: String, default: '' },
  betFirstTo: { type: Number, default: 5 },
  betPrize: { type: String, default: 'bragging rights' },
}, { timestamps: true });

export default mongoose.model('Couple', coupleSchema);
