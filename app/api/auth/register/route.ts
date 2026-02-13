import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import connectDB from '@/lib/db';
import User from '@/models/User';
import { registerSchema } from '@/lib/validations';
import { generateToken, setAuthCookie } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = registerSchema.parse(body);

    try {
      await connectDB();
    } catch (dbError: any) {
      if (dbError.message?.includes('MONGODB_URI') || dbError.message?.includes('Please define')) {
        return NextResponse.json(
          { error: 'Base de datos no configurada. Por favor configura MONGODB_URI en .env.local' },
          { status: 500 }
        );
      }
      throw dbError;
    }

    // Check if user exists
    const existingUser = await User.findOne({ email: validated.email });
    if (existingUser) {
      return NextResponse.json(
        { error: 'El usuario ya existe' },
        { status: 400 }
      );
    }

    // Hash password
    const passwordHash = await bcrypt.hash(validated.password, 10);
    
    // Hash PIN only if provided
    let pinHash: string | undefined;
    if (validated.pin) {
      pinHash = await bcrypt.hash(validated.pin, 10);
    }

    // Create user
    const userData: any = {
      email: validated.email,
      name: validated.name,
      passwordHash,
    };
    if (pinHash) {
      userData.pinHash = pinHash;
    }

    const user = await User.create(userData);

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

    console.error('Register error:', error);
    return NextResponse.json(
      { error: 'Error al registrar usuario' },
      { status: 500 }
    );
  }
}
