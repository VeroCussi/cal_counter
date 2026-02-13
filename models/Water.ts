import mongoose from 'mongoose';

const WaterSchema = new mongoose.Schema({
  ownerUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  date: {
    type: String,
    required: true,
    match: /^\d{4}-\d{2}-\d{2}$/,
    index: true,
  },
  amountMl: { type: Number, required: true, min: 0 },
}, { timestamps: true });

// Index for faster queries and uniqueness per user per date
WaterSchema.index({ ownerUserId: 1, date: 1 }, { unique: true });

export default mongoose.models.Water || mongoose.model('Water', WaterSchema);
