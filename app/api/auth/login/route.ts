import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import connectDB from '@/lib/db';
import User from '@/models/User';
import { loginSchema } from '@/lib/validations';
import { generateToken, setAuthCookie } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = loginSchema.parse(body);

    try {
      await connectDB();
    } catch (dbError: any) {
      if (dbError.message?.includes('MONGODB_URI')) {
        return NextResponse.json(
          { error: 'Base de datos no configurada. Por favor configura MONGODB_URI en .env.local' },
          { status: 500 }
        );
      }
      throw dbError;
    }

    // Find user
    const user = await User.findOne({ email: validated.email });
    if (!user) {
      return NextResponse.json(
        { error: 'Email o contraseña incorrectos' },
        { status: 401 }
      );
    }

    // Verify password
    const isValid = await bcrypt.compare(validated.password, user.passwordHash);
    if (!isValid) {
      return NextResponse.json(
        { error: 'Email o contraseña incorrectos' },
        { status: 401 }
      );
    }

    // Generate token and set cookie
    const token = generateToken({
      userId: user._id.toString(),
      email: user.email,
    });
    
    const response = NextResponse.json({
      user: {
        _id: user._id.toString(),
        email: user.email,
        name: user.name,
        settings: user.settings,
      },
    });
    
    return setAuthCookie(response, token);
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Datos inválidos', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Error al iniciar sesión' },
      { status: 500 }
    );
  }
}
