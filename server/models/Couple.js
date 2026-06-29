import mongoose from 'mongoose';

const coupleSchema = new mongoose.Schema({
  name: { type: String, default: '' },
}, { timestamps: true });

export default mongoose.model('Couple', coupleSchema);
