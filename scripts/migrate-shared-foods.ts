/**
 * Script de migración para marcar alimentos custom como compartidos
 * 
 * Este script actualiza todos los alimentos que:
 * - Tienen source: 'custom'
 * - Tienen ownerUserId: null o no tienen ownerUserId
 * - Tienen isShared: false o no tienen isShared
 * 
 * Y los marca como isShared: true
 */

import mongoose from 'mongoose';
import Food from '../models/Food';
import connectDB from '../lib/db';

async function migrateSharedFoods() {
  try {
    // Conectar a la base de datos usando la función existente
    await connectDB();
    console.log('✅ Conectado a MongoDB');

    // Buscar alimentos que deberían ser compartidos pero no lo están
    // Alimentos custom con ownerUserId null/undefined y isShared false/undefined
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
      console.log('✅ No hay alimentos para migrar');
      await mongoose.disconnect();
      return;
    }

    // Actualizar cada alimento
    let updated = 0;
    for (const food of foodsToMigrate) {
      await Food.updateOne(
        { _id: food._id },
        {
          $set: {
            isShared: true,
            ownerUserId: null, // Asegurar que sea null
          }
        }
      );
      updated++;
      console.log(`✅ Actualizado: ${food.name} (${food._id})`);
    }

    console.log(`\n🎉 Migración completada: ${updated} alimentos actualizados`);

    // Verificar resultados
    const sharedFoodsCount = await Food.countDocuments({ isShared: true });
    console.log(`📈 Total de alimentos compartidos: ${sharedFoodsCount}`);

    // Cerrar conexión
    if (mongoose.connection.readyState === 1) {
      await mongoose.disconnect();
      console.log('✅ Desconectado de MongoDB');
    }
  } catch (error) {
    console.error('❌ Error en la migración:', error);
    process.exit(1);
  }
}

// Ejecutar migración
migrateSharedFoods();
