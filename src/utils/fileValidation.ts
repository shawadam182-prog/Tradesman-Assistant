/**
 * File validation utilities with MIME type checking
 * Prevents upload of potentially dangerous files by validating both extension and MIME type
 */

// Allowed MIME types by category
const ALLOWED_MIME_TYPES = {
  image: [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml',
  ],
  document: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'text/csv',
  ],
  csv: ['text/csv', 'text/plain', 'application/csv'],
  pdf: ['application/pdf'],
} as const;

// Map extensions to expected MIME types
const EXTENSION_MIME_MAP: Record<string, string[]> = {
  jpg: ['image/jpeg'],
  jpeg: ['image/jpeg'],
  png: ['image/png'],
  gif: ['image/gif'],
  webp: ['image/webp'],
  svg: ['image/svg+xml'],
  pdf: ['application/pdf'],
  doc: ['application/msword'],
  docx: ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  xls: ['application/vnd.ms-excel'],
  xlsx: ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
  txt: ['text/plain'],
  csv: ['text/csv', 'text/plain', 'application/csv'],
};

// Maximum file sizes (in bytes)
const MAX_FILE_SIZES = {
  image: 10 * 1024 * 1024, // 10MB
  document: 25 * 1024 * 1024, // 25MB
  csv: 50 * 1024 * 1024, // 50MB for bank imports
  pdf: 10 * 1024 * 1024, // 10MB for PDF price lists
};

export type FileCategory = keyof typeof ALLOWED_MIME_TYPES;

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Get file extension from filename
 */
function getFileExtension(filename: string): string {
  const parts = filename.split('.');
  return parts.length > 1 ? parts.pop()!.toLowerCase() : '';
}

/**
 * Check if MIME type matches expected for extension
 */
function mimeMatchesExtension(mimeType: string, extension: string): boolean {
  const expectedMimes = EXTENSION_MIME_MAP[extension];
  if (!expectedMimes) return false;
  return expectedMimes.includes(mimeType);
}

/**
 * Validate a file for upload
 * Checks both extension and MIME type to prevent spoofing
 */
export function validateFile(
  file: File,
  category: FileCategory,
  options?: { maxSize?: number }
): ValidationResult {
  const extension = getFileExtension(file.name);
  const mimeType = file.type;
  const allowedMimes = ALLOWED_MIME_TYPES[category];
  const maxSize = options?.maxSize ?? MAX_FILE_SIZES[category];

  // Check file size
  if (file.size > maxSize) {
    const sizeMB = Math.round(maxSize / (1024 * 1024));
    return {
      valid: false,
      error: `File too large. Maximum size is ${sizeMB}MB`,
    };
  }

  // Check if extension is recognized
  if (!extension || !EXTENSION_MIME_MAP[extension]) {
    return {
      valid: false,
      error: `File type ".${extension}" is not allowed`,
    };
  }

  // Check if MIME type is in allowed list for this category
  if (!allowedMimes.includes(mimeType as never)) {
    return {
      valid: false,
      error: `File type "${mimeType}" is not allowed for ${category} uploads`,
    };
  }

  // Check if MIME type matches extension (prevent spoofing)
  if (!mimeMatchesExtension(mimeType, extension)) {
    return {
      valid: false,
      error: `File extension ".${extension}" doesn't match file content`,
    };
  }

  return { valid: true };
}

/**
 * Validate an image file
 */
export function validateImageFile(file: File): ValidationResult {
  return validateFile(file, 'image');
}

/**
 * Validate a document file (PDF, DOC, XLS, etc.)
 */
export function validateDocumentFile(file: File): ValidationResult {
  // For documents, allow both image and document types
  const imageResult = validateFile(file, 'image');
  if (imageResult.valid) return imageResult;

  return validateFile(file, 'document');
}

/**
 * Validate a CSV file
 */
export function validateCsvFile(file: File): ValidationResult {
  return validateFile(file, 'csv');
}

/**
 * Validate a PDF file
 */
export function validatePdfFile(file: File): ValidationResult {
  return validateFile(file, 'pdf');
}

/**
 * Get human-readable file size
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
