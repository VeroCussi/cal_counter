'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface CustomServing {
  id: string;
  label: string;
  value: string;
}

export default function NewFoodPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: '',
    brand: '',
    baseUnit: 'g' as 'g' | 'ml',
    servingType: 'per100g' as 'per100g' | 'per100ml' | 'perServing',
    servingSize: '',
    kcal: '',
    protein: '',
    carbs: '',
    fat: '',
  });
  const [customServings, setCustomServings] = useState<CustomServing[]>([]);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    // If baseUnit changes and servingType is not perServing, update servingType
    if (name === 'baseUnit' && formData.servingType !== 'perServing') {
      const newBaseUnit = value as 'g' | 'ml';
      setFormData({
        ...formData,
        baseUnit: newBaseUnit,
        servingType: newBaseUnit === 'g' ? 'per100g' : 'per100ml',
      });
    } else if (name === 'servingType') {
      setFormData({
        ...formData,
        servingType: value as 'per100g' | 'per100ml' | 'perServing',
      });
    } else if (name === 'name' || name === 'brand' || name === 'servingSize' || name === 'kcal' || name === 'protein' || name === 'carbs' || name === 'fat') {
      setFormData({
        ...formData,
        [name]: value,
      });
    }
  };

  const addCustomServing = () => {
    const newId = `custom-${Date.now()}`;
    setCustomServings([
      ...customServings,
      { id: newId, label: '', value: '' },
    ]);
  };

  const removeCustomServing = (id: string) => {
    setCustomServings(customServings.filter((s) => s.id !== id));
  };

  const updateCustomServing = (id: string, field: 'label' | 'value', value: string) => {
    setCustomServings(
      customServings.map((s) => (s.id === id ? { ...s, [field]: value } : s))
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const serving: any = {
        type: formData.servingType,
        baseUnit: formData.baseUnit,
      };

      if (formData.servingType === 'perServing') {
        if (formData.baseUnit === 'g') {
          serving.servingSizeG = parseFloat(formData.servingSize);
        } else {
          serving.servingSizeMl = parseFloat(formData.servingSize);
        }
      }

      // Add custom servings if any
      if (customServings.length > 0) {
        const validServings = customServings
          .filter((s) => s.label.trim() && s.value && parseFloat(s.value) > 0)
          .map((s) => ({
            id: s.id,
            label: s.label.trim(),
            value: parseFloat(s.value),
          }));
        
        if (validServings.length > 0) {
          serving.customServings = validServings;
        }
      }

      const res = await fetch('/api/foods', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          brand: formData.brand || undefined,
          serving,
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
      } else {
        const error = await res.json();
        alert(error.error || 'Error al crear alimento');
      }
    } catch (error) {
      console.error('Error creating food:', error);
      alert('Error al crear alimento');
    } finally {
      setLoading(false);
    }
  };

  const getServingTypeLabel = () => {
    if (formData.servingType === 'per100g') return 'Por 100g';
    if (formData.servingType === 'per100ml') return 'Por 100ml';
    return 'Por porción';
  };

  const getServingSizeLabel = () => {
    return `Tamaño de porción (${formData.baseUnit})`;
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
            <label className="block text-sm font-medium mb-2">Unidad base *</label>
            <div className="flex gap-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="baseUnit"
                  value="g"
                  checked={formData.baseUnit === 'g'}
                  onChange={handleChange}
                  className="mr-2"
                />
                Gramos (g)
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="baseUnit"
                  value="ml"
                  checked={formData.baseUnit === 'ml'}
                  onChange={handleChange}
                  className="mr-2"
                />
                Mililitros (ml)
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Tipo de porción</label>
            <select
              name="servingType"
              value={formData.servingType}
              onChange={handleChange}
              className="w-full border rounded px-3 py-2"
            >
              <option value={formData.baseUnit === 'g' ? 'per100g' : 'per100ml'}>
                Por 100{formData.baseUnit}
              </option>
              <option value="perServing">Por porción</option>
            </select>
          </div>

          {formData.servingType === 'perServing' && (
            <div>
              <label className="block text-sm font-medium mb-2">{getServingSizeLabel()} *</label>
              <input
                type="number"
                step="0.1"
                name="servingSize"
                value={formData.servingSize}
                onChange={handleChange}
                className="w-full border rounded px-3 py-2"
                required
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-2">
              Macros (por {formData.servingType === 'perServing' ? 'porción' : `100${formData.baseUnit}`})
            </label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-600 mb-1">Calorías *</label>
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
                <label className="block text-xs text-gray-600 mb-1">Proteína (g) *</label>
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
                <label className="block text-xs text-gray-600 mb-1">Carbohidratos (g) *</label>
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
                <label className="block text-xs text-gray-600 mb-1">Grasa (g) *</label>
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
          </div>

          <div>
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="text-sm text-indigo-600 hover:text-indigo-800"
            >
              {showAdvanced ? '▼' : '▶'} Tamaños personalizados (opcional)
            </button>

            {showAdvanced && (
              <div className="mt-2 space-y-2">
                {customServings.map((serving) => (
                  <div key={serving.id} className="flex gap-2 items-center">
                    <input
                      type="text"
                      placeholder="Label (ej: Pequeño)"
                      value={serving.label}
                      onChange={(e) => updateCustomServing(serving.id, 'label', e.target.value)}
                      className="flex-1 border rounded px-3 py-2"
                    />
                    <input
                      type="number"
                      step="0.1"
                      placeholder={`Valor (${formData.baseUnit})`}
                      value={serving.value}
                      onChange={(e) => updateCustomServing(serving.id, 'value', e.target.value)}
                      className="w-24 border rounded px-3 py-2"
                    />
                    <button
                      type="button"
                      onClick={() => removeCustomServing(serving.id)}
                      className="text-red-600 hover:text-red-800 px-2"
                    >
                      ✕
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addCustomServing}
                  className="text-sm text-indigo-600 hover:text-indigo-800"
                >
                  + Añadir tamaño
                </button>
              </div>
            )}
          </div>

          <div className="flex gap-2 pt-4">
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
