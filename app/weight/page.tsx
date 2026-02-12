'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import Link from 'next/link';

interface WeightEntry {
  _id: string;
  date: string;
  weightKg: number;
}

export default function WeightPage() {
  const { user, loading } = useAuth();
  const [weights, setWeights] = useState<WeightEntry[]>([]);
  const [todayWeight, setTodayWeight] = useState('');
  const [loadingWeights, setLoadingWeights] = useState(true);

  useEffect(() => {
    if (user) {
      loadWeights();
    }
  }, [user]);

  const loadWeights = async () => {
    try {
      setLoadingWeights(true);
      const today = new Date();
      const thirtyDaysAgo = new Date(today);
      thirtyDaysAgo.setDate(today.getDate() - 90);
      const from = thirtyDaysAgo.toISOString().split('T')[0];
      const to = today.toISOString().split('T')[0];

      const res = await fetch(`/api/weights?from=${from}&to=${to}`);
      if (res.ok) {
        const data = await res.json();
        setWeights(data.weights || []);
      }
    } catch (error) {
      console.error('Error loading weights:', error);
    } finally {
      setLoadingWeights(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const weight = parseFloat(todayWeight);
    if (isNaN(weight) || weight <= 0) return;

    try {
      const today = new Date().toISOString().split('T')[0];
      const res = await fetch('/api/weights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: today,
          weightKg: weight,
        }),
      });

      if (res.ok) {
        setTodayWeight('');
        loadWeights();
      }
    } catch (error) {
      console.error('Error saving weight:', error);
    }
  };

  const chartData = weights
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((w) => ({
      date: new Date(w.date).toLocaleDateString('es-ES', { month: 'short', day: 'numeric' }),
      weight: w.weightKg,
    }));

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div>Cargando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="max-w-2xl mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold mb-6">Peso</h1>

        <div className="bg-white rounded-lg shadow p-6 mb-6 animate-fade-in transition-smooth hover:shadow-md">
          <h2 className="text-lg font-semibold mb-4">Registrar peso de hoy</h2>
          <form onSubmit={handleSubmit} className="flex gap-2">
            <input
              type="number"
              step="0.1"
              placeholder="Peso en kg"
              value={todayWeight}
              onChange={(e) => setTodayWeight(e.target.value)}
              className="flex-1 border rounded px-3 py-2"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-indigo-600 text-white rounded"
            >
              Guardar
            </button>
          </form>
        </div>

        {loadingWeights ? (
          <div className="text-center py-8">Cargando...</div>
        ) : weights.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No hay registros de peso
          </div>
        ) : (
          <>
            <div className="bg-white rounded-lg shadow p-6 mb-6 animate-fade-in transition-smooth hover:shadow-md">
              <h2 className="text-lg font-semibold mb-4">Últimos registros</h2>
              <div className="space-y-2">
                {weights.slice(0, 10).map((w, index) => (
                  <div 
                    key={w._id} 
                    className="flex justify-between text-sm animate-slide-up transition-smooth hover:bg-gray-50 p-2 rounded"
                    style={{ animationDelay: `${index * 30}ms` }}
                  >
                    <span>{new Date(w.date).toLocaleDateString('es-ES')}</span>
                    <span className="font-medium">{w.weightKg} kg</span>
                  </div>
                ))}
              </div>
            </div>

            {chartData.length > 0 && (
              <div className="bg-white rounded-lg shadow p-6 animate-fade-in transition-smooth hover:shadow-md">
                <h2 className="text-lg font-semibold mb-4">Gráfico</h2>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="weight" stroke="#4f46e5" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </>
        )}
      </div>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200">
        <div className="max-w-2xl mx-auto flex justify-around">
          <Link href="/today" className="flex-1 py-3 text-center text-gray-600">
            Hoy
          </Link>
          <Link href="/foods" className="flex-1 py-3 text-center text-gray-600">
            Alimentos
          </Link>
          <Link href="/weight" className="flex-1 py-3 text-center text-indigo-600 font-medium">
            Peso
          </Link>
          <Link href="/settings" className="flex-1 py-3 text-center text-gray-600">
            Ajustes
          </Link>
        </div>
      </nav>
    </div>
  );
}
