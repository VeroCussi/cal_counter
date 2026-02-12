import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { USDA_API_KEY } from '@/lib/env';

const USDA_BASE_URL = 'https://api.nal.usda.gov/fdc/v1';

interface USDASearchResult {
  fdcId: number;
  description: string;
  brandOwner?: string;
}

interface USDAFood {
  fdcId: number;
  description: string;
  brandOwner?: string;
  foodNutrients?: Array<{
    nutrientId: number;
    nutrientName: string;
    value: number;
    unitName: string;
  }>;
}

export async function GET(request: NextRequest) {
  try {
    const authUser = getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q');
    const fdcId = searchParams.get('fdcId');

    if (!q && !fdcId) {
      return NextResponse.json(
        { error: 'Se requiere parámetro "q" o "fdcId"' },
        { status: 400 }
      );
    }

    if (fdcId) {
      // Get specific food
      const url = `${USDA_BASE_URL}/food/${fdcId}?api_key=${USDA_API_KEY || ''}`;
      const response = await fetch(url);

      if (!response.ok) {
        return NextResponse.json(
          { error: 'Error al obtener alimento de USDA' },
          { status: response.status }
        );
      }

      const food: USDAFood = await response.json();
      const normalized = normalizeUSDAFood(food);
      return NextResponse.json({ products: normalized ? [normalized] : [] });
    } else {
      // Search
      const url = `${USDA_BASE_URL}/foods/search?api_key=${USDA_API_KEY || ''}&query=${encodeURIComponent(q!)}&pageSize=20`;
      const response = await fetch(url);

      if (!response.ok) {
        return NextResponse.json(
          { error: 'Error al buscar en USDA' },
          { status: response.status }
        );
      }

      const data = await response.json();
      const foods: USDAFood[] = data.foods || [];

      // For search results, we need to fetch details for each
      // Simplified: return search results with basic info
      // Full details will be fetched when user selects a product
      const products = foods
        .map((food) => ({
          fdcId: food.fdcId,
          name: food.description,
          brand: food.brandOwner,
          source: 'usda' as const,
          externalId: food.fdcId.toString(),
        }))
        .filter((p) => p.name);

      return NextResponse.json({ products });
    }
  } catch (error) {
    console.error('USDA API error:', error);
    return NextResponse.json(
      { error: 'Error al conectar con USDA FoodData Central' },
      { status: 500 }
    );
  }
}

function normalizeUSDAFood(food: USDAFood): any | null {
  if (!food.foodNutrients || food.foodNutrients.length === 0) {
    return null;
  }

  // USDA nutrient IDs (per 100g):
  // 1008 = Energy (kcal)
  // 1003 = Protein
  // 1005 = Carbohydrate, by difference
  // 1004 = Total lipid (fat)

  const nutrients = food.foodNutrients.reduce((acc, n) => {
    if (n.nutrientId === 1008) acc.kcal = n.value;
    if (n.nutrientId === 1003) acc.protein = n.value;
    if (n.nutrientId === 1005) acc.carbs = n.value;
    if (n.nutrientId === 1004) acc.fat = n.value;
    return acc;
  }, { kcal: 0, protein: 0, carbs: 0, fat: 0 } as any);

  return {
    name: food.description,
    brand: food.brandOwner,
    macros: {
      kcal: nutrients.kcal || 0,
      protein: nutrients.protein || 0,
      carbs: nutrients.carbs || 0,
      fat: nutrients.fat || 0,
    },
    source: 'usda',
    externalId: food.fdcId.toString(),
  };
}
