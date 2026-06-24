import mongoose from 'mongoose';

const guessObjectSchema = new mongoose.Schema({
  name: { type: String },
  imageFile: { type: String },
  category: { type: String },
});

export default mongoose.model('GuessObject', guessObjectSchema);
