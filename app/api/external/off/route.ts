import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { OFF_CONTACT_EMAIL } from '@/lib/env';

// App identification for Open Food Facts API
const APP_NAME = 'cal-counter';
const APP_VERSION = '0.1.0';
const USER_AGENT = `${APP_NAME}/${APP_VERSION} (${OFF_CONTACT_EMAIL || 'contact@example.com'})`;

// Rate limiting configuration (per user/IP)
// Limits according to OFF API documentation:
// - 100 req/min for product queries (GET /api/v*/product)
// - 10 req/min for search queries (GET /api/v*/search)
const RATE_LIMITS = {
  product: { max: 100, window: 60 * 1000 }, // 100 requests per minute
  search: { max: 10, window: 60 * 1000 },   // 10 requests per minute
};

/**
 * Rate limiting implementation
 * 
 * NOTE: This uses in-memory storage which works for single-instance deployments.
 * For production with multiple instances (horizontal scaling), use Redis:
 * 
 * Example with Upstash Redis:
 * ```typescript
 * import { Redis } from '@upstash/redis';
 * const redis = new Redis({ url: process.env.UPSTASH_REDIS_URL, token: process.env.UPSTASH_REDIS_TOKEN });
 * 
 * async function checkRateLimit(key: string, limit: typeof RATE_LIMITS.product): Promise<boolean> {
 *   const now = Date.now();
 *   const windowStart = now - limit.window;
 *   
 *   // Use Redis sorted set for sliding window
 *   const count = await redis.zcount(key, windowStart, now);
 *   if (count >= limit.max) return false;
 *   
 *   await redis.zadd(key, now, `${now}-${Math.random()}`);
 *   await redis.expire(key, Math.ceil(limit.window / 1000));
 *   return true;
 * }
 * ```
 */
interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

function checkRateLimit(key: string, limit: typeof RATE_LIMITS.product): boolean {
  const now = Date.now();
  const entry = rateLimitStore.get(key);

  if (!entry || now > entry.resetAt) {
    rateLimitStore.set(key, { count: 1, resetAt: now + limit.window });
    return true;
  }

  if (entry.count >= limit.max) {
    return false;
  }

  entry.count++;
  return true;
}

// Cleanup old entries periodically (every 5 minutes)
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of rateLimitStore.entries()) {
      if (now > entry.resetAt) {
        rateLimitStore.delete(key);
      }
    }
  }, 5 * 60 * 1000);
}

function getRateLimitKey(userId: string, type: 'product' | 'search'): string {
  return `${userId}:${type}`;
}

interface OFFProduct {
  product_name?: string;
  brands?: string;
  nutriments?: {
    energy_kcal_100g?: number;
    'energy-kcal_100g'?: number; // Alternative format
    energy_100g?: number; // Energy in kJ
    proteins_100g?: number;
    carbohydrates_100g?: number;
    fat_100g?: number;
    [key: string]: any; // Allow other dynamic fields
  };
  code?: string; // barcode
}

