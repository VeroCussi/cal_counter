'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Food } from '@/types';

export default function EditFoodPage() {
  const router = useRouter();
  const params = useParams();
  const foodId = params.id as string;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
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

  useEffect(() => {
    loadFood();
  }, [foodId]);

  const loadFood = async () => {
    try {
      const res = await fetch('/api/foods');
      if (res.ok) {
        const data = await res.json();
        const food = data.foods.find((f: Food) => f._id === foodId);
        if (food) {
          setFormData({
            name: food.name,
            brand: food.brand || '',
            servingType: food.serving.type,
            servingSizeG: food.serving.servingSizeG?.toString() || '',
            kcal: food.macros.kcal.toString(),
            protein: food.macros.protein.toString(),
            carbs: food.macros.carbs.toString(),
            fat: food.macros.fat.toString(),
          });
        }
      }
    } catch (error) {
      console.error('Error loading food:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const res = await fetch(`/api/foods/${foodId}`, {
        method: 'PUT',
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
          source: 'custom', // Keep original source or update as needed
        }),
      });

      if (res.ok) {
        router.push('/foods');
      } else {
        const data = await res.json();
        alert(data.error || 'Error al actualizar alimento');
      }
    } catch (error) {
      console.error('Error updating food:', error);
      alert('Error de conexión');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('¿Estás seguro de que quieres eliminar este alimento?')) {
      return;
    }

    try {
      const res = await fetch(`/api/foods/${foodId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        router.push('/foods');
      } else {
        const data = await res.json();
        alert(data.error || 'Error al eliminar alimento');
      }
    } catch (error) {
      console.error('Error deleting food:', error);
      alert('Error de conexión');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-600">Cargando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-md mx-auto">
        <h1 className="text-2xl font-bold mb-6">Editar alimento</h1>

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
              disabled={saving}
              className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded disabled:opacity-50"
            >
              {saving ? 'Guardando...' : 'Guardar'}
            </button>
          </div>

          <div className="pt-4 border-t">
            <button
              type="button"
              onClick={handleDelete}
              className="w-full px-4 py-2 bg-red-600 text-white rounded"
            >
              Eliminar alimento
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
