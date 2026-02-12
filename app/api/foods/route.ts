import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Food from '@/models/Food';
import { getAuthUser } from '@/lib/auth';
import { foodSchema } from '@/lib/validations';

export async function GET(request: NextRequest) {
  try {
    const authUser = getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    await connectDB();
    const foods = await Food.find({ ownerUserId: authUser.userId })
      .sort({ name: 1 })
      .lean();

    return NextResponse.json({ foods });
  } catch (error) {
    console.error('Get foods error:', error);
    return NextResponse.json(
      { error: 'Error al obtener alimentos' },
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
    const validated = foodSchema.parse(body);

    await connectDB();

    const food = await Food.create({
      ...validated,
      ownerUserId: authUser.userId,
    });

    return NextResponse.json({ food }, { status: 201 });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Datos inválidos', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Create food error:', error);
    return NextResponse.json(
      { error: 'Error al crear alimento' },
      { status: 500 }
    );
  }
}
