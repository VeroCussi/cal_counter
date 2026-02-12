/**
 * Centralized error handling utilities
 */

export interface ApiError {
  error: string;
  details?: any;
}

export async function handleApiResponse<T>(
  response: Response
): Promise<{ data?: T; error?: string }> {
  if (!response.ok) {
    try {
      const errorData: ApiError = await response.json();
      return { error: errorData.error || `Error ${response.status}` };
    } catch {
      return { error: `Error ${response.status}: ${response.statusText}` };
    }
  }

  try {
    const data = await response.json();
    return { data };
  } catch {
    return { error: 'Error al procesar respuesta del servidor' };
  }
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return 'Error desconocido';
}
