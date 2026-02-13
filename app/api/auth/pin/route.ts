import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import connectDB from '@/lib/db';
import User from '@/models/User';
import { getAuthUser } from '@/lib/auth';
import { pinSchema } from '@/lib/validations';

/**
 * POST /api/auth/pin - Set or update PIN
 */
export async function POST(request: NextRequest) {
  try {
    const authUser = getAuthUser(request);
    if (!authUser) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const validated = pinSchema.parse(body);

    await connectDB();

    const pinHash = await bcrypt.hash(validated.pin, 10);

    const user = await User.findByIdAndUpdate(
      authUser.userId,
      { pinHash },
      { new: true }
    );

    if (!user) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'PIN inválido', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Set PIN error:', error);
    return NextResponse.json(
      { error: 'Error al establecer PIN' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/auth/pin - Remove PIN (disable PIN protection)
 */
export async function DELETE(request: NextRequest) {
  try {
    const authUser = getAuthUser(request);
    if (!authUser) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      );
    }

    await connectDB();

    const user = await User.findByIdAndUpdate(
      authUser.userId,
      { $unset: { pinHash: '' } },
      { new: true }
    );

    if (!user) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Remove PIN error:', error);
    return NextResponse.json(
      { error: 'Error al eliminar PIN' },
      { status: 500 }
    );
  }
}
