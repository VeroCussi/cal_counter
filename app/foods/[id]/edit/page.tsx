'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Food } from '@/types';
import { useAuth } from '@/hooks/useAuth';
import { OfflineService } from '@/lib/offline-service';

export default function EditFoodPage() {
  const router = useRouter();
  const params = useParams();
  const { user } = useAuth();
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
    if (!user) return;
    
    try {
      // Use offline-first service
      const foods = await OfflineService.loadFoods(user._id, 'all');
      const food = foods.find((f: Food) => f._id === foodId);
      if (food) {
        setFormData({
          name: food.name,
          brand: food.brand || '',
          servingType: food.serving.type === 'perServing' ? 'perServing' : (food.serving.type === 'per100ml' ? 'per100g' : 'per100g'),
          servingSizeG: food.serving.servingSizeG?.toString() || '',
          kcal: food.macros.kcal.toString(),
          protein: food.macros.protein.toString(),
          carbs: food.macros.carbs.toString(),
          fat: food.macros.fat.toString(),
        });
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
    if (!user) return;
    
    setSaving(true);

    try {
      // Use offline-first service
      await OfflineService.updateFood(user._id, foodId, {
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
      });

      // Try to sync if online
      if (navigator.onLine) {
        const { syncService } = await import('@/lib/sync/sync-service');
        syncService.sync(user._id).catch((err) => {
          console.error('Sync error:', err);
        });
      }

      router.push('/foods');
    } catch (error) {
      console.error('Error updating food:', error);
      alert('Error al actualizar alimento');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('¿Estás seguro de que quieres eliminar este alimento?') || !user) {
      return;
    }

    try {
      // Use offline-first service
      await OfflineService.deleteFood(user._id, foodId);

      // Try to sync if online
      if (navigator.onLine) {
        const { syncService } = await import('@/lib/sync/sync-service');
        syncService.sync(user._id).catch((err) => {
          console.error('Sync error:', err);
        });
      }

      router.push('/foods');
    } catch (error) {
      console.error('Error deleting food:', error);
      alert('Error al eliminar alimento');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-gray-600 dark:text-gray-300">Cargando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
      <div className="max-w-md mx-auto">
        <h1 className="text-2xl font-bold mb-6 text-gray-900 dark:text-gray-100">Editar alimento</h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Nombre *</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
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
              className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Tipo de porción</label>
            <select
              name="servingType"
              value={formData.servingType}
              onChange={handleChange}
              className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
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
                className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
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
                className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
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
                className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
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
                className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
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
                className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
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
