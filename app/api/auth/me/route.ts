import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import User from '@/models/User';
import { getAuthUser } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const authUser = getAuthUser(request);
    if (!authUser) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      );
    }

    try {
      await connectDB();
    } catch (dbError: any) {
      // If MongoDB is not configured, return 401 (not authenticated)
      console.error('DB connection error:', dbError);
      if (dbError.message?.includes('MONGODB_URI') || dbError.message?.includes('Please define')) {
        return NextResponse.json(
          { error: 'Base de datos no configurada' },
          { status: 401 }
        );
      }
      throw dbError;
    }

    const user = await User.findById(authUser.userId).select('-passwordHash -pinHash');
    
    if (!user) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      );
    }

    // Check if user has PIN enabled
    const hasPin = !!user.pinHash;

    return NextResponse.json({
      user: {
        _id: user._id.toString(),
        email: user.email,
        name: user.name,
        settings: user.settings,
        hasPin, // Include PIN status
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    });
  } catch (error) {
    console.error('Me error:', error);
    return NextResponse.json(
      { error: 'Error al obtener usuario' },
      { status: 500 }
    );
  }
}
