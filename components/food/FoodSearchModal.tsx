'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'favorites' | 'off' | 'usda'>('favorites');
  const [searchQuery, setSearchQuery] = useState('');
  const [barcodeQuery, setBarcodeQuery] = useState('');
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
      // Get user ID
      const authRes = await fetch('/api/auth/me');
      if (!authRes.ok) return;
      const authData = await authRes.json();
      if (!authData?.user?._id) return;

      // Use offline-first service
      const { OfflineService } = await import('@/lib/offline-service');
      const foods = await OfflineService.loadFoods(authData.user._id, 'all');
      setFavorites(foods);
    } catch (error) {
      console.error('Error loading favorites:', error);
    }
  };

  const searchByBarcode = async () => {
    if (!barcodeQuery.trim()) {
      setError('Por favor ingresa un código de barras');
      return;
    }

    // Validate barcode format (EAN-13, EAN-8, UPC-A, etc.)
    const barcode = barcodeQuery.trim().replace(/\D/g, ''); // Remove non-digits
    if (barcode.length < 8 || barcode.length > 13) {
      setError('El código de barras debe tener entre 8 y 13 dígitos');
      return;
    }

    setLoading(true);
    setError('');
    setOffResults([]);
    try {
      const res = await fetch(`/api/external/off?barcode=${encodeURIComponent(barcode)}`);
      const data = await res.json();
      
      if (res.ok) {
        if (data.products && data.products.length > 0) {
          setOffResults(data.products);
          setActiveTab('off'); // Switch to OFF tab to show results
        } else {
          setError('No se encontró producto con ese código de barras');
        }
      } else {
        setError(data.error || 'Error al buscar por código de barras');
      }
    } catch (error) {
      console.error('Error searching by barcode:', error);
      setError('Error de conexión');
    } finally {
      setLoading(false);
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

      // Get user ID from localStorage or context (we'll need to pass it as prop)
      // For now, try to get from auth context
      const authRes = await fetch('/api/auth/me');
      if (!authRes.ok) {
        setError('No autenticado');
        return;
      }
      const authData = await authRes.json();
      const userId = authData.user?._id;
      
      if (!userId) {
        setError('No se pudo obtener el ID de usuario');
        return;
      }

      // Use offline-first service
      const { OfflineService } = await import('@/lib/offline-service');
      const result = await OfflineService.createFood(userId, {
        name: productWithMacros.name,
        brand: productWithMacros.brand,
        serving: { type: 'per100g' },
        macros: productWithMacros.macros,
        source: productWithMacros.source,
        externalId: productWithMacros.externalId,
        barcode: productWithMacros.barcode,
      });

      // Try to sync if online
      if (navigator.onLine && !result.synced) {
        const { syncService } = await import('@/lib/sync/sync-service');
        syncService.sync(userId).catch((err) => {
          console.error('Sync error:', err);
        });
      }

      if (result.food) {
        onSelectFood(result.food);
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
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Buscar alimento</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                onClose();
                router.push('/foods/new');
              }}
              className="px-3 py-1.5 text-sm bg-indigo-600 text-white rounded hover:bg-indigo-700 transition-colors"
            >
              Crear manualmente
            </button>
            <button
              onClick={onClose}
              className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 text-2xl"
            >
              ×
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={() => {
              setActiveTab('favorites');
              setSearchQuery('');
              setError('');
            }}
            className={`flex-1 px-4 py-2 text-center font-medium ${
              activeTab === 'favorites'
                ? 'border-b-2 border-indigo-600 dark:border-indigo-500 text-indigo-600 dark:text-indigo-400'
                : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100'
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
                ? 'border-b-2 border-indigo-600 dark:border-indigo-500 text-indigo-600 dark:text-indigo-400'
                : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100'
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
                ? 'border-b-2 border-indigo-600 dark:border-indigo-500 text-indigo-600 dark:text-indigo-400'
                : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100'
            }`}
          >
            USDA
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 space-y-3">
          {/* Barcode search - shown for OFF tab */}
          {activeTab === 'off' && (
            <div className="flex gap-2">
              <input
                type="text"
                inputMode="numeric"
                value={barcodeQuery}
                onChange={(e) => setBarcodeQuery(e.target.value.replace(/\D/g, ''))}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    searchByBarcode();
                  }
                }}
                placeholder="Código de barras (EAN/UPC)..."
                className="flex-1 border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
              />
              <button
                onClick={searchByBarcode}
                disabled={loading || !barcodeQuery.trim()}
                className="px-4 py-2 bg-green-600 text-white rounded disabled:opacity-50 hover:bg-green-700"
              >
                {loading ? 'Buscando...' : '🔍'}
              </button>
            </div>
          )}
          
          {/* Text search */}
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
                  ? 'Buscar por nombre en Open Food Facts...'
                  : 'Buscar en USDA...'
              }
              className="flex-1 border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
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
            <div className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</div>
          )}
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto p-4">
          {activeTab === 'favorites' && (
            <div className="space-y-2">
              {filteredFavorites.length === 0 ? (
                <p className="text-center text-gray-500 dark:text-gray-400 py-8">
                  {searchQuery ? 'No se encontraron alimentos' : 'No tienes alimentos favoritos'}
                </p>
              ) : (
                filteredFavorites.map((food) => (
                  <button
                    key={food._id}
                    onClick={() => handleSelectFavorite(food)}
                    className="w-full text-left p-3 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-100"
                  >
                    <div className="flex items-center justify-between">
                      <div className="font-medium">{food.name}</div>
                      {food.isShared && (
                        <span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded">
                          Compartido
                        </span>
                      )}
                    </div>
                    {food.brand && (
                      <div className="text-sm text-gray-600 dark:text-gray-300">{food.brand}</div>
                    )}
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
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
                <p className="text-center text-gray-500 dark:text-gray-400 py-8">
                  No se encontraron resultados
                </p>
              )}
              {offResults.map((product, index) => (
                <button
                  key={index}
                  onClick={() => handleSelectExternal(product)}
                  className="w-full text-left p-3 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-100"
                >
                  <div className="font-medium">{product.name}</div>
                  {product.brand && (
                    <div className="text-sm text-gray-600 dark:text-gray-300">{product.brand}</div>
                  )}
                  {product.macros ? (
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {product.macros.kcal} kcal | P: {product.macros.protein}g | C: {product.macros.carbs}g | G: {product.macros.fat}g
                    </div>
                  ) : (
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Cargando datos nutricionales...
                    </div>
                  )}
                  <div className="text-xs text-indigo-600 dark:text-indigo-400 mt-1">
                    Guardar en favoritos
                  </div>
                </button>
              ))}
            </div>
          )}

          {activeTab === 'usda' && (
            <div className="space-y-2">
              {usdaResults.length === 0 && !loading && searchQuery && (
                <p className="text-center text-gray-500 dark:text-gray-400 py-8">
                  No se encontraron resultados
                </p>
              )}
              {usdaResults.map((product, index) => (
                <button
                  key={index}
                  onClick={() => handleSelectExternal(product)}
                  className="w-full text-left p-3 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-100"
                >
                  <div className="font-medium">{product.name}</div>
                  {product.brand && (
                    <div className="text-sm text-gray-600 dark:text-gray-300">{product.brand}</div>
                  )}
                  {product.macros ? (
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {product.macros.kcal} kcal | P: {product.macros.protein}g | C: {product.macros.carbs}g | G: {product.macros.fat}g
                    </div>
                  ) : (
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Cargando datos nutricionales...
                    </div>
                  )}
                  <div className="text-xs text-indigo-600 dark:text-indigo-400 mt-1">
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
