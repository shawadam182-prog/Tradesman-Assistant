const FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/gemini`;

async function callGemini<T>(action: string, data: Record<string, any>): Promise<T> {
  // Always use anon key — edge function doesn't need user identity
  const token = import.meta.env.VITE_SUPABASE_ANON_KEY;

  const response = await fetch(FUNCTION_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ action, data }),
  });

  if (!response.ok) {
    let message = `Gemini API call failed (${response.status})`;
    try {
      const body = await response.json();
      message = body.error || body.msg || body.message || message;
    } catch {
      // Response wasn't JSON
    }
    throw new Error(message);
  }

  return response.json();
}

// Types
export interface AnalyzeJobResult {
  suggestedTitle: string;
  laborHoursEstimate: number;
  labourItems?: {
    description: string;
    hours: number;
  }[];
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

// AI Job Context for enhanced analysis
export interface AIJobContext {
  tradeType?: string;
  labourRate?: number;
  existingItems?: { name: string; quantity: number; unit: string }[];
  priceList?: { name: string; unit: string; unitPrice: number }[];
}

// API Functions
export const analyzeJobRequirements = async (
  prompt: string,
  imageBase64?: string,
  context?: AIJobContext
): Promise<AnalyzeJobResult> => {
  return callGemini<AnalyzeJobResult>('analyzeJob', { prompt, imageBase64, context });
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

export const reverseGeocode = async (lat: number, lng: number): Promise<string | null> => {
  try {
    const result = await callGemini<{ address: string | null; error?: string }>('reverseGeocode', { lat, lng });
    return result.address;
  } catch (error) {
    console.error('reverseGeocode failed:', error);
    return null;
  }
};

export const parseReceiptImage = async (
  imageBase64: string
): Promise<ParsedReceipt> => {
  return callGemini<ParsedReceipt>('parseReceipt', { imageBase64 });
};
