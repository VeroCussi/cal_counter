'use client';

import { useState, useEffect } from 'react';
import { Food } from '@/types';

interface FoodSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectFood: (food: Food) => void;
}

interface ExternalProduct {
  name: string;
  brand?: string;
  barcode?: string;
  macros?: {
    kcal: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  source: 'openfoodfacts' | 'usda';
  externalId?: string;
  fdcId?: number;
}

export function FoodSearchModal({ isOpen, onClose, onSelectFood }: FoodSearchModalProps) {
  const [activeTab, setActiveTab] = useState<'favorites' | 'off' | 'usda'>('favorites');
  const [searchQuery, setSearchQuery] = useState('');
  const [favorites, setFavorites] = useState<Food[]>([]);
  const [offResults, setOffResults] = useState<ExternalProduct[]>([]);
  const [usdaResults, setUsdaResults] = useState<ExternalProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Load favorites when modal opens
  useEffect(() => {
    if (isOpen && activeTab === 'favorites') {
      loadFavorites();
    }
  }, [isOpen, activeTab]);

  const loadFavorites = async () => {
    try {
      const res = await fetch('/api/foods');
      if (res.ok) {
        const data = await res.json();
        setFavorites(data.foods || []);
      }
    } catch (error) {
      console.error('Error loading favorites:', error);
    }
  };

  const searchOpenFoodFacts = async () => {
    if (!searchQuery.trim()) {
      setOffResults([]);
      return;
    }

    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/external/off?q=${encodeURIComponent(searchQuery)}`);
      const data = await res.json();
      
      if (res.ok) {
        console.log('OFF Search Response:', {
          productsCount: data.products?.length || 0,
          totalResults: data.total_results,
          data,
        });
        setOffResults(data.products || []);
        
        // Show info if no results but API call was successful
        if (!data.products || data.products.length === 0) {
          setError('No se encontraron productos con datos nutricionales completos');
        }
      } else {
        const errorMsg = data.error || 'Error al buscar en Open Food Facts';
        console.error('OFF API Error:', { status: res.status, error: data });
        setError(errorMsg);
      }
    } catch (error) {
      console.error('Error searching OFF:', error);
      setError('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  const searchUSDA = async () => {
    if (!searchQuery.trim()) {
      setUsdaResults([]);
      return;
    }

    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/external/usda?q=${encodeURIComponent(searchQuery)}`);
      if (res.ok) {
        const data = await res.json();
        setUsdaResults(data.products || []);
      } else {
        setError('Error al buscar en USDA');
      }
    } catch (error) {
      console.error('Error searching USDA:', error);
      setError('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    if (activeTab === 'off') {
      searchOpenFoodFacts();
    } else if (activeTab === 'usda') {
      searchUSDA();
    }
  };

  const handleSelectFavorite = (food: Food) => {
    onSelectFood(food);
    onClose();
  };

  const handleSelectExternal = async (product: ExternalProduct) => {
    try {
      // If USDA product doesn't have macros, fetch full details first
      let productWithMacros = product;
      if (product.source === 'usda' && !product.macros) {
        const fdcId = product.fdcId || product.externalId;
        if (fdcId) {
          const res = await fetch(`/api/external/usda?fdcId=${fdcId}`);
          if (res.ok) {
            const data = await res.json();
            if (data.products && data.products.length > 0) {
              productWithMacros = data.products[0];
            }
          }
        }
      }

      // Ensure we have macros before saving
      if (!productWithMacros.macros) {
        setError('No se pudieron obtener los datos nutricionales');
        return;
      }

      // Save to favorites first, then select
      const res = await fetch('/api/foods', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: productWithMacros.name,
          brand: productWithMacros.brand,
          serving: { type: 'per100g' },
          macros: productWithMacros.macros,
          source: productWithMacros.source,
          externalId: productWithMacros.externalId,
          barcode: productWithMacros.barcode,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        onSelectFood(data.food);
        onClose();
      } else {
        setError('Error al guardar alimento');
      }
    } catch (error) {
      console.error('Error saving food:', error);
      setError('Error de conexión');
    }
  };

