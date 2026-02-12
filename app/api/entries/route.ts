import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Entry from '@/models/Entry';
import Food from '@/models/Food';
import { getAuthUser } from '@/lib/auth';
import { entrySchema, mongoIdSchema } from '@/lib/validations';
import { calculateMacros } from '@/lib/macros';

export async function GET(request: NextRequest) {
  try {
    const authUser = getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');

    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json(
        { error: 'Fecha inválida (formato: YYYY-MM-DD)' },
        { status: 400 }
      );
    }

    await connectDB();
    const entries = await Entry.find({
      ownerUserId: authUser.userId,
      date,
    })
      .populate('foodId', 'name brand macros serving')
      .sort({ mealType: 1, createdAt: 1 })
      .lean();

    return NextResponse.json({ entries });
  } catch (error) {
    console.error('Get entries error:', error);
    return NextResponse.json(
      { error: 'Error al obtener entradas' },
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
    const validated = entrySchema.parse(body);

    // Validate foodId format
    try {
      mongoIdSchema.parse(validated.foodId);
    } catch {
      return NextResponse.json(
        { error: 'Food ID inválido' },
        { status: 400 }
      );
    }

    await connectDB();

    // Get food to calculate macros
    const food = await Food.findOne({
      _id: validated.foodId,
      ownerUserId: authUser.userId,
    });

    if (!food) {
      return NextResponse.json(
        { error: 'Alimento no encontrado' },
        { status: 404 }
      );
    }

    // Calculate macros
    const computedMacros = calculateMacros(food.toObject() as any, validated.quantity.grams);

    const entry = await Entry.create({
      ...validated,
      ownerUserId: authUser.userId,
      computedMacros,
    });

    const populatedEntry = await Entry.findById(entry._id)
      .populate('foodId', 'name brand macros serving')
      .lean();

    return NextResponse.json({ entry: populatedEntry }, { status: 201 });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Datos inválidos', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Create entry error:', error);
    return NextResponse.json(
      { error: 'Error al crear entrada' },
      { status: 500 }
    );
  }
}
