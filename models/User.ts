import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  passwordHash: { type: String, required: true },
  pinHash: { type: String, required: false },
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
    waterGoalMl: { type: Number, default: 2000, min: 500, max: 5000 },
    profile: {
      age: { type: Number, required: false },
      gender: { type: String, enum: ['male', 'female'], required: false },
      heightCm: { type: Number, required: false },
      activityLevel: { 
        type: String, 
        enum: ['sedentary', 'lightly_active', 'moderately_active', 'very_active', 'extremely_active'],
        required: false 
      },
      goal: { type: String, enum: ['cut', 'maintain', 'bulk'], required: false },
      cutIntensity: { type: String, enum: ['gentle', 'moderate', 'aggressive'], required: false },
      macroDistribution: {
        type: { 
          type: String, 
          enum: ['balanced', 'high_protein', 'keto', 'low_carb', 'custom'],
          required: false 
        },
        proteinPercent: { type: Number, required: false },
        fatPercent: { type: Number, required: false },
        carbsPercent: { type: Number, required: false },
      },
    },
  },
}, { timestamps: true });

export default mongoose.models.User || mongoose.model('User', UserSchema);
