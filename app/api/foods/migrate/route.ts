import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Food from '@/models/Food';
import { getAuthUser } from '@/lib/auth';

/**
 * Endpoint para migrar alimentos existentes a compartidos
 * GET o POST /api/foods/migrate
 * 
 * Actualiza todos los alimentos custom que tienen ownerUserId: null
 * y los marca como isShared: true
 */
export async function GET(request: NextRequest) {
  return await migrateFoods(request);
}

export async function POST(request: NextRequest) {
  return await migrateFoods(request);
}

async function migrateFoods(request: NextRequest) {
  try {
    const authUser = getAuthUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    await connectDB();

    // Buscar alimentos que deberían ser compartidos pero no lo están
    const foodsToMigrate = await Food.find({
      source: 'custom',
      $and: [
        {
          $or: [
            { ownerUserId: null },
            { ownerUserId: { $exists: false } }
          ]
        },
        {
          $or: [
            { isShared: false },
            { isShared: { $exists: false } }
          ]
        }
      ]
    });

    console.log(`📊 Encontrados ${foodsToMigrate.length} alimentos para migrar`);

    if (foodsToMigrate.length === 0) {
      const totalShared = await Food.countDocuments({ isShared: true });
      const totalCustom = await Food.countDocuments({ source: 'custom' });
      
      return NextResponse.json({
        message: 'No hay alimentos para migrar',
        migrated: 0,
        totalShared,
        totalCustom,
        info: 'Todos los alimentos custom ya están marcados como compartidos o tienen un ownerUserId asignado'
      });
    }

    // Actualizar cada alimento
    const updateResult = await Food.updateMany(
      {
        source: 'custom',
        $and: [
          {
            $or: [
              { ownerUserId: null },
              { ownerUserId: { $exists: false } }
            ]
          },
          {
            $or: [
              { isShared: false },
              { isShared: { $exists: false } }
            ]
          }
        ]
      },
      {
        $set: {
          isShared: true,
          ownerUserId: null,
        }
      }
    );

    // Verificar resultados
    const sharedFoodsCount = await Food.countDocuments({ isShared: true });

    return NextResponse.json({
      message: '✅ Migración completada exitosamente',
      migrated: updateResult.modifiedCount,
      totalShared: sharedFoodsCount,
      details: foodsToMigrate.map(f => ({
        _id: f._id,
        name: f.name,
        wasShared: f.isShared,
        ownerUserId: f.ownerUserId
      }))
    }, { status: 200 });
  } catch (error: any) {
    console.error('Error en migración:', error);
    return NextResponse.json(
      { 
        error: 'Error al migrar alimentos', 
        details: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}
