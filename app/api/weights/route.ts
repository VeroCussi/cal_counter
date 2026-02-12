import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Weight from '@/models/Weight';
import { getAuthUser } from '@/lib/auth';
import { weightSchema } from '@/lib/validations';

export async function GET(request: NextRequest) {
  try {
    const authUser = getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    await connectDB();

    const query: any = { ownerUserId: authUser.userId };
    if (from && to) {
      query.date = { $gte: from, $lte: to };
    }

    const weights = await Weight.find(query)
      .sort({ date: -1 })
      .lean();

    return NextResponse.json({ weights });
  } catch (error) {
    console.error('Get weights error:', error);
    return NextResponse.json(
      { error: 'Error al obtener pesos' },
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
    const validated = weightSchema.parse(body);

    await connectDB();

    // Use upsert to update if exists for same date
    const weight = await Weight.findOneAndUpdate(
      { ownerUserId: authUser.userId, date: validated.date },
      { weightKg: validated.weightKg },
      { new: true, upsert: true, runValidators: true }
    );

    return NextResponse.json({ weight }, { status: 201 });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Datos inválidos', details: error.errors },
        { status: 400 }
      );
    }

    if (error.code === 11000) {
      return NextResponse.json(
        { error: 'Ya existe un peso para esta fecha' },
        { status: 400 }
      );
    }

    console.error('Create weight error:', error);
    return NextResponse.json(
      { error: 'Error al crear peso' },
      { status: 500 }
    );
  }
}
