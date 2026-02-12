import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  passwordHash: { type: String, required: true },
  pinHash: { type: String, required: true },
  settings: {
    goals: {
      kcal: { type: Number, default: 2000 },
      protein: { type: Number, default: 150 },
      carbs: { type: Number, default: 200 },
      fat: { type: Number, default: 65 },
    },
    units: { type: String, enum: ['kg', 'lb'], default: 'kg' },
    timezone: { type: String, default: 'UTC' },
    pinRememberMinutes: { type: Number, default: 15 },
  },
}, { timestamps: true });

export default mongoose.models.User || mongoose.model('User', UserSchema);