  const filteredFavorites = favorites.filter((food) =>
    food.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (food.brand && food.brand.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-xl font-bold">Buscar alimento</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl"
          >
            ×
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b">
          <button
            onClick={() => {
              setActiveTab('favorites');
              setSearchQuery('');
              setError('');
            }}
            className={`flex-1 px-4 py-2 text-center font-medium ${
              activeTab === 'favorites'
                ? 'border-b-2 border-indigo-600 text-indigo-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Mis favoritos
          </button>
          <button
            onClick={() => {
              setActiveTab('off');
              setSearchQuery('');
              setError('');
            }}
            className={`flex-1 px-4 py-2 text-center font-medium ${
              activeTab === 'off'
                ? 'border-b-2 border-indigo-600 text-indigo-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Open Food Facts
          </button>
          <button
            onClick={() => {
              setActiveTab('usda');
              setSearchQuery('');
              setError('');
            }}
            className={`flex-1 px-4 py-2 text-center font-medium ${
              activeTab === 'usda'
                ? 'border-b-2 border-indigo-600 text-indigo-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            USDA
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b">
          <div className="flex gap-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && (activeTab === 'off' || activeTab === 'usda')) {
                  handleSearch();
                }
              }}
              placeholder={
                activeTab === 'favorites'
                  ? 'Buscar en favoritos...'
                  : activeTab === 'off'
                  ? 'Buscar en Open Food Facts...'
                  : 'Buscar en USDA...'
              }
              className="flex-1 border rounded px-3 py-2"
            />
            {(activeTab === 'off' || activeTab === 'usda') && (
              <button
                onClick={handleSearch}
                disabled={loading || !searchQuery.trim()}
                className="px-4 py-2 bg-indigo-600 text-white rounded disabled:opacity-50"
              >
                {loading ? 'Buscando...' : 'Buscar'}
              </button>
            )}
          </div>
          {error && (
            <div className="mt-2 text-sm text-red-600">{error}</div>
          )}
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto p-4">
          {activeTab === 'favorites' && (
            <div className="space-y-2">
              {filteredFavorites.length === 0 ? (
                <p className="text-center text-gray-500 py-8">
                  {searchQuery ? 'No se encontraron alimentos' : 'No tienes alimentos favoritos'}
                </p>
              ) : (
                filteredFavorites.map((food) => (
                  <button
                    key={food._id}
                    onClick={() => handleSelectFavorite(food)}
                    className="w-full text-left p-3 border rounded hover:bg-gray-50"
                  >
                    <div className="font-medium">{food.name}</div>
                    {food.brand && (
                      <div className="text-sm text-gray-600">{food.brand}</div>
                    )}
                    <div className="text-xs text-gray-500 mt-1">
                      {food.macros.kcal} kcal | P: {food.macros.protein}g | C: {food.macros.carbs}g | G: {food.macros.fat}g
                    </div>
                  </button>
                ))
              )}
            </div>
          )}

          {activeTab === 'off' && (
            <div className="space-y-2">
              {offResults.length === 0 && !loading && searchQuery && (
                <p className="text-center text-gray-500 py-8">
                  No se encontraron resultados
                </p>
              )}
              {offResults.map((product, index) => (
                <button
                  key={index}
                  onClick={() => handleSelectExternal(product)}
                  className="w-full text-left p-3 border rounded hover:bg-gray-50"
                >
                  <div className="font-medium">{product.name}</div>
                  {product.brand && (
                    <div className="text-sm text-gray-600">{product.brand}</div>
                  )}
                  {product.macros ? (
                    <div className="text-xs text-gray-500 mt-1">
                      {product.macros.kcal} kcal | P: {product.macros.protein}g | C: {product.macros.carbs}g | G: {product.macros.fat}g
                    </div>
                  ) : (
                    <div className="text-xs text-gray-500 mt-1">
                      Cargando datos nutricionales...
                    </div>
                  )}
                  <div className="text-xs text-indigo-600 mt-1">
                    Guardar en favoritos
                  </div>
                </button>
              ))}
            </div>
          )}

          {activeTab === 'usda' && (
            <div className="space-y-2">
              {usdaResults.length === 0 && !loading && searchQuery && (
                <p className="text-center text-gray-500 py-8">
                  No se encontraron resultados
                </p>
              )}
              {usdaResults.map((product, index) => (
                <button
                  key={index}
                  onClick={() => handleSelectExternal(product)}
                  className="w-full text-left p-3 border rounded hover:bg-gray-50"
                >
                  <div className="font-medium">{product.name}</div>
                  {product.brand && (
                    <div className="text-sm text-gray-600">{product.brand}</div>
                  )}
                  {product.macros ? (
                    <div className="text-xs text-gray-500 mt-1">
                      {product.macros.kcal} kcal | P: {product.macros.protein}g | C: {product.macros.carbs}g | G: {product.macros.fat}g
                    </div>
                  ) : (
                    <div className="text-xs text-gray-500 mt-1">
                      Cargando datos nutricionales...
                    </div>
                  )}
                  <div className="text-xs text-indigo-600 mt-1">
                    Guardar en favoritos
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
