'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import Link from 'next/link';
import { FoodSearchModal } from '@/components/food/FoodSearchModal';
import { Food } from '@/types';

export default function FoodsPage() {
  const { user, loading } = useAuth();
  const [foods, setFoods] = useState<Food[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingFoods, setLoadingFoods] = useState(true);
  const [showSearchModal, setShowSearchModal] = useState(false);

  useEffect(() => {
    if (user) {
      loadFoods();
    }
  }, [user]);

  const loadFoods = async () => {
    try {
      setLoadingFoods(true);
      const res = await fetch('/api/foods');
      if (res.ok) {
        const data = await res.json();
        setFoods(data.foods || []);
      }
    } catch (error) {
      console.error('Error loading foods:', error);
    } finally {
      setLoadingFoods(false);
    }
  };

  const filteredFoods = foods.filter((food) =>
    food.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (food.brand && food.brand.toLowerCase().includes(searchQuery.toLowerCase()))
  );

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
        <div className="mb-6">
          <h1 className="text-2xl font-bold mb-4 text-gray-900 dark:text-gray-100">Mis Alimentos</h1>
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              placeholder="Buscar alimentos..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            />
            <button
              onClick={() => setShowSearchModal(true)}
              className="px-4 py-2 bg-green-600 text-white rounded"
            >
              🌐 Online
            </button>
            <Link
              href="/foods/new"
              className="px-4 py-2 bg-indigo-600 text-white rounded"
            >
              + Nuevo
            </Link>
          </div>
        </div>

        {loadingFoods ? (
          <div className="text-center py-8 text-gray-900 dark:text-gray-100">Cargando...</div>
        ) : filteredFoods.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            {searchQuery ? 'No se encontraron alimentos' : 'No tienes alimentos guardados'}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredFoods.map((food, index) => (
              <div
                key={food._id}
                className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 animate-slide-up transition-smooth hover:shadow-md"
                style={{ animationDelay: `${index * 30}ms` }}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100">{food.name}</h3>
                    {food.brand && (
                      <p className="text-sm text-gray-600 dark:text-gray-300">{food.brand}</p>
                    )}
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {food.macros.kcal} kcal | P: {food.macros.protein}g | C: {food.macros.carbs}g | G: {food.macros.fat}g
                    </p>
                  </div>
                  <Link
                    href={`/foods/${food._id}/edit`}
                    className="text-indigo-600 dark:text-indigo-400 text-sm hover:text-indigo-800 dark:hover:text-indigo-300 transition-colors"
                  >
                    Editar
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <FoodSearchModal
        isOpen={showSearchModal}
        onClose={() => setShowSearchModal(false)}
        onSelectFood={(food) => {
          // Refresh foods list after adding
          loadFoods();
          setShowSearchModal(false);
        }}
      />

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
        <div className="max-w-2xl mx-auto flex justify-around">
          <Link href="/today" className="flex-1 py-3 text-center text-gray-600 dark:text-gray-300">
            Hoy
          </Link>
          <Link href="/foods" className="flex-1 py-3 text-center text-indigo-600 dark:text-indigo-400 font-medium">
            Alimentos
          </Link>
          <Link href="/weight" className="flex-1 py-3 text-center text-gray-600 dark:text-gray-300">
            Peso
          </Link>
          <Link href="/settings" className="flex-1 py-3 text-center text-gray-600 dark:text-gray-300">
            Ajustes
          </Link>
        </div>
      </nav>
    </div>
  );
}