export async function GET(request: NextRequest) {
  try {
    const authUser = getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q');
    const barcode = searchParams.get('barcode');

    if (!q && !barcode) {
      return NextResponse.json(
        { error: 'Se requiere parámetro "q" o "barcode"' },
        { status: 400 }
      );
    }

    // Rate limiting check
    const isProductQuery = !!barcode;
    const rateLimitKey = getRateLimitKey(
      authUser.userId.toString(),
      isProductQuery ? 'product' : 'search'
    );
    const rateLimit = isProductQuery ? RATE_LIMITS.product : RATE_LIMITS.search;

    if (!checkRateLimit(rateLimitKey, rateLimit)) {
      return NextResponse.json(
        {
          error: 'Límite de solicitudes excedido. Por favor, espera un momento antes de intentar de nuevo.',
          retryAfter: Math.ceil(
            (rateLimitStore.get(rateLimitKey)!.resetAt - Date.now()) / 1000
          ),
        },
        { status: 429 }
      );
    }

    // Build API URL
    // Note: For searches, we use /cgi/search.pl (recommended for full-text search)
    // For individual products, we use API v2
    let url: string;
    if (barcode) {
      // Product by barcode - API v2 (current version)
      url = `https://world.openfoodfacts.org/api/v2/product/${barcode}.json`;
    } else {
      // Search API - using /cgi/search.pl (recommended for full-text search)
      // This endpoint is still the recommended way for text searches
      url = `https://world.openfoodfacts.org/cgi/search.pl?action=process&search_terms=${encodeURIComponent(q!)}&json=true&page_size=20`;
    }

    // Make request with proper User-Agent header
    const response = await fetch(url, {
      headers: {
        'User-Agent': USER_AGENT,
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      // Handle specific error cases
      if (response.status === 404) {
        return NextResponse.json(
          { error: 'Producto no encontrado', products: [] },
          { status: 404 }
        );
      }
      if (response.status === 429) {
        return NextResponse.json(
          {
            error: 'Open Food Facts está limitando las solicitudes. Por favor, intenta más tarde.',
          },
          { status: 429 }
        );
      }
      return NextResponse.json(
        {
          error: `Error al buscar en Open Food Facts: ${response.statusText}`,
        },
        { status: response.status }
      );
    }

    const data = await response.json();

    if (barcode) {
      // Single product response (v2 format)
      if (data.status === 0 || !data.product) {
        return NextResponse.json({ products: [] });
      }

      const product = data.product;
      const normalized = normalizeOFFProduct(product);
      return NextResponse.json({ products: normalized ? [normalized] : [] });
    } else {
      // Search response (from /cgi/search.pl)
      const rawProducts = data.products || [];

      const products = rawProducts
        .map((p: OFFProduct) => normalizeOFFProduct(p))
        .filter((p: any) => p !== null);

      return NextResponse.json({
        products,
        count: products.length,
        page: data.page || 1,
        page_size: data.page_size || 20,
        total_results: data.count || products.length,
      });
    }
  } catch (error) {
    console.error('OFF API error:', error);
    
    // Provide more specific error messages
    if (error instanceof TypeError && error.message.includes('fetch')) {
      return NextResponse.json(
        { error: 'Error de conexión con Open Food Facts. Verifica tu conexión a internet.' },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { error: 'Error al conectar con Open Food Facts' },
      { status: 500 }
    );
  }
}

function normalizeOFFProduct(product: OFFProduct): any | null {
  // Require at least a product name
  if (!product.product_name) {
    return null;
  }

  const nutriments = product.nutriments || {};

  // Try to get energy in different formats (kcal_100g, energy-kcal_100g, energy-kcal, etc.)
  // Use type assertion to access dynamic properties
  const nutrimentsAny = nutriments as Record<string, any>;
  let kcal = nutriments.energy_kcal_100g;
  
  // Fallback: try alternative energy field names
  if (kcal === undefined) {
    kcal = nutrimentsAny['energy-kcal_100g'];
  }
  if (kcal === undefined && nutrimentsAny.energy_100g) {
    // Convert kJ to kcal if needed (1 kcal = 4.184 kJ)
    kcal = nutrimentsAny.energy_100g / 4.184;
  }

  // If still no kcal, try to use 0 as default but still include the product
  // This allows products with incomplete nutritional data to still be shown
  if (kcal === undefined) {
    kcal = 0;
  }

  return {
    name: product.product_name,
    brand: product.brands?.split(',')[0]?.trim(),
    barcode: product.code,
    macros: {
      kcal: kcal || 0,
      protein: nutriments.proteins_100g || 0,
      carbs: nutriments.carbohydrates_100g || 0,
      fat: nutriments.fat_100g || 0,
    },
    source: 'openfoodfacts',
    externalId: product.code,
  };
}
