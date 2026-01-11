import { supabase } from '../lib/supabase';

const FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/gemini`;

async function callGemini<T>(action: string, data: Record<string, any>): Promise<T> {
  const { data: { session } } = await supabase.auth.getSession();

  const response = await fetch(FUNCTION_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session?.access_token || import.meta.env.VITE_SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({ action, data }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Gemini API call failed');
  }

  return response.json();
}

// Types
export interface AnalyzeJobResult {
  suggestedTitle: string;
  laborHoursEstimate: number;
  materials: {
    name: string;
    description?: string;
    quantity: number;
    unit: string;
    estimatedUnitPrice: number;
  }[];
  notes?: string;
}

export interface ParsedMaterialItem {
  name: string;
  quantity: number;
  unit: string;
  unitPrice: number;
}

export interface ParsedCustomer {
  name: string;
  company: string;
  email: string;
  phone: string;
  address: string;
}

export interface ParsedScheduleEvent {
  title: string;
  start: string;
  end: string;
  location?: string;
  description?: string;
}

export interface ParsedReminder {
  text: string;
  time: string;
}

export interface ParsedReceipt {
  vendor: string;
  amount: number;
  vatAmount?: number;
  date: string;
  category: string;
  description?: string;
  paymentMethod?: string;
}

// API Functions
export const analyzeJobRequirements = async (
  prompt: string,
  imageBase64?: string
): Promise<AnalyzeJobResult> => {
  return callGemini<AnalyzeJobResult>('analyzeJob', { prompt, imageBase64 });
};

export const parseVoiceCommandForItems = async (
  command: string
): Promise<ParsedMaterialItem[]> => {
  try {
    return await callGemini<ParsedMaterialItem[]>('parseVoiceItems', { command });
  } catch (error) {
    console.error('parseVoiceCommandForItems failed:', error);
    return [];
  }
};

export const parseCustomerVoiceInput = async (
  input: string
): Promise<ParsedCustomer> => {
  return callGemini<ParsedCustomer>('parseCustomer', { input });
};

export const parseScheduleVoiceInput = async (
  input: string
): Promise<ParsedScheduleEvent> => {
  return callGemini<ParsedScheduleEvent>('parseSchedule', { input });
};

export const parseReminderVoiceInput = async (
  input: string
): Promise<ParsedReminder> => {
  return callGemini<ParsedReminder>('parseReminder', { input });
};

export const formatAddressAI = async (partialAddress: string): Promise<string> => {
  try {
    const result = await callGemini<{ formattedAddress: string }>('formatAddress', { address: partialAddress });
    return result.formattedAddress;
  } catch (error) {
    console.error('formatAddressAI failed:', error);
    return partialAddress;
  }
};

// Note: reverseGeocode requires Google Maps grounding which isn't available in Edge Functions
// Consider using a dedicated geocoding service or the browser's Geolocation API
export const reverseGeocode = async (_lat: number, _lng: number): Promise<string | null> => {
  console.warn('reverseGeocode is not implemented in Edge Functions - use browser geolocation or a geocoding API');
  return null;
};

export const parseReceiptImage = async (
  imageBase64: string
): Promise<ParsedReceipt> => {
  return callGemini<ParsedReceipt>('parseReceipt', { imageBase64 });
};
