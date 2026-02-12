'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import {
  calculateMacrosFromProfile,
  cmToInches,
  inchesToCm,
  kgToPounds,
  poundsToKg,
} from '@/lib/macro-calculator';
import { UserProfile, MacroCalculationResult, MacroDistributionType, CutIntensity } from '@/types';
import { getMacroDistribution } from '@/lib/macro-calculator';

interface WeightEntry {
  _id: string;
  date: string;
  weightKg: number;
}

interface MacroCalculatorProps {
  onGoalsApplied?: (goals: { kcal: number; protein: number; carbs: number; fat: number }) => void;
}

export default function MacroCalculator({ onGoalsApplied }: MacroCalculatorProps) {
  const { user, refresh } = useAuth();
  const [profile, setProfile] = useState<UserProfile>({
    age: undefined,
    gender: undefined,
    heightCm: undefined,
    activityLevel: undefined,
    goal: undefined,
    cutIntensity: 'gentle', // Default to gentle
    macroDistribution: {
      type: 'balanced',
    },
  });
  const [customMacros, setCustomMacros] = useState({
    protein: 30,
    fat: 30,
    carbs: 40,
  });
  const [manualWeight, setManualWeight] = useState<string>('');
  const [useManualWeight, setUseManualWeight] = useState(false);
  const [latestWeight, setLatestWeight] = useState<number | null>(null);
  const [loadingWeight, setLoadingWeight] = useState(true);
  const [calculation, setCalculation] = useState<MacroCalculationResult | null>(null);
  const [saving, setSaving] = useState(false);
  const [applying, setApplying] = useState(false);

  const units = user?.settings?.units || 'kg';

  // Load latest weight
  useEffect(() => {
    if (user) {
      loadLatestWeight();
      // Load existing profile if available
      if (user.settings?.profile) {
        const userProfile = user.settings.profile;
        const macroDist = userProfile.macroDistribution;
        const loadedProfile: UserProfile = {
          ...userProfile,
          macroDistribution: {
            type: (macroDist?.type || 'balanced') as MacroDistributionType,
            proteinPercent: macroDist?.proteinPercent,
            fatPercent: macroDist?.fatPercent,
            carbsPercent: macroDist?.carbsPercent,
          },
          cutIntensity: userProfile.cutIntensity || (userProfile.goal === 'cut' ? 'gentle' : undefined),
        };
        setProfile(loadedProfile);
        // Load custom macros if they exist
        if (loadedProfile.macroDistribution?.type === 'custom') {
          setCustomMacros({
            protein: loadedProfile.macroDistribution.proteinPercent || 30,
            fat: loadedProfile.macroDistribution.fatPercent || 30,
            carbs: loadedProfile.macroDistribution.carbsPercent || 40,
          });
        }
      }
    }
  }, [user]);

  // Calculate when profile or weight changes
  useEffect(() => {
    if (user) {
      let weight: number | null = null;
      
      // Use manual weight if explicitly set OR if no latest weight exists
      if ((useManualWeight || !latestWeight) && manualWeight) {
        // Normalize comma to dot for decimal separator
        const normalizedWeight = manualWeight.replace(',', '.');
        const parsed = parseFloat(normalizedWeight);
        if (!isNaN(parsed) && parsed > 0) {
          weight = units === 'kg' ? parsed : poundsToKg(parsed);
        }
      } else if (latestWeight && latestWeight > 0) {
        weight = latestWeight;
      }

      if (weight && weight > 0) {
        const result = calculateMacrosFromProfile(profile, weight);
        setCalculation(result);
      } else {
        setCalculation(null);
      }
    }
  }, [profile, latestWeight, manualWeight, useManualWeight, units, user]);

  const loadLatestWeight = async () => {
    try {
      setLoadingWeight(true);
      const today = new Date().toISOString().split('T')[0];
      const res = await fetch(`/api/weights?to=${today}`);
      if (res.ok) {
        const data = await res.json();
        const weights: WeightEntry[] = data.weights || [];
        if (weights.length > 0) {
          // Get most recent weight
          const sorted = weights.sort((a, b) => b.date.localeCompare(a.date));
          setLatestWeight(sorted[0].weightKg);
        }
      }
    } catch (error) {
      console.error('Error loading weight:', error);
    } finally {
      setLoadingWeight(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!user) return;

    // Validate all fields are filled
    if (!profile.age || !profile.gender || !profile.heightCm || !profile.activityLevel || !profile.goal) {
      alert('Por favor completa todos los campos del perfil.');
      return;
    }

    // Validate weight is available
    let weight: number | null = null;
    
    // Use manual weight if explicitly set OR if no latest weight exists
    if ((useManualWeight || !latestWeight) && manualWeight) {
      // Normalize comma to dot for decimal separator
      const normalizedWeight = manualWeight.replace(',', '.');
      const parsed = parseFloat(normalizedWeight);
      if (!isNaN(parsed) && parsed > 0) {
        weight = units === 'kg' ? parsed : poundsToKg(parsed);
      }
    } else if (latestWeight && latestWeight > 0) {
      weight = latestWeight;
    }

    if (!weight || weight <= 0) {
      alert('Por favor ingresa tu peso actual para guardar el perfil.');
      return;
    }

    try {
      setSaving(true);
      // Clean profile: remove cutIntensity if goal is not 'cut'
      const cleanedProfile = {
        ...profile,
        cutIntensity: profile.goal === 'cut' ? profile.cutIntensity : undefined,
      };
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...user.settings,
          profile: cleanedProfile,
        }),
      });

      if (res.ok) {
        await refresh();
        // Recalculate after refresh to ensure results are shown
        const result = calculateMacrosFromProfile(profile, weight);
        if (result) {
          setCalculation(result);
        }
        alert('Perfil guardado correctamente');
      } else {
        const data = await res.json();
        alert(data.error || 'Error al guardar perfil');
      }
    } catch (error) {
      console.error('Error saving profile:', error);
      alert('Error de conexión');
    } finally {
      setSaving(false);
    }
  };

  const handleApplyToGoals = async () => {
    if (!user || !calculation) return;

    try {
      setApplying(true);
      const newGoals = {
        kcal: calculation.targetCalories,
        protein: calculation.macros.protein,
        carbs: calculation.macros.carbs,
        fat: calculation.macros.fat,
      };
      // Clean profile: remove cutIntensity if goal is not 'cut'
      const cleanedProfile = {
        ...profile,
        cutIntensity: profile.goal === 'cut' ? profile.cutIntensity : undefined,
      };
      const payload = {
        ...user.settings,
        goals: newGoals,
        profile: cleanedProfile, // Also save profile
      };
      
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        await refresh();
        // Notify parent component to update local state
        if (onGoalsApplied) {
          onGoalsApplied(newGoals);
        }
        alert('Objetivos actualizados correctamente');
      } else {
        const data = await res.json();
        alert(data.error || 'Error al actualizar objetivos');
      }
    } catch (error) {
      console.error('Error applying goals:', error);
      alert('Error de conexión');
    } finally {
      setApplying(false);
    }
  };

  const displayHeight = (cm: number | undefined): string => {
    if (!cm) return '';
    return units === 'kg' ? cm.toString() : cmToInches(cm).toString();
  };

  const parseHeight = (value: string): number | undefined => {
    const num = parseFloat(value);
    if (isNaN(num)) return undefined;
    return units === 'kg' ? num : inchesToCm(num);
  };

  const displayWeight = (kg: number | null): string => {
    if (!kg) return '';
    return units === 'kg' ? kg.toFixed(1) : kgToPounds(kg).toFixed(1);
  };

  // Check if all required fields are filled
  const hasAllFields = profile.age && profile.gender && profile.heightCm && profile.activityLevel && profile.goal;
  // Use manual weight if explicitly set OR if no latest weight exists
  const hasWeight = ((useManualWeight || !latestWeight) && manualWeight) || latestWeight;
  const canCalculate = hasAllFields && hasWeight;

  const currentWeight = useManualWeight && manualWeight
    ? (units === 'kg' ? parseFloat(manualWeight) : poundsToKg(parseFloat(manualWeight)))
    : latestWeight;

  return (
    <div className="bg-white rounded-lg shadow p-6 mb-6 animate-fade-in transition-smooth hover:shadow-md">
      <h2 className="text-lg font-semibold mb-4">Calculador de Macros</h2>

      <div className="space-y-4">
        {/* Age */}
        <div>
          <label className="block text-sm font-medium mb-1">Edad (años)</label>
          <input
            type="number"
            min="13"
            max="120"
            value={profile.age || ''}
            onChange={(e) => setProfile({ ...profile, age: e.target.value ? parseInt(e.target.value) : undefined })}
            className="w-full border rounded px-3 py-2"
            placeholder="Ej: 30"
          />
        </div>

        {/* Gender */}
        <div>
          <label className="block text-sm font-medium mb-1">Género</label>
          <div className="flex gap-4">
            <label className="flex items-center">
              <input
                type="radio"
                name="gender"
                value="male"
                checked={profile.gender === 'male'}
                onChange={(e) => setProfile({ ...profile, gender: e.target.value as 'male' | 'female' })}
                className="mr-2"
              />
              Masculino
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                name="gender"
                value="female"
                checked={profile.gender === 'female'}
                onChange={(e) => setProfile({ ...profile, gender: e.target.value as 'male' | 'female' })}
                className="mr-2"
              />
              Femenino
            </label>
          </div>
        </div>

        {/* Height */}
        <div>
          <label className="block text-sm font-medium mb-1">
            Altura ({units === 'kg' ? 'cm' : 'pulgadas'})
          </label>
          <input
            type="number"
            min={units === 'kg' ? '100' : '40'}
            max={units === 'kg' ? '250' : '100'}
            value={displayHeight(profile.heightCm)}
            onChange={(e) => {
              const heightCm = parseHeight(e.target.value);
              setProfile({ ...profile, heightCm });
            }}
            className="w-full border rounded px-3 py-2"
            placeholder={units === 'kg' ? 'Ej: 165' : 'Ej: 65'}
          />
        </div>

        {/* Weight */}
        <div>
          <label className="block text-sm font-medium mb-1">
            Peso actual ({units === 'kg' ? 'kg' : 'lb'}) <span className="text-red-500">*</span>
          </label>
          {loadingWeight ? (
            <div className="text-sm text-gray-500">Cargando peso más reciente...</div>
          ) : (
            <>
              {latestWeight && !useManualWeight ? (
                <div>
                  <div className="mb-2 p-2 bg-gray-50 rounded border border-gray-200">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-700">
                        Peso más reciente: <span className="font-semibold">{displayWeight(latestWeight)} {units === 'kg' ? 'kg' : 'lb'}</span>
                      </span>
                      <button
                        onClick={() => setUseManualWeight(true)}
                        className="text-sm text-indigo-600 hover:underline"
                      >
                        Cambiar
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={manualWeight}
                    onChange={(e) => setManualWeight(e.target.value)}
                    className="w-full border rounded px-3 py-2"
                    placeholder={`Ingresa tu peso (${units === 'kg' ? 'kg' : 'lb'})`}
                    required
                  />
                  {latestWeight && (
                    <button
                      onClick={() => {
                        setUseManualWeight(false);
                        setManualWeight('');
                      }}
                      className="mt-2 text-sm text-indigo-600 hover:underline"
                    >
                      Usar peso más reciente ({displayWeight(latestWeight)} {units === 'kg' ? 'kg' : 'lb'})
                    </button>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Activity Level */}
        <div>
          <label className="block text-sm font-medium mb-1">Nivel de actividad</label>
          <select
            value={profile.activityLevel || ''}
            onChange={(e) => setProfile({ ...profile, activityLevel: e.target.value as UserProfile['activityLevel'] })}
            className="w-full border rounded px-3 py-2"
          >
            <option value="">Selecciona...</option>
            <option value="sedentary">Sedentario (poco o ningún ejercicio)</option>
            <option value="lightly_active">Ligeramente activo (ejercicio ligero 1-3 días/semana)</option>
            <option value="moderately_active">Moderadamente activo (ejercicio moderado 3-5 días/semana)</option>
            <option value="very_active">Muy activo (ejercicio intenso 6-7 días/semana)</option>
            <option value="extremely_active">Extremadamente activo (ejercicio muy intenso, trabajo físico)</option>
          </select>
        </div>

        {/* Goal */}
        <div>
          <label className="block text-sm font-medium mb-1">Objetivo</label>
          <select
            value={profile.goal || ''}
            onChange={(e) => {
              const newGoal = e.target.value as UserProfile['goal'];
              setProfile({ 
                ...profile, 
                goal: newGoal,
                // Reset cutIntensity if goal changes away from 'cut'
                cutIntensity: newGoal === 'cut' ? (profile.cutIntensity || 'gentle') : undefined,
              });
            }}
            className="w-full border rounded px-3 py-2"
          >
            <option value="">Selecciona...</option>
            <option value="cut">Pérdida de peso</option>
            <option value="maintain">Mantenimiento</option>
            <option value="bulk">Ganancia de peso</option>
          </select>
        </div>

        {/* Cut Intensity - Only shown when goal is 'cut' */}
        {profile.goal === 'cut' && (
          <div>
            <label className="block text-sm font-medium mb-1">Velocidad de pérdida</label>
            <select
              value={profile.cutIntensity || 'gentle'}
              onChange={(e) => setProfile({ ...profile, cutIntensity: e.target.value as CutIntensity })}
              className="w-full border rounded px-3 py-2"
            >
              <option value="gentle">Suave (recomendado): -250 kcal/día (~0,25 kg/sem)</option>
              <option value="moderate">Moderado: -400 kcal/día (~0,4 kg/sem)</option>
              <option value="aggressive">Rápido: -500 a -600 kcal/día (solo si experiencia y buen control)</option>
            </select>
          </div>
        )}

        {/* Macro Distribution */}
        <div>
          <label className="block text-sm font-medium mb-1">Distribución de Macros</label>
          <select
            value={profile.macroDistribution?.type || 'balanced'}
            onChange={(e) => {
              const type = e.target.value as MacroDistributionType;
              if (type === 'custom') {
                setProfile({
                  ...profile,
                  macroDistribution: {
                    type: 'custom',
                    proteinPercent: customMacros.protein,
                    fatPercent: customMacros.fat,
                    carbsPercent: customMacros.carbs,
                  },
                });
              } else {
                setProfile({
                  ...profile,
                  macroDistribution: { type },
                });
              }
            }}
            className="w-full border rounded px-3 py-2 mb-2"
          >
            <option value="balanced">Equilibrada (30% Proteína / 30% Grasa / 40% Carbohidratos)</option>
            <option value="high_protein">Alta Proteína (40% Proteína / 30% Grasa / 30% Carbohidratos)</option>
            <option value="keto">Keto (20% Proteína / 70% Grasa / 10% Carbohidratos)</option>
            <option value="low_carb">Baja Carbohidratos (35% Proteína / 40% Grasa / 25% Carbohidratos)</option>
            <option value="custom">Personalizada</option>
          </select>

          {profile.macroDistribution?.type === 'custom' && (
            <div className="mt-3 p-4 bg-gray-50 rounded-lg border border-gray-200 space-y-3">
              <p className="text-sm font-medium text-gray-700 mb-2">Configuración Personalizada (%)</p>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Proteína (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={customMacros.protein}
                  onChange={(e) => {
                    const protein = parseInt(e.target.value) || 0;
                    const remaining = 100 - protein;
                    const fat = Math.min(customMacros.fat, remaining);
                    const carbs = remaining - fat;
                    setCustomMacros({ protein, fat, carbs });
                    setProfile({
                      ...profile,
                      macroDistribution: {
                        type: 'custom',
                        proteinPercent: protein,
                        fatPercent: fat,
                        carbsPercent: carbs,
                      },
                    });
                  }}
                  className="w-full border rounded px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Grasa (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={customMacros.fat}
                  onChange={(e) => {
                    const fat = parseInt(e.target.value) || 0;
                    const remaining = 100 - customMacros.protein;
                    const adjustedFat = Math.min(fat, remaining);
                    const carbs = remaining - adjustedFat;
                    setCustomMacros({ ...customMacros, fat: adjustedFat, carbs });
                    setProfile({
                      ...profile,
                      macroDistribution: {
                        type: 'custom',
                        proteinPercent: customMacros.protein,
                        fatPercent: adjustedFat,
                        carbsPercent: carbs,
                      },
                    });
                  }}
                  className="w-full border rounded px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Carbohidratos (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={customMacros.carbs}
                  readOnly
                  className="w-full border rounded px-3 py-2 bg-gray-100"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Calculado automáticamente: {customMacros.carbs}%
                </p>
              </div>
              <div className="pt-2 border-t">
                <p className="text-xs text-gray-600">
                  Total: <span className="font-semibold">{customMacros.protein + customMacros.fat + customMacros.carbs}%</span>
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Results Section */}
        <div className="mt-8">
          {calculation && canCalculate ? (
            <div className="space-y-6">
              {/* Calories to maintain weight */}
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-1">
                  Calorías necesarias para mantener tu peso
                </p>
                <p className="text-3xl font-bold text-gray-900">
                  {calculation.tdee} kcal
                </p>
              </div>

              {/* Target Calories - Large Banner */}
              <div className="bg-gradient-to-r from-pink-500 to-red-500 rounded-lg p-6 text-white shadow-lg">
                <p className="text-sm font-medium mb-2 opacity-90">
                  Calorías Objetivo
                </p>
                <p className="text-5xl font-bold">
                  {calculation.targetCalories} kcal
                </p>
              </div>

              {/* Macronutrient Breakdown */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-white border-2 border-gray-200 rounded-lg p-4 text-center shadow-sm">
                  <p className="text-sm font-medium text-gray-600 mb-2">Proteína</p>
                  <p className="text-3xl font-bold text-gray-900">
                    {calculation.macros.protein}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">g</p>
                  {profile.macroDistribution && (
                    <p className="text-xs text-gray-400 mt-1">
                      {(() => {
                        const dist = profile.macroDistribution.type === 'custom' && profile.macroDistribution.proteinPercent
                          ? { protein: profile.macroDistribution.proteinPercent, fat: profile.macroDistribution.fatPercent || 0, carbs: profile.macroDistribution.carbsPercent || 0 }
                          : getMacroDistribution(profile.macroDistribution.type);
                        return `${dist.protein}%`;
                      })()}
                    </p>
                  )}
                </div>
                <div className="bg-white border-2 border-gray-200 rounded-lg p-4 text-center shadow-sm">
                  <p className="text-sm font-medium text-gray-600 mb-2">Carbohidratos</p>
                  <p className="text-3xl font-bold text-gray-900">
                    {calculation.macros.carbs}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">g</p>
                  {profile.macroDistribution && (
                    <p className="text-xs text-gray-400 mt-1">
                      {(() => {
                        const dist = profile.macroDistribution.type === 'custom' && profile.macroDistribution.proteinPercent
                          ? { protein: profile.macroDistribution.proteinPercent, fat: profile.macroDistribution.fatPercent || 0, carbs: profile.macroDistribution.carbsPercent || 0 }
                          : getMacroDistribution(profile.macroDistribution.type);
                        return `${dist.carbs}%`;
                      })()}
                    </p>
                  )}
                </div>
                <div className="bg-white border-2 border-gray-200 rounded-lg p-4 text-center shadow-sm">
                  <p className="text-sm font-medium text-gray-600 mb-2">Grasa</p>
                  <p className="text-3xl font-bold text-gray-900">
                    {calculation.macros.fat}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">g</p>
                  {profile.macroDistribution && (
                    <p className="text-xs text-gray-400 mt-1">
                      {(() => {
                        const dist = profile.macroDistribution.type === 'custom' && profile.macroDistribution.proteinPercent
                          ? { protein: profile.macroDistribution.proteinPercent, fat: profile.macroDistribution.fatPercent || 0, carbs: profile.macroDistribution.carbsPercent || 0 }
                          : getMacroDistribution(profile.macroDistribution.type);
                        return `${dist.fat}%`;
                      })()}
                    </p>
                  )}
                </div>
              </div>

              {/* Additional Info */}
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600 mb-1">BMR (Metabolismo basal)</p>
                    <p className="font-semibold text-gray-900">{calculation.bmr} kcal</p>
                  </div>
                  <div>
                    <p className="text-gray-600 mb-1">TDEE (Gasto calórico total)</p>
                    <p className="font-semibold text-gray-900">{calculation.tdee} kcal</p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-sm text-yellow-800">
                {!hasWeight 
                  ? '⚠️ Por favor ingresa tu peso actual para calcular tus macros.'
                  : !hasAllFields
                  ? '⚠️ Completa todos los campos para ver los resultados calculados.'
                  : '⚠️ Calculando...'}
              </p>
            </div>
          )}
        </div>

        {/* Buttons */}
        <div className="flex gap-2 mt-4">
          <button
            onClick={handleSaveProfile}
            disabled={saving || !profile.age || !profile.gender || !profile.heightCm || !profile.activityLevel || !profile.goal}
            className="flex-1 px-4 py-2 bg-gray-600 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Guardando...' : 'Guardar Perfil'}
          </button>
          {calculation && (
            <button
              onClick={handleApplyToGoals}
              disabled={applying}
              className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded disabled:opacity-50"
            >
              {applying ? 'Aplicando...' : 'Aplicar a Objetivos'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
