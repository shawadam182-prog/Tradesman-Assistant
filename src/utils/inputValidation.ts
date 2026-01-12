/**
 * Input validation utilities for user-submitted data
 * Prevents XSS, injection attacks, and malformed data
 */

/**
 * Sanitize a string by removing potentially dangerous characters
 * Preserves common text characters while removing script tags and other dangerous content
 */
export function sanitizeString(input: string | null | undefined): string {
  if (!input) return '';
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .trim();
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  if (!email) return true; // Allow empty emails
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate UK phone number format (flexible)
 */
export function isValidUKPhone(phone: string): boolean {
  if (!phone) return true; // Allow empty phones
  // Remove all non-digit characters for validation
  const digits = phone.replace(/\D/g, '');
  // UK numbers are 10-11 digits (or with country code: 11-13)
  return digits.length >= 10 && digits.length <= 13;
}

/**
 * Validate that a number is positive and reasonable
 */
export function isValidPositiveNumber(value: number, max = 10_000_000): boolean {
  return !isNaN(value) && value >= 0 && value <= max;
}

/**
 * Validate percentage (0-100)
 */
export function isValidPercent(value: number): boolean {
  return !isNaN(value) && value >= 0 && value <= 100;
}

/**
 * Validate date string (ISO format)
 */
export function isValidDate(dateStr: string): boolean {
  if (!dateStr) return true; // Allow empty
  const date = new Date(dateStr);
  return !isNaN(date.getTime());
}

/**
 * Sanitize and validate customer data
 */
export interface CustomerValidation {
  valid: boolean;
  errors: Record<string, string>;
  sanitized: {
    name: string;
    email: string;
    phone: string;
    address: string;
    company?: string;
  };
}

export function validateCustomerData(data: {
  name?: string;
  email?: string;
  phone?: string;
  address?: string;
  company?: string;
}): CustomerValidation {
  const errors: Record<string, string> = {};

  const sanitized = {
    name: sanitizeString(data.name),
    email: sanitizeString(data.email),
    phone: sanitizeString(data.phone),
    address: sanitizeString(data.address),
    company: data.company ? sanitizeString(data.company) : undefined,
  };

  // Name is required
  if (!sanitized.name || sanitized.name.length < 2) {
    errors.name = 'Name is required (minimum 2 characters)';
  } else if (sanitized.name.length > 100) {
    errors.name = 'Name is too long (maximum 100 characters)';
  }

  // Email validation
  if (sanitized.email && !isValidEmail(sanitized.email)) {
    errors.email = 'Invalid email format';
  }

  // Phone validation
  if (sanitized.phone && !isValidUKPhone(sanitized.phone)) {
    errors.phone = 'Invalid phone number format';
  }

  // Address length check
  if (sanitized.address && sanitized.address.length > 500) {
    errors.address = 'Address is too long (maximum 500 characters)';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
    sanitized,
  };
}

/**
 * Validate expense data
 */
export interface ExpenseValidation {
  valid: boolean;
  errors: Record<string, string>;
}

export function validateExpenseData(data: {
  amount?: number;
  vendor?: string;
  description?: string;
  vatAmount?: number;
}): ExpenseValidation {
  const errors: Record<string, string> = {};

  // Amount is required and must be positive
  if (data.amount === undefined || !isValidPositiveNumber(data.amount)) {
    errors.amount = 'Amount must be a positive number';
  }

  // Vendor is required
  if (!data.vendor || sanitizeString(data.vendor).length < 1) {
    errors.vendor = 'Vendor name is required';
  }

  // VAT amount validation
  if (data.vatAmount !== undefined && !isValidPositiveNumber(data.vatAmount)) {
    errors.vatAmount = 'VAT amount must be a positive number';
  }

  // Description length
  if (data.description && sanitizeString(data.description).length > 500) {
    errors.description = 'Description is too long (maximum 500 characters)';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Validate quote/invoice line item
 */
export function validateLineItem(data: {
  name?: string;
  quantity?: number;
  unitPrice?: number;
}): { valid: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {};

  if (!data.name || sanitizeString(data.name).length < 1) {
    errors.name = 'Item name is required';
  }

  if (data.quantity !== undefined && !isValidPositiveNumber(data.quantity, 100_000)) {
    errors.quantity = 'Quantity must be a positive number';
  }

  if (data.unitPrice !== undefined && !isValidPositiveNumber(data.unitPrice)) {
    errors.unitPrice = 'Unit price must be a positive number';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Validate schedule entry
 */
export function validateScheduleEntry(data: {
  title?: string;
  start?: string;
  end?: string;
}): { valid: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {};

  if (!data.title || sanitizeString(data.title).length < 1) {
    errors.title = 'Title is required';
  }

  if (!data.start || !isValidDate(data.start)) {
    errors.start = 'Valid start date/time is required';
  }

  if (!data.end || !isValidDate(data.end)) {
    errors.end = 'Valid end date/time is required';
  }

  // End should be after start
  if (data.start && data.end) {
    const startDate = new Date(data.start);
    const endDate = new Date(data.end);
    if (endDate <= startDate) {
      errors.end = 'End time must be after start time';
    }
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}
