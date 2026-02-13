import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Water from '@/models/Water';
import { getAuthUser } from '@/lib/auth';
import { waterSchema } from '@/lib/validations';

export async function GET(request: NextRequest) {
  try {
    const authUser = getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    await connectDB();

    const query: any = { ownerUserId: authUser.userId };
    
    if (date) {
      query.date = date;
    } else if (from && to) {
      query.date = { $gte: from, $lte: to };
    }

    const waterEntries = await Water.find(query)
      .sort({ date: -1 })
      .lean();

    // If querying a specific date, return the total amount for that date
    if (date) {
      const totalAmount = waterEntries.reduce((sum, entry) => sum + entry.amountMl, 0);
      return NextResponse.json({ 
        waterEntries,
        totalAmount,
        date 
      });
    }

    return NextResponse.json({ waterEntries });
  } catch (error) {
    console.error('Get water error:', error);
    return NextResponse.json(
      { error: 'Error al obtener agua' },
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
    const validated = waterSchema.parse(body);

    await connectDB();

    // Use upsert to update if exists for same date (add to existing amount)
    const existingWater = await Water.findOne({
      ownerUserId: authUser.userId,
      date: validated.date,
    });

    if (existingWater) {
      // Add to existing amount
      existingWater.amountMl += validated.amountMl;
      await existingWater.save();
      return NextResponse.json({ water: existingWater }, { status: 200 });
    } else {
      // Create new entry
      const water = await Water.create({
        ownerUserId: authUser.userId,
        date: validated.date,
        amountMl: validated.amountMl,
      });
      return NextResponse.json({ water }, { status: 201 });
    }
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Datos inválidos', details: error.errors },
        { status: 400 }
      );
    }


    console.error('Create water error:', error);
    return NextResponse.json(
      { error: 'Error al añadir agua' },
      { status: 500 }
    );
  }
}
