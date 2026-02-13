import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';

/**
 * POST /api/sync/force - Force manual synchronization
 * 
 * This endpoint validates authentication and returns success.
 * The actual sync happens client-side using SyncService because
 * it requires IndexedDB access which is only available in the browser.
 * 
 * This endpoint is useful for:
 * - Validating user authentication before sync
 * - Providing a server-side endpoint for sync operations
 * - Future: Could trigger server-side sync operations if needed
 */
export async function POST(request: NextRequest) {
  try {
    const authUser = getAuthUser(request);
    if (!authUser) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      );
    }

    // Return success - actual sync happens client-side via SyncService
    // The client will call syncService.sync(userId) after this endpoint validates auth
    return NextResponse.json({
      success: true,
      message: 'Autenticación válida. La sincronización se ejecutará en el cliente.',
      userId: authUser.userId,
    });
  } catch (error: any) {
    console.error('Force sync error:', error);
    return NextResponse.json(
      { error: 'Error al iniciar sincronización' },
      { status: 500 }
    );
  }
}
