import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Water from '@/models/Water';
import { getAuthUser } from '@/lib/auth';
import { waterSchema, mongoIdSchema } from '@/lib/validations';

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
    const validated = waterSchema.parse(body);

    await connectDB();

    const water = await Water.findOneAndUpdate(
      { _id: id, ownerUserId: authUser.userId },
      { amountMl: validated.amountMl, date: validated.date },
      { new: true, runValidators: true }
    );

    if (!water) {
      return NextResponse.json(
        { error: 'Entrada de agua no encontrada' },
        { status: 404 }
      );
    }

    return NextResponse.json({ water });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Datos inválidos', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Update water error:', error);
    return NextResponse.json(
      { error: 'Error al actualizar agua' },
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

    const water = await Water.findOneAndDelete({
      _id: id,
      ownerUserId: authUser.userId,
    });

    if (!water) {
      return NextResponse.json(
        { error: 'Entrada de agua no encontrada' },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: 'Agua eliminada correctamente' });
  } catch (error) {
    console.error('Delete water error:', error);
    return NextResponse.json(
      { error: 'Error al eliminar agua' },
      { status: 500 }
    );
  }
}
