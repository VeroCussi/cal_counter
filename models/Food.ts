import mongoose from 'mongoose';

const FoodSchema = new mongoose.Schema({
  ownerUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  name: { type: String, required: true },
  brand: { type: String },
  serving: {
    type: {
      type: String,
      enum: ['per100g', 'per100ml', 'perServing'],
      required: true,
    },
    servingSizeG: { type: Number },
    servingSizeMl: { type: Number },
    baseUnit: {
      type: String,
      enum: ['g', 'ml'],
      default: 'g',
    },
    customServings: [{
      id: { type: String, required: true },
      label: { type: String, required: true },
      value: { type: Number, required: true, min: 0 },
    }],
  },
  macros: {
    kcal: { type: Number, required: true, min: 0 },
    protein: { type: Number, required: true, min: 0 },
    carbs: { type: Number, required: true, min: 0 },
    fat: { type: Number, required: true, min: 0 },
  },
  source: {
    type: String,
    enum: ['custom', 'openfoodfacts', 'usda'],
    required: true,
  },
  externalId: { type: String },
  barcode: { type: String },
}, { timestamps: true });

// Index for faster queries
FoodSchema.index({ ownerUserId: 1, name: 1 });
FoodSchema.index({ ownerUserId: 1, barcode: 1 });

export default mongoose.models.Food || mongoose.model('Food', FoodSchema);
