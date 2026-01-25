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
  async analyzeJob({ prompt, imageBase64 }: { prompt: string; imageBase64?: string }) {
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash',
      systemInstruction: `You are a professional UK construction quantity surveyor.
        Analyze the text and image provided to generate a list of materials and estimated labour hours.
        Use UK market prices in Sterling (£) for 2024-2025.
        Standard UK units: metres (m), square metres (m2), packs, or each.
        Focus on providing realistic trade unit prices in GBP.`,
    });

    const parts: any[] = [{ text: prompt }];
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
            suggestedTitle: { type: SchemaType.STRING },
            laborHoursEstimate: { type: SchemaType.NUMBER },
            materials: {
              type: SchemaType.ARRAY,
              items: {
                type: SchemaType.OBJECT,
                properties: {
                  name: { type: SchemaType.STRING },
                  description: { type: SchemaType.STRING },
                  quantity: { type: SchemaType.NUMBER },
                  unit: { type: SchemaType.STRING },
                  estimatedUnitPrice: { type: SchemaType.NUMBER },
                },
                required: ['name', 'quantity', 'unit', 'estimatedUnitPrice'],
              },
            },
            notes: { type: SchemaType.STRING },
          },
          required: ['suggestedTitle', 'laborHoursEstimate', 'materials'],
        },
      },
    });

    return JSON.parse(result.response.text());
  },

  // Parse voice command for material items
  async parseVoiceItems({ command }: { command: string }) {
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash',
      systemInstruction: `You are an expert at parsing messy voice-to-text for UK construction materials.
        The input may have speech recognition errors and informal trade language.

        Extract material items with:
        - name: Material name (clean it up, e.g. "two by four" = "2x4 timber")
        - quantity: Number of items (default 1 if unclear)
        - unit: UK units - m, m2, pack, bag, box, roll, sheet, length, each (default "each")
        - unitPrice: Estimated UK trade price in GBP (use sensible defaults)

        Common voice patterns:
        - "couple of" = 2
        - "few" = 3
        - "dozen" = 12
        - "metre/meter" = m
        - "square metre" = m2
        - Recognise UK trade materials: plasterboard, 2x4, 4x2, noggins, joists, PIR, kingspan, etc.

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
      systemInstruction: `You parse NATURAL CONVERSATIONAL speech from UK tradesmen adding clients.

        CRITICAL: Users speak NATURALLY without labels. They do NOT say "name is" or "email is".
        Typical input: "Adam Shaw, works for FFF, adam dot shaw at gmail dot com, oh seven seven double oh one two three four five six"

        DUPLICATE NAME BUG - AVOID THIS:
        Speech recognition often repeats words. If you see "Adam Adam Shaw" or "John John Smith",
        the name is just "Adam Shaw" or "John Smith" - NEVER include duplicated first names.

        FIELD EXTRACTION:
        - name: The PERSON (human). First + last name. Remove any duplicates. "Adam Adam Shaw" → "Adam Shaw"
        - company: Business name ONLY if clearly stated (contains Ltd, Inc, or sounds like a business). Most customers are private - leave empty.
        - email: See EMAIL PARSING below
        - phone: UK number. See PHONE PARSING below
        - address: UK address if mentioned (house number, street, town, postcode)

        EMAIL PARSING (MOST CRITICAL):
        Voice input converts email to spoken words. You MUST reconstruct:

        Pattern: [local-part] "at" [domain]
        - The LOCAL PART (before @) is CRITICAL - don't drop any of it!
        - "dot" or "point" → "."
        - "at" or "add" → "@"
        - "underscore" → "_"
        - "dash" or "hyphen" → "-"

        EXAMPLES - study these carefully:
        "adam dot shaw at gmail dot com" → "adam.shaw@gmail.com"
        "a dot shaw at outlook dot com" → "a.shaw@outlook.com"
        "adamshaw at gmail dot com" → "adamshaw@gmail.com"
        "adam underscore shaw at hotmail dot co dot uk" → "adam_shaw@hotmail.co.uk"
        "shaw dot adam at yahoo dot com" → "shaw.adam@yahoo.com"
        "info at fff dot co dot uk" → "info@fff.co.uk"

        COMMON MISTAKES TO AVOID:
        - DON'T drop the first part of email (adam.shaw → shaw is WRONG)
        - DON'T confuse the person's name with email local part - they may differ
        - DON'T add extra dots or characters not in the input

        PHONE PARSING:
        - "oh" or "zero" = "0"
        - "double [digit]" = repeat that digit twice
        - "triple [digit]" = repeat three times
        - Format: 07xxx xxxxxx (mobile) or 01234 xxxxxx (landline)

        Return valid JSON. Empty string for any field not mentioned.`,
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
    const today = now.toISOString();
    const dayOfWeek = now.toLocaleDateString('en-GB', { weekday: 'long' });

    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash',
      systemInstruction: `You are an expert at parsing messy voice-to-text for UK tradesman scheduling.
        The input may have speech recognition errors and informal language.

        Extract a calendar event:
        - title: Short description of the job/task (required)
        - start: Start date/time as ISO string (required)
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

        Always return valid JSON with ISO date strings.`,
    });

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: `Today is ${dayOfWeek}, ${today}. Parse this scheduling request: "${input}"` }] }],
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

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { action, data } = await req.json();

    if (!action || !actions[action]) {
      return new Response(
        JSON.stringify({ error: `Invalid action: ${action}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const result = await actions[action](data);

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
