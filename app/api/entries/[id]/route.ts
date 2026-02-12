import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Entry from '@/models/Entry';
import Food from '@/models/Food';
import { getAuthUser } from '@/lib/auth';
import { entrySchema, mongoIdSchema } from '@/lib/validations';
import { calculateMacros } from '@/lib/macros';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const { id } = await params;
    
    // Validate MongoDB ObjectId format
    try {
      mongoIdSchema.parse(id);
    } catch {
      return NextResponse.json(
        { error: 'ID inválido' },
        { status: 400 }
      );
    }
    const body = await request.json();
    const validated = entrySchema.parse(body);

    await connectDB();

    // Get food to recalculate macros if foodId or quantity changed
    const existingEntry = await Entry.findOne({
      _id: id,
      ownerUserId: authUser.userId,
    });

    if (!existingEntry) {
      return NextResponse.json(
        { error: 'Entrada no encontrada' },
        { status: 404 }
      );
    }

    // Validate foodId format
    try {
      mongoIdSchema.parse(validated.foodId);
    } catch {
      return NextResponse.json(
        { error: 'Food ID inválido' },
        { status: 400 }
      );
    }

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

    // Recalculate macros
    const computedMacros = calculateMacros(food.toObject() as any, validated.quantity.grams);

    const entry = await Entry.findOneAndUpdate(
      { _id: id, ownerUserId: authUser.userId },
      { ...validated, computedMacros },
      { new: true, runValidators: true }
    )
      .populate('foodId', 'name brand macros serving')
      .lean();

    return NextResponse.json({ entry });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Datos inválidos', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Update entry error:', error);
    return NextResponse.json(
      { error: 'Error al actualizar entrada' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authUser = getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const { id } = await params;
    
    // Validate MongoDB ObjectId format
    try {
      mongoIdSchema.parse(id);
    } catch {
      return NextResponse.json(
        { error: 'ID inválido' },
        { status: 400 }
      );
    }
    await connectDB();

    const entry = await Entry.findOneAndDelete({
      _id: id,
      ownerUserId: authUser.userId,
    });

    if (!entry) {
      return NextResponse.json(
        { error: 'Entrada no encontrada' },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: 'Entrada eliminada' });
  } catch (error) {
    console.error('Delete entry error:', error);
    return NextResponse.json(
      { error: 'Error al eliminar entrada' },
      { status: 500 }
    );
  }
}
