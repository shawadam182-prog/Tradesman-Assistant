import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { GoogleGenerativeAI, SchemaType } from "npm:@google/generative-ai@0.21.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Initialize Gemini
const genAI = new GoogleGenerativeAI(Deno.env.get('GEMINI_API_KEY') || '');

// Action handlers
const actions: Record<string, (data: any) => Promise<any>> = {
  // Analyze job requirements from text/image
  async analyzeJob({ prompt, imageBase64, context }: {
    prompt: string;
    imageBase64?: string;
    context?: {
      tradeType?: string;
      labourRate?: number;
      existingItems?: { name: string; quantity: number; unit: string }[];
      priceList?: { name: string; unit: string; unitPrice: number }[];
    }
  }) {
    // Build trade-specific context
    const tradeType = context?.tradeType?.replace('other:', '') || 'general tradesman';
    const labourRate = context?.labourRate || 45;

    // Build price list hint for prompt (limit to 100 items)
    const priceListHint = context?.priceList?.slice(0, 100).map(p =>
      `${p.name} (${p.unit}): £${p.unitPrice.toFixed(2)}`
    ).join('\n') || '';

    const systemInstruction = `You are a professional UK construction quantity surveyor specializing in ${tradeType} work.
Your task is to analyze the provided text/image and generate an accurate breakdown of materials and labour.

## CRITICAL RULES FOR MATERIALS:
- Use UK product names and specifications (e.g., "22mm copper pipe" not "3/4 inch copper pipe")
- Use UK trade prices in Sterling (£) for 2024-2025
- Round quantities UP to the nearest sensible purchase unit (e.g., cables in metre increments, timber in 2.4m lengths)
- Include only items that would appear on a trade supplier receipt
- DO NOT include consumables like screws, nails, washers, tape, or sundries unless specifically mentioned
- Every material MUST have a clear description

## UNITS:
Only use these exact unit values: m, m2, pack, bag, box, roll, sheet, length, each, pair, set, tin, tube, litre

## LABOUR:
- Break down into specific tasks a ${tradeType} would do
- Minimum 0.5 hours per task (30 minute minimum call-out)
- Be realistic with UK trade standard timings
- Example tasks: "Install double socket" (0.5hrs), "First fix wiring to 3 points" (1.5hrs)
- The labour rate is £${labourRate}/hour

## ALREADY QUOTED ITEMS:
${context?.existingItems?.length ? `These items are already in the quote, do not duplicate:\n${context.existingItems.map(i => `- ${i.name}: ${i.quantity} ${i.unit}`).join('\n')}` : 'None'}

## USER'S PRICE LIST:
${priceListHint ? `Match prices from this list where items match:\n${priceListHint}` : 'No custom price list provided - use typical UK trade prices.'}`;

    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash',
      systemInstruction,
    });

    // Handle empty prompt for image-only requests
    const effectivePrompt = prompt?.trim() || 'Analyze this image and provide a materials and labour breakdown for the work shown.';

    const parts: any[] = [{ text: effectivePrompt }];
    if (imageBase64) {
      const base64Data = imageBase64.includes(',') ? imageBase64.split(',')[1] : imageBase64;
      parts.push({
        inlineData: {
          mimeType: 'image/jpeg',
          data: base64Data,
        },
      });
    }

    const result = await model.generateContent({
      contents: [{ role: 'user', parts }],
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: SchemaType.OBJECT,
          properties: {
            suggestedTitle: { type: SchemaType.STRING, description: 'Short 2-5 word title for the work section, e.g. "Bathroom Installation" or "Kitchen Rewire"' },
            laborHoursEstimate: { type: SchemaType.NUMBER },
            labourItems: {
              type: SchemaType.ARRAY,
              items: {
                type: SchemaType.OBJECT,
                properties: {
                  description: { type: SchemaType.STRING },
                  hours: { type: SchemaType.NUMBER },
                },
                required: ['description', 'hours'],
              },
            },
            materials: {
              type: SchemaType.ARRAY,
              items: {
                type: SchemaType.OBJECT,
                properties: {
                  name: { type: SchemaType.STRING },
                  description: { type: SchemaType.STRING },
                  quantity: { type: SchemaType.NUMBER },
                  unit: {
                    type: SchemaType.STRING,
                    enum: ['m', 'm2', 'pack', 'bag', 'box', 'roll', 'sheet', 'length', 'each', 'pair', 'set', 'tin', 'tube', 'litre']
                  },
                  estimatedUnitPrice: { type: SchemaType.NUMBER },
                },
                required: ['name', 'description', 'quantity', 'unit', 'estimatedUnitPrice'],
              },
            },
            notes: { type: SchemaType.STRING },
          },
          required: ['suggestedTitle', 'laborHoursEstimate', 'labourItems', 'materials'],
        },
      },
    });

    const parsed = JSON.parse(result.response.text());

    // Validate and clean materials
    const validUnits = ['m', 'm2', 'pack', 'bag', 'box', 'roll', 'sheet', 'length', 'each', 'pair', 'set', 'tin', 'tube', 'litre'];
    parsed.materials = (parsed.materials || [])
      .filter((m: any) => m.name && m.quantity > 0 && m.estimatedUnitPrice >= 0)
      .map((m: any) => ({
        ...m,
        quantity: Math.round(m.quantity * 100) / 100,
        unit: validUnits.includes(m.unit) ? m.unit : 'each',
        estimatedUnitPrice: Math.round(m.estimatedUnitPrice * 100) / 100,
        description: m.description || '',
      }));

    // Validate and clean labour items
    parsed.labourItems = (parsed.labourItems || [])
      .filter((l: any) => l.description && l.hours > 0)
      .map((l: any) => ({
        ...l,
        hours: Math.max(0.5, Math.round(l.hours * 2) / 2), // Round to nearest 0.5, min 0.5
      }));

    // Recalculate total labour hours
    parsed.laborHoursEstimate = parsed.labourItems.reduce((sum: number, l: any) => sum + l.hours, 0);

    return parsed;
  },

  // Parse voice command for material items
  async parseVoiceItems({ command }: { command: string }) {
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash',
      systemInstruction: `You parse voice-to-text for UK construction materials.

        CRITICAL RULE: Preserve the user's EXACT wording for item names. Do NOT interpret or clean up.

        Extract material items with:
        - name: KEEP THE EXACT WORDS the user said. Do not normalize or interpret.
          Examples of what TO DO:
          - "10 gang switch" → name: "10 gang switch" (10 is part of the product name)
          - "2m LED strip" → name: "2m LED strip"
          - "4x2 timber" → name: "4x2 timber"
          - "PIR board 50mm" → name: "PIR board 50mm"

        - quantity: ONLY extract as quantity when user CLEARLY states a count:
          - "five sheets of plywood" → quantity: 5, name: "plywood"
          - "3 bags of cement" → quantity: 3, name: "cement"
          - "couple of screws" → quantity: 2, name: "screws"
          BUT if number could be part of product spec, keep it in name with quantity 1:
          - "10 gang switch" → quantity: 1, name: "10 gang switch"
          - "2m LED strip" → quantity: 1, name: "2m LED strip"

        - unit: UK units - m, m2, pack, bag, box, roll, sheet, length, each (default "each")
        - unitPrice: Estimated UK trade price in GBP

        REMEMBER: The user needs to see their own words in the output. Less interpretation, more dictation.
        Return an array. If nothing parseable, return empty array.`,
    });

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: `Parse these materials from voice: "${command}"` }] }],
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: SchemaType.ARRAY,
          items: {
            type: SchemaType.OBJECT,
            properties: {
              name: { type: SchemaType.STRING },
              quantity: { type: SchemaType.NUMBER },
              unit: { type: SchemaType.STRING },
              unitPrice: { type: SchemaType.NUMBER },
            },
            required: ['name', 'quantity', 'unit', 'unitPrice'],
          },
        },
      },
    });

    return JSON.parse(result.response.text());
  },

  // Parse customer voice input
  async parseCustomer({ input }: { input: string }) {
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash',
      systemInstruction: `You extract customer fields from PRE-PROCESSED voice input.

        IMPORTANT: The input has ALREADY been pre-processed on the client:
        - Emails are ALREADY converted to proper format: "adam.shaw@gmail.com"
        - Phone numbers have "oh"→"0", "double X"→"XX" already applied

        YOUR JOB: Just identify which piece of text is which field. Copy values as-is.

        FIELDS:
        - name: Person's name. Fix duplicates like "adam adam shaw" → "Adam Shaw"
        - company: Business name. Found after "works for", "from", "at", "with", OR a word/acronym after the name
          Examples: "adam shaw fff" → company="FFF", "john from acme" → company="Acme"
        - email: COPY the email EXACTLY as it appears (it's already in correct format)
        - phone: Clean up to 07xxx xxxxxx or 01234 xxxxxx format
        - address: UK address if present

        CRITICAL FOR EMAIL:
        - The email is ALREADY converted (e.g., "adam.shaw@gmail.com")
        - DO NOT modify it. Just copy it exactly.
        - If you see an @ symbol, everything around it is the email.

        Return JSON. Empty string if field not found.`,
    });

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: `New customer voice input: "${input}"` }] }],
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: SchemaType.OBJECT,
          properties: {
            name: { type: SchemaType.STRING },
            company: { type: SchemaType.STRING },
            email: { type: SchemaType.STRING },
            phone: { type: SchemaType.STRING },
            address: { type: SchemaType.STRING },
          },
          required: ['name', 'company', 'email', 'phone', 'address'],
        },
      },
    });

    return JSON.parse(result.response.text());
  },

  // Parse schedule voice input
  async parseSchedule({ input }: { input: string }) {
    const now = new Date();
    // Format date explicitly in UK format for context
    const todayUK = now.toLocaleDateString('en-GB'); // DD/MM/YYYY
    const todayISO = now.toISOString();
    const dayOfWeek = now.toLocaleDateString('en-GB', { weekday: 'long' });
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();

    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash',
      systemInstruction: `You are an expert at parsing messy voice-to-text for UK tradesman scheduling.
        The input may have speech recognition errors and informal language.

        CRITICAL: All dates in the input are UK format: DD/MM/YYYY (day first, then month).
        For example: "05/02/2026" means 5th February 2026, NOT May 2nd.
        "The 5th of February" = 05/02/2026 in UK format.

        Extract a calendar event:
        - title: Short description of the job/task (required)
        - start: Start date/time as ISO string (required) - MUST preserve the exact date from input
        - end: End date/time as ISO string (default to start + 2 hours for jobs, +1 hour for meetings)
        - location: Address or job site name (empty string if not mentioned)
        - description: Any extra notes (empty string if none)

        Handle UK informal time references:
        - "tomorrow morning" = 9am tomorrow
        - "tomorrow afternoon" = 2pm tomorrow
        - "Monday" = next Monday if today is after Monday
        - "half 8" = 8:30
        - "couple of hours" = 2 hours
        - "all day" = 8am to 5pm

        IMPORTANT: Return times in LOCAL UK time (do NOT convert to UTC).
        If input says "8am", the ISO string should have T08:00:00, not adjusted for timezone.
        
        Always return valid JSON with ISO date strings.`,
    });

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: `Today is ${dayOfWeek}, ${todayUK} (UK format DD/MM/YYYY). Current time: ${currentHour}:${currentMinute.toString().padStart(2, '0')}. Current ISO: ${todayISO}. Parse this scheduling request (remember: dates are UK DD/MM/YYYY format): "${input}"` }] }],
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: SchemaType.OBJECT,
          properties: {
            title: { type: SchemaType.STRING },
            start: { type: SchemaType.STRING },
            end: { type: SchemaType.STRING },
            location: { type: SchemaType.STRING },
            description: { type: SchemaType.STRING },
          },
          required: ['title', 'start', 'end'],
        },
      },
    });

    return JSON.parse(result.response.text());
  },

  // Parse reminder voice input
  async parseReminder({ input }: { input: string }) {
    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash',
      systemInstruction: `Extract a task and a time from the user's input.
        - text: The task to be reminded about.
        - time: The specific time in 24-hour HH:mm format.
        If the user says 'in 10 minutes' or 'at 3pm', calculate the HH:mm.
        If no time is mentioned, default to 1 hour from now.
        Return a JSON object.`,
    });

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: `Current time is ${now}. Extract a reminder from: "${input}"` }] }],
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: SchemaType.OBJECT,
          properties: {
            text: { type: SchemaType.STRING },
            time: { type: SchemaType.STRING },
          },
          required: ['text', 'time'],
        },
      },
    });

    return JSON.parse(result.response.text());
  },

  // Format address
  async formatAddress({ address }: { address: string }) {
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash',
      systemInstruction: `Return ONLY the formatted Royal Mail multi-line UK address. No extra text.`,
    });

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: `Format this UK address properly for mailing: "${address}"` }] }],
    });

    return { formattedAddress: result.response.text()?.trim() || address };
  },

  // Reverse geocode coordinates to address
  async reverseGeocode({ lat, lng }: { lat: number; lng: number }) {
    try {
      // Use OpenStreetMap Nominatim (free, no API key needed)
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`,
        {
          headers: {
            'User-Agent': 'TradeMate-App/1.0',
          },
        }
      );

      if (!response.ok) {
        throw new Error('Geocoding request failed');
      }

      const data = await response.json();

      if (data.error) {
        return { address: null, error: data.error };
      }

      // Format UK address from components
      const addr = data.address || {};
      const parts = [
        addr.house_number && addr.road ? `${addr.house_number} ${addr.road}` : addr.road,
        addr.suburb || addr.neighbourhood,
        addr.city || addr.town || addr.village,
        addr.county,
        addr.postcode,
      ].filter(Boolean);

      return {
        address: parts.join(', '),
        fullAddress: data.display_name,
        postcode: addr.postcode || null,
      };
    } catch (error) {
      console.error('Reverse geocode error:', error);
      return { address: null, error: 'Failed to determine address' };
    }
  },

  // Transcribe audio to text (for iOS voice input fallback)
  async transcribeAudio({ audioBase64, mimeType }: { audioBase64: string; mimeType: string }) {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const result = await model.generateContent({
      contents: [{
        role: 'user',
        parts: [
          { text: 'Transcribe this audio exactly as spoken. Return ONLY the transcription text, nothing else. If the audio is unclear or silent, return an empty string.' },
          { inlineData: { mimeType: mimeType || 'audio/webm', data: audioBase64 } }
        ]
      }]
    });

    return { text: result.response.text()?.trim() || '' };
  },

  // Parse receipt image for expense data
  async parseReceipt({ imageBase64 }: { imageBase64: string }) {
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash',
      systemInstruction: `You are an expense receipt parser for UK tradesmen.
        Analyze the receipt image and extract:
        - vendor: The store/supplier name
        - amount: Total amount paid (GBP)
        - vatAmount: VAT amount if shown (GBP), default 0 if not visible
        - date: Receipt date in YYYY-MM-DD format
        - category: One of: materials, tools, fuel, subcontractor, office, insurance, other
        - description: Brief description of items purchased
        - paymentMethod: One of: card, cash, bank_transfer, cheque (infer from receipt if possible)

        Be precise with numbers. If VAT is 20%, calculate it if not shown.
        For builders merchants, default category to 'materials'.
        For petrol stations, default to 'fuel'.`,
    });

    const base64Data = imageBase64.includes(',') ? imageBase64.split(',')[1] : imageBase64;

    const result = await model.generateContent({
      contents: [{
        role: 'user',
        parts: [
          { text: 'Extract expense details from this receipt:' },
          { inlineData: { mimeType: 'image/jpeg', data: base64Data } }
        ]
      }],
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: SchemaType.OBJECT,
          properties: {
            vendor: { type: SchemaType.STRING },
            amount: { type: SchemaType.NUMBER },
            vatAmount: { type: SchemaType.NUMBER },
            date: { type: SchemaType.STRING },
            category: { type: SchemaType.STRING },
            description: { type: SchemaType.STRING },
            paymentMethod: { type: SchemaType.STRING },
          },
          required: ['vendor', 'amount', 'date', 'category'],
        },
      },
    });

    return JSON.parse(result.response.text());
  },
};

// Retry wrapper for transient Gemini API failures (429, 503, network errors)
async function withRetry<T>(fn: () => Promise<T>, maxRetries = 2): Promise<T> {
  let lastError: any;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      const msg = (error.message || '').toLowerCase();
      const isRetryable = msg.includes('429') || msg.includes('503') ||
        msg.includes('rate') || msg.includes('overloaded') ||
        msg.includes('unavailable') || msg.includes('timeout');
      if (!isRetryable || attempt === maxRetries) throw error;
      // Exponential backoff: 1s, 3s
      const delay = (attempt + 1) * 1500;
      console.log(`Gemini retry ${attempt + 1}/${maxRetries} after ${delay}ms...`);
      await new Promise(r => setTimeout(r, delay));
    }
  }
  throw lastError;
}

// Input validation rules per action
const MAX_TEXT_LENGTH = 5000;
const MAX_IMAGE_BASE64_LENGTH = 10_000_000; // ~7.5MB raw image
const MAX_PAYLOAD_BYTES = 15_000_000; // 15MB total request

const validationRules: Record<string, (data: any) => string | null> = {
  analyzeJob(data) {
    if (!data?.prompt && !data?.imageBase64) return 'Either prompt or imageBase64 is required';
    if (data.prompt && typeof data.prompt !== 'string') return 'prompt must be a string';
    if (data.prompt && data.prompt.length > MAX_TEXT_LENGTH) return `prompt exceeds ${MAX_TEXT_LENGTH} characters`;
    if (data.imageBase64 && typeof data.imageBase64 !== 'string') return 'imageBase64 must be a string';
    if (data.imageBase64 && data.imageBase64.length > MAX_IMAGE_BASE64_LENGTH) return 'Image too large (max ~7.5MB)';
    return null;
  },
  parseVoiceItems(data) {
    if (!data?.command || typeof data.command !== 'string') return 'command is required and must be a string';
    if (data.command.length > MAX_TEXT_LENGTH) return `command exceeds ${MAX_TEXT_LENGTH} characters`;
    return null;
  },
  parseCustomer(data) {
    if (!data?.input || typeof data.input !== 'string') return 'input is required and must be a string';
    if (data.input.length > MAX_TEXT_LENGTH) return `input exceeds ${MAX_TEXT_LENGTH} characters`;
    return null;
  },
  parseSchedule(data) {
    if (!data?.input || typeof data.input !== 'string') return 'input is required and must be a string';
    if (data.input.length > MAX_TEXT_LENGTH) return `input exceeds ${MAX_TEXT_LENGTH} characters`;
    return null;
  },
  parseReminder(data) {
    if (!data?.input || typeof data.input !== 'string') return 'input is required and must be a string';
    if (data.input.length > MAX_TEXT_LENGTH) return `input exceeds ${MAX_TEXT_LENGTH} characters`;
    return null;
  },
  formatAddress(data) {
    if (!data?.address || typeof data.address !== 'string') return 'address is required and must be a string';
    if (data.address.length > 1000) return 'address exceeds 1000 characters';
    return null;
  },
  reverseGeocode(data) {
    if (typeof data?.lat !== 'number' || typeof data?.lng !== 'number') return 'lat and lng must be numbers';
    if (data.lat < -90 || data.lat > 90 || data.lng < -180 || data.lng > 180) return 'Invalid coordinates';
    return null;
  },
  transcribeAudio(data) {
    if (!data?.audioBase64 || typeof data.audioBase64 !== 'string') return 'audioBase64 is required';
    if (data.audioBase64.length > MAX_IMAGE_BASE64_LENGTH) return 'Audio too large (max ~7.5MB)';
    if (data.mimeType && typeof data.mimeType !== 'string') return 'mimeType must be a string';
    return null;
  },
  parseReceipt(data) {
    if (!data?.imageBase64 || typeof data.imageBase64 !== 'string') return 'imageBase64 is required';
    if (data.imageBase64.length > MAX_IMAGE_BASE64_LENGTH) return 'Image too large (max ~7.5MB)';
    return null;
  },
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Check payload size via Content-Length header
    const contentLength = parseInt(req.headers.get('content-length') || '0', 10);
    if (contentLength > MAX_PAYLOAD_BYTES) {
      return new Response(
        JSON.stringify({ error: 'Request too large (max 15MB)' }),
        { status: 413, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { action, data } = await req.json();

    if (!action || typeof action !== 'string' || !actions[action]) {
      return new Response(
        JSON.stringify({ error: `Invalid action: ${action}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate inputs for this action
    const validate = validationRules[action];
    if (validate) {
      const validationError = validate(data);
      if (validationError) {
        return new Response(
          JSON.stringify({ error: validationError }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    const result = await withRetry(() => actions[action](data));

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Gemini Edge Function error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
