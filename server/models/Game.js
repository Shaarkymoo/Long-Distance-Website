import mongoose from 'mongoose';

const gameSchema = new mongoose.Schema({
  coupleId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Couple', index: true },
  name:        { type: String, required: true },
  slug:        { type: String, required: true, unique: true },
  description: { type: String, default: '' },
  link:        { type: String, required: true },
  tag:         { type: String, default: 'other' },
  players:     { type: String, default: '2+' },
  addedBy:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

export default mongoose.model('Game', gameSchema);
