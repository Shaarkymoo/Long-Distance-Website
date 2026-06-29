import mongoose from 'mongoose';

const favoriteGameSchema = new mongoose.Schema({
  coupleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Couple', index: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  gameSlug: { type: String, required: true },
}, { timestamps: true });

favoriteGameSchema.index({ userId: 1, gameSlug: 1 }, { unique: true });

export default mongoose.model('FavoriteGame', favoriteGameSchema);
