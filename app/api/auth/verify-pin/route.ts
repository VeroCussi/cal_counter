import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import connectDB from '@/lib/db';
import User from '@/models/User';
import { getAuthUser } from '@/lib/auth';
import { pinSchema } from '@/lib/validations';

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

    const user = await User.findById(authUser.userId);
    if (!user) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      );
    }

    // Verify PIN
    const isValid = await bcrypt.compare(validated.pin, user.pinHash);
    if (!isValid) {
      return NextResponse.json(
        { error: 'PIN incorrecto' },
        { status: 401 }
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

    console.error('Verify PIN error:', error);
    return NextResponse.json(
      { error: 'Error al verificar PIN' },
      { status: 500 }
    );
  }
}
