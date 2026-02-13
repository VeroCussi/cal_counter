'use client';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface WeightEntry {
  _id: string;
  date: string;
  weightKg: number;
}

interface WeightChartProps {
  weights: WeightEntry[];
}

export function WeightChart({ weights }: WeightChartProps) {
  const chartData = weights
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((w) => ({
      date: new Date(w.date).toLocaleDateString('es-ES', { month: 'short', day: 'numeric' }),
      weight: w.weightKg,
    }));

  if (chartData.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        No hay datos para mostrar
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 animate-fade-in transition-smooth hover:shadow-md">
      <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">Gráfico</h2>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis 
            dataKey="date" 
            stroke="#6b7280"
            style={{ fontSize: '12px' }}
          />
          <YAxis 
            stroke="#6b7280"
            style={{ fontSize: '12px' }}
          />
          <Tooltip 
            contentStyle={{
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
            }}
            labelStyle={{ color: '#374151', fontWeight: 'bold' }}
          />
          <Line 
            type="monotone" 
            dataKey="weight" 
            stroke="#4f46e5" 
            strokeWidth={2}
            dot={{ fill: '#4f46e5', r: 4 }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
