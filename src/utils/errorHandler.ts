export interface AppError {
  message: string;
  code?: string;
  details?: string;
}

export const handleApiError = (error: unknown): AppError => {
  // Supabase error
  if (error && typeof error === 'object' && 'code' in error) {
    const supabaseError = error as { code: string; message: string; details?: string };

    const messages: Record<string, string> = {
      'PGRST116': 'Record not found',
      '23505': 'This record already exists',
      '23503': 'Cannot delete - this record is referenced elsewhere',
      '42501': 'You don\'t have permission to do this',
      'PGRST301': 'Connection failed - check your internet',
    };

    return {
      message: messages[supabaseError.code] || supabaseError.message,
      code: supabaseError.code,
      details: supabaseError.details,
    };
  }

  // Network error
  if (error instanceof TypeError && error.message === 'Failed to fetch') {
    return {
      message: 'Unable to connect. Please check your internet connection.',
      code: 'NETWORK_ERROR',
    };
  }

  // Generic error
  if (error instanceof Error) {
    return {
      message: error.message,
    };
  }

  return {
    message: 'An unexpected error occurred',
  };
};
