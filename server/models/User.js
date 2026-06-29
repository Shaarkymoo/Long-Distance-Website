import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  username: { type: String, unique: true, required: true },
  password: { type: String, required: true },
  displayName: { type: String },
  coupleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Couple', index: true },
});

export default mongoose.model('User', userSchema);
