import mongoose from 'mongoose';

const interactionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  action: { type: String, required: true },
  response: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
}, { _id: false });

const petSchema = new mongoose.Schema({
  coupleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Couple', index: true },
  name: { type: String },
  level: { type: Number, default: 1 },
  ep: { type: Number, default: 0 },
  epToNextLevel: { type: Number, default: 100 },
  traits: [{ type: String }],
  personality: { type: String },
  currentLocation: { type: String, default: 'The Cozy Home' },
  locationsUnlocked: [{ type: String }],
  lifeSummary: { type: String, default: '' },
  totalInteractions: { type: Number, default: 0 },
  recentInteractions: {
    type: [interactionSchema],
    validate: [v => v.length <= 10, 'recentInteractions capped at 10'],
  },
}, { timestamps: true });

petSchema.statics.calcEpToNextLevel = function (level) {
  return Math.floor(100 * Math.pow(1.5, level - 1));
};

export default mongoose.model('Pet', petSchema);
