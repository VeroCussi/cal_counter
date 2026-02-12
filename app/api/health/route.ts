import { NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import { NODE_ENV } from '@/lib/env';

/**
 * Health check endpoint for monitoring and deployment verification
 * GET /api/health
 */
export async function GET() {
  try {
    // Check database connection
    await connectDB();

    return NextResponse.json(
      {
        status: 'ok',
        timestamp: new Date().toISOString(),
        environment: NODE_ENV,
        database: 'connected',
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        status: 'error',
        timestamp: new Date().toISOString(),
        environment: NODE_ENV,
        database: 'disconnected',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 503 } // Service Unavailable
    );
  }
}
