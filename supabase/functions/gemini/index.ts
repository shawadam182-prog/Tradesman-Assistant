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
      model: 'gemini-1.5-flash',
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
      model: 'gemini-1.5-flash',
      systemInstruction: `Parse the user's UK-based notes or voice commands to extract a clean list of material items.
        Return an array of objects with name, quantity, unit, and unitPrice.`,
    });

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: `Extract construction material items from this input: "${command}"` }] }],
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
      model: 'gemini-1.5-flash',
      systemInstruction: `Extract Name, Company, Email, Phone, and Address from the user's input.
        Return a JSON object. Use UK formats where applicable.`,
    });

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: `Extract customer details from this description: "${input}"` }] }],
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
    const today = new Date().toISOString();
    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash',
      systemInstruction: `Extract a calendar event from the input.
        - title: The name of the task/event.
        - start: Start date/time as ISO string.
        - end: End date/time as ISO string (if not specified, default to 1 hour after start).
        - location: If a project name or address is mentioned.
        - description: Any extra context.

        Handle relative dates like 'tomorrow', 'next week', 'Friday at 2pm'.
        Return a JSON object.`,
    });

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: `Today's date/time is ${today}. User says: "${input}"` }] }],
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
      model: 'gemini-1.5-flash',
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
      model: 'gemini-1.5-flash',
      systemInstruction: `Return ONLY the formatted Royal Mail multi-line string. Do not add chatter.`,
    });

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: `Format this UK address properly for mailing: "${address}"` }] }],
    });

    return { formattedAddress: result.response.text()?.trim() || address };
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
