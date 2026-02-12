'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function NewFoodPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: '',
    brand: '',
    servingType: 'per100g' as 'per100g' | 'perServing',
    servingSizeG: '',
    kcal: '',
    protein: '',
    carbs: '',
    fat: '',
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch('/api/foods', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          brand: formData.brand || undefined,
          serving: {
            type: formData.servingType,
            servingSizeG: formData.servingType === 'perServing' ? parseFloat(formData.servingSizeG) : undefined,
          },
          macros: {
            kcal: parseFloat(formData.kcal),
            protein: parseFloat(formData.protein),
            carbs: parseFloat(formData.carbs),
            fat: parseFloat(formData.fat),
          },
          source: 'custom',
        }),
      });

      if (res.ok) {
        router.push('/foods');
      }
    } catch (error) {
      console.error('Error creating food:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-md mx-auto">
        <h1 className="text-2xl font-bold mb-6">Nuevo alimento</h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Nombre *</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className="w-full border rounded px-3 py-2"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Marca</label>
            <input
              type="text"
              name="brand"
              value={formData.brand}
              onChange={handleChange}
              className="w-full border rounded px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Tipo de porción</label>
            <select
              name="servingType"
              value={formData.servingType}
              onChange={handleChange}
              className="w-full border rounded px-3 py-2"
            >
              <option value="per100g">Por 100g</option>
              <option value="perServing">Por porción</option>
            </select>
          </div>

          {formData.servingType === 'perServing' && (
            <div>
              <label className="block text-sm font-medium mb-2">Tamaño de porción (g)</label>
              <input
                type="number"
                name="servingSizeG"
                value={formData.servingSizeG}
                onChange={handleChange}
                className="w-full border rounded px-3 py-2"
                required={formData.servingType === 'perServing'}
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Calorías *</label>
              <input
                type="number"
                name="kcal"
                value={formData.kcal}
                onChange={handleChange}
                className="w-full border rounded px-3 py-2"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Proteína (g) *</label>
              <input
                type="number"
                step="0.1"
                name="protein"
                value={formData.protein}
                onChange={handleChange}
                className="w-full border rounded px-3 py-2"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Carbohidratos (g) *</label>
              <input
                type="number"
                step="0.1"
                name="carbs"
                value={formData.carbs}
                onChange={handleChange}
                className="w-full border rounded px-3 py-2"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Grasa (g) *</label>
              <input
                type="number"
                step="0.1"
                name="fat"
                value={formData.fat}
                onChange={handleChange}
                className="w-full border rounded px-3 py-2"
                required
              />
            </div>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => router.back()}
              className="flex-1 px-4 py-2 border rounded"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded disabled:opacity-50"
            >
              {loading ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
