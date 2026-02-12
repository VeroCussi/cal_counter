import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Food from '@/models/Food';
import { getAuthUser } from '@/lib/auth';
import { foodSchema, mongoIdSchema } from '@/lib/validations';

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
    const validated = foodSchema.parse(body);

    await connectDB();

    const food = await Food.findOneAndUpdate(
      { _id: id, ownerUserId: authUser.userId },
      validated,
      { new: true, runValidators: true }
    );

    if (!food) {
      return NextResponse.json(
        { error: 'Alimento no encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json({ food });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Datos inválidos', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Update food error:', error);
    return NextResponse.json(
      { error: 'Error al actualizar alimento' },
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

    const food = await Food.findOneAndDelete({
      _id: id,
      ownerUserId: authUser.userId,
    });

    if (!food) {
      return NextResponse.json(
        { error: 'Alimento no encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: 'Alimento eliminado' });
  } catch (error) {
    console.error('Delete food error:', error);
    return NextResponse.json(
      { error: 'Error al eliminar alimento' },
      { status: 500 }
    );
  }
}
