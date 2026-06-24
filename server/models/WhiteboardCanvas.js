import mongoose from 'mongoose';

const pointSchema = new mongoose.Schema({
  x: { type: Number, required: true },
  y: { type: Number, required: true },
}, { _id: false });

const strokeSchema = new mongoose.Schema({
  points: { type: [pointSchema], default: [] },
  color: { type: String, default: '#000000' },
  width: { type: Number, default: 3 },
}, { _id: false });

const whiteboardCanvasSchema = new mongoose.Schema({
  strokes: { type: [strokeSchema], default: [] },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

export default mongoose.model('WhiteboardCanvas', whiteboardCanvasSchema);
