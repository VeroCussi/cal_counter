import mongoose from 'mongoose';

const EntrySchema = new mongoose.Schema({
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
  mealType: {
    type: String,
    enum: ['breakfast', 'lunch', 'dinner', 'snack'],
    required: true,
  },
  foodId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Food',
    required: true,
  },
  quantity: {
    grams: { type: Number, required: true, min: 0 },
    unit: { type: String },
    customServingId: { type: String },
    displayValue: { type: Number },
    displayUnit: { type: String },
  },
  computedMacros: {
    kcal: { type: Number, required: true, min: 0 },
    protein: { type: Number, required: true, min: 0 },
    carbs: { type: Number, required: true, min: 0 },
    fat: { type: Number, required: true, min: 0 },
  },
}, { timestamps: true });

// Index for faster queries
EntrySchema.index({ ownerUserId: 1, date: 1 });
EntrySchema.index({ ownerUserId: 1, date: 1, mealType: 1 });

export default mongoose.models.Entry || mongoose.model('Entry', EntrySchema);
