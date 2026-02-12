import mongoose from 'mongoose';

const WeightSchema = new mongoose.Schema({
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
  weightKg: { type: Number, required: true, min: 0 },
}, { timestamps: true });

// Index for faster queries and uniqueness per user per date
WeightSchema.index({ ownerUserId: 1, date: 1 }, { unique: true });

export default mongoose.models.Weight || mongoose.model('Weight', WeightSchema);
