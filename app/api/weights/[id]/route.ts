import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Weight from '@/models/Weight';
import { getAuthUser } from '@/lib/auth';
import { weightSchema, mongoIdSchema } from '@/lib/validations';

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
    const validated = weightSchema.parse(body);

    await connectDB();

    const weight = await Weight.findOneAndUpdate(
      { _id: id, ownerUserId: authUser.userId },
      validated,
      { new: true, runValidators: true }
    );

    if (!weight) {
      return NextResponse.json(
        { error: 'Peso no encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json({ weight });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Datos inválidos', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Update weight error:', error);
    return NextResponse.json(
      { error: 'Error al actualizar peso' },
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

    const weight = await Weight.findOneAndDelete({
      _id: id,
      ownerUserId: authUser.userId,
    });

    if (!weight) {
      return NextResponse.json(
        { error: 'Peso no encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: 'Peso eliminado' });
  } catch (error) {
    console.error('Delete weight error:', error);
    return NextResponse.json(
      { error: 'Error al eliminar peso' },
      { status: 500 }
    );
  }
}
