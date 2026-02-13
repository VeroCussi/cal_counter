'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { BottomNavigation } from '@/components/navigation/BottomNavigation';
import MacroCalculator from '@/components/macros/MacroCalculator';

export default function SettingsPage() {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const [goals, setGoals] = useState({
    kcal: 2000,
    protein: 150,
    carbs: 200,
    fat: 65,
  });
  const [waterGoalMl, setWaterGoalMl] = useState(2000);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      setGoals(user.settings.goals);
      setWaterGoalMl((user.settings as any).waterGoalMl || 2000);
    }
  }, [user]);

  const handleSave = async () => {
    if (!user) return;

    try {
      setSaving(true);
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...user.settings,
          goals,
          waterGoalMl,
        }),
      });

      if (res.ok) {
        // Refresh user data
        window.location.reload();
      } else {
        const data = await res.json();
        alert(data.error || 'Error al guardar objetivos');
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Error de conexión');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-gray-900 dark:text-gray-100">Cargando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-20">
      <div className="max-w-2xl mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold mb-6 text-gray-900 dark:text-gray-100">Ajustes</h1>

        {/* Macro Calculator */}
        <MacroCalculator onGoalsApplied={(newGoals) => setGoals(newGoals)} />

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6 animate-fade-in transition-smooth hover:shadow-md">
          <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">Objetivos diarios</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-gray-100">Calorías (kcal)</label>
              <input
                type="number"
                value={goals.kcal}
                onChange={(e) => setGoals({ ...goals, kcal: parseInt(e.target.value) })}
                className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-gray-100">Proteína (g)</label>
              <input
                type="number"
                value={goals.protein}
                onChange={(e) => setGoals({ ...goals, protein: parseInt(e.target.value) })}
                className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-gray-100">Carbohidratos (g)</label>
              <input
                type="number"
                value={goals.carbs}
                onChange={(e) => setGoals({ ...goals, carbs: parseInt(e.target.value) })}
                className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-gray-100">Grasa (g)</label>
              <input
                type="number"
                value={goals.fat}
                onChange={(e) => setGoals({ ...goals, fat: parseInt(e.target.value) })}
                className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              />
            </div>
            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full px-4 py-2 bg-indigo-600 text-white rounded disabled:opacity-50"
            >
              {saving ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6 animate-fade-in transition-smooth hover:shadow-md">
          <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">Objetivo de agua</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-gray-100">
                Objetivo diario de agua (ml)
              </label>
              <input
                type="number"
                min="500"
                max="5000"
                step="100"
                value={waterGoalMl}
                onChange={(e) => setWaterGoalMl(parseInt(e.target.value) || 2000)}
                className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Rango recomendado: 500ml - 5000ml
              </p>
            </div>
            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full px-4 py-2 bg-indigo-600 text-white rounded disabled:opacity-50"
            >
              {saving ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6 animate-fade-in transition-smooth hover:shadow-md">
          <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">Cuenta</h2>
          <div className="space-y-2">
            <p className="text-sm text-gray-900 dark:text-gray-100">
              <span className="font-medium">Email:</span> {user?.email}
            </p>
            <p className="text-sm text-gray-900 dark:text-gray-100">
              <span className="font-medium">Nombre:</span> {user?.name}
            </p>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 animate-fade-in transition-smooth hover:shadow-md">
          <button
            onClick={logout}
            className="w-full px-4 py-2 bg-red-600 text-white rounded transition-smooth hover:bg-red-700 hover:shadow-lg active:scale-95"
          >
            Cerrar sesión
          </button>
        </div>
      </div>

      {/* Bottom Navigation */}
      <BottomNavigation />
    </div>
  );
}
