import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Food from '@/models/Food';
import { getAuthUser } from '@/lib/auth';
import { foodSchema } from '@/lib/validations';

export async function GET(request: NextRequest) {
  try {
    const authUser = getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const filter = searchParams.get('filter'); // 'all', 'mine', 'shared'

    await connectDB();

    let query: any = {};

    if (filter === 'mine') {
      // Solo alimentos del usuario (no compartidos)
      query = { 
        ownerUserId: authUser.userId,
        $or: [
          { isShared: { $ne: true } },
          { isShared: { $exists: false } }
        ]
      };
    } else if (filter === 'shared') {
      // Solo alimentos compartidos
      query = { isShared: true };
    } else {
      // Por defecto: alimentos del usuario + compartidos
      // Usar $or para incluir alimentos del usuario O alimentos compartidos
      query = {
        $or: [
          { ownerUserId: authUser.userId },
          { isShared: true }
        ]
      };
    }

    // Log para debugging
    console.log('GET /api/foods query:', JSON.stringify(query, null, 2));
    console.log('User ID:', authUser.userId);

    const foods = await Food.find(query)
      .sort({ name: 1 })
      .lean();

    console.log(`Found ${foods.length} foods`);
    console.log('Foods sample:', foods.slice(0, 3).map(f => ({
      _id: f._id,
      name: f.name,
      ownerUserId: f.ownerUserId,
      isShared: f.isShared,
      createdByUserId: f.createdByUserId
    })));

    return NextResponse.json({ foods });
  } catch (error: any) {
    console.error('Get foods error:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
    });
    return NextResponse.json(
      { error: 'Error al obtener alimentos', details: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const authUser = getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const body = await request.json();
    const validated = foodSchema.parse(body);

    await connectDB();

    // Si es alimento custom, marcarlo como compartido automáticamente
    const isShared = validated.source === 'custom' ? true : (validated.isShared || false);

    // Si es compartido, verificar si ya existe uno similar
    if (isShared) {
      const existingFood = await Food.findOne({
        isShared: true,
        name: { $regex: new RegExp(`^${validated.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
        source: 'custom',
      });

      if (existingFood) {
        // Verificar si los macros son similares (dentro de ±1% o diferencia absoluta < 1)
        const macrosMatch = 
          (Math.abs(existingFood.macros.kcal - validated.macros.kcal) / Math.max(validated.macros.kcal, 1) < 0.01 || Math.abs(existingFood.macros.kcal - validated.macros.kcal) < 1) &&
          (Math.abs(existingFood.macros.protein - validated.macros.protein) / Math.max(validated.macros.protein, 1) < 0.01 || Math.abs(existingFood.macros.protein - validated.macros.protein) < 0.1) &&
          (Math.abs(existingFood.macros.carbs - validated.macros.carbs) / Math.max(validated.macros.carbs, 1) < 0.01 || Math.abs(existingFood.macros.carbs - validated.macros.carbs) < 0.1) &&
          (Math.abs(existingFood.macros.fat - validated.macros.fat) / Math.max(validated.macros.fat, 1) < 0.01 || Math.abs(existingFood.macros.fat - validated.macros.fat) < 0.1);

        if (macrosMatch) {
          // Retornar el alimento existente
          return NextResponse.json({ food: existingFood }, { status: 200 });
        }
      }
    }

    // Construir el objeto de creación
    const foodData: any = {
      ...validated,
      isShared,
    };

    if (isShared) {
      foodData.createdByUserId = authUser.userId;
      foodData.ownerUserId = null; // Explícitamente null para alimentos compartidos
    } else {
      foodData.ownerUserId = authUser.userId;
    }

    console.log('POST /api/foods - Creating food with data:', JSON.stringify(foodData, null, 2));

    const food = await Food.create(foodData);

    console.log('POST /api/foods - Created food:', {
      _id: food._id,
      name: food.name,
      ownerUserId: food.ownerUserId,
      isShared: food.isShared,
      createdByUserId: food.createdByUserId
    });

    return NextResponse.json({ food }, { status: 201 });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Datos inválidos', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Create food error:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
    });
    return NextResponse.json(
      { error: 'Error al crear alimento', details: error.message },
      { status: 500 }
    );
  }
}
