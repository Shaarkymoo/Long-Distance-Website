import mongoose from 'mongoose';

const archiveEntrySchema = new mongoose.Schema({
  coupleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Couple', index: true },
  location: { type: String, required: true },
  name: { type: String, required: true },
  description: { type: String },
  discoveredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  discoveredAt: { type: Date, default: Date.now },
  discoveryCount: { type: Number, default: 1 },
});

archiveEntrySchema.index({ location: 1, name: 1 }, { unique: true });

export default mongoose.model('ArchiveEntry', archiveEntrySchema);
