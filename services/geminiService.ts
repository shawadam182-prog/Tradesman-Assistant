
import { GoogleGenAI, Type } from "@google/genai";

/**
 * Helper to get an AI instance per call to ensure latest API key usage
 */
const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

export const analyzeJobRequirements = async (prompt: string, imageBase64?: string) => {
  const ai = getAI();
  const model = 'gemini-3-flash-preview';
  
  const contents: any[] = [{ text: prompt }];
  if (imageBase64 && typeof imageBase64 === 'string') {
    contents.push({
      inlineData: {
        mimeType: 'image/jpeg',
        data: imageBase64.includes(',') ? imageBase64.split(',')[1] : imageBase64
      }
    });
  }

  try {
    const response = await ai.models.generateContent({
      model,
      contents: { parts: contents },
      config: {
        systemInstruction: `You are a professional UK construction quantity surveyor. 
        Analyze the text and image provided to generate a list of materials and estimated labour hours.
        Use UK market prices in Sterling (£) for 2024-2025.
        Standard UK units: metres (m), square metres (m2), packs, or each.
        Focus on providing realistic trade unit prices in GBP.`,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            suggestedTitle: { type: Type.STRING },
            laborHoursEstimate: { type: Type.NUMBER },
            materials: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  description: { type: Type.STRING },
                  quantity: { type: Type.NUMBER },
                  unit: { type: Type.STRING },
                  estimatedUnitPrice: { type: Type.NUMBER }
                },
                required: ['name', 'quantity', 'unit', 'estimatedUnitPrice']
              }
            },
            notes: { type: Type.STRING }
          },
          required: ['suggestedTitle', 'laborHoursEstimate', 'materials']
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("Empty response from AI");
    return JSON.parse(text);
  } catch (error) {
    console.error("Gemini analyzeJobRequirements failed:", error);
    throw error;
  }
};

export const parseVoiceCommandForItems = async (command: string) => {
  const ai = getAI();
  const model = 'gemini-3-flash-preview';
  
  try {
    const response = await ai.models.generateContent({
      model,
      contents: `Extract construction material items from this input: "${command}"`,
      config: {
        systemInstruction: `Parse the user's UK-based notes or voice commands to extract a clean list of material items.
        Return an array of objects.`,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              quantity: { type: Type.NUMBER },
              unit: { type: Type.STRING },
              unitPrice: { type: Type.NUMBER }
            },
            required: ['name', 'quantity', 'unit', 'unitPrice']
          }
        }
      }
    });

    const text = response.text;
    if (!text) return [];
    return JSON.parse(text);
  } catch (error) {
    console.error("Gemini parseVoiceCommandForItems failed:", error);
    return [];
  }
};

export const parseCustomerVoiceInput = async (input: string) => {
  const ai = getAI();
  const model = 'gemini-3-flash-preview';
  
  try {
    const response = await ai.models.generateContent({
      model,
      contents: `Extract customer details from this description: "${input}"`,
      config: {
        systemInstruction: `Extract Name, Company, Email, Phone, and Address from the user's input. 
        Return a JSON object. Use UK formats where applicable.`,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            company: { type: Type.STRING },
            email: { type: Type.STRING },
            phone: { type: Type.STRING },
            address: { type: Type.STRING }
          },
          required: ['name', 'company', 'email', 'phone', 'address']
        }
      }
    });
    const text = response.text;
    if (!text) throw new Error("Empty response");
    return JSON.parse(text);
  } catch (error) {
    console.error("Gemini parseCustomerVoiceInput failed:", error);
    throw error;
  }
};

export const parseScheduleVoiceInput = async (input: string) => {
  const ai = getAI();
  const model = 'gemini-3-flash-preview';
  const today = new Date().toISOString();
  
  try {
    const response = await ai.models.generateContent({
      model,
      contents: `Today's date/time is ${today}. User says: "${input}"`,
      config: {
        systemInstruction: `Extract a calendar event from the input. 
        - title: The name of the task/event.
        - start: Start date/time as ISO string.
        - end: End date/time as ISO string (if not specified, default to 1 hour after start).
        - location: If a project name or address is mentioned.
        - description: Any extra context.
        
        Handle relative dates like 'tomorrow', 'next week', 'Friday at 2pm'. 
        Return a JSON object.`,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            start: { type: Type.STRING },
            end: { type: Type.STRING },
            location: { type: Type.STRING },
            description: { type: Type.STRING }
          },
          required: ['title', 'start', 'end']
        }
      }
    });
    const text = response.text;
    if (!text) throw new Error("Empty response");
    return JSON.parse(text);
  } catch (error) {
    console.error("Gemini parseScheduleVoiceInput failed:", error);
    throw error;
  }
};

export const parseReminderVoiceInput = async (input: string) => {
  const ai = getAI();
  const model = 'gemini-3-flash-preview';
  const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  
  try {
    const response = await ai.models.generateContent({
      model,
      contents: `Current time is ${now}. Extract a reminder from: "${input}"`,
      config: {
        systemInstruction: `Extract a task and a time from the user's input.
        - text: The task to be reminded about.
        - time: The specific time in 24-hour HH:mm format. 
        If the user says 'in 10 minutes' or 'at 3pm', calculate the HH:mm.
        If no time is mentioned, default to 1 hour from now.
        Return a JSON object.`,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            text: { type: Type.STRING },
            time: { type: Type.STRING }
          },
          required: ['text', 'time']
        }
      }
    });
    const text = response.text;
    if (!text) throw new Error("Empty response");
    return JSON.parse(text);
  } catch (error) {
    console.error("Gemini parseReminderVoiceInput failed:", error);
    throw error;
  }
};

export const formatAddressAI = async (partialAddress: string) => {
  const ai = getAI();
  const model = 'gemini-3-flash-preview';
  try {
    const response = await ai.models.generateContent({
      model,
      contents: `Format this UK address properly for mailing: "${partialAddress}"`,
      config: {
        systemInstruction: `Return ONLY the formatted Royal Mail multi-line string. Do not add chatter.`,
      }
    });
    return response.text?.trim() || partialAddress;
  } catch (error) {
    console.error("Gemini formatAddressAI failed:", error);
    return partialAddress;
  }
};

export const reverseGeocode = async (lat: number, lng: number) => {
  const ai = getAI();
  // Using gemini-2.5-flash series for Maps Grounding as required
  const model = 'gemini-2.5-flash';
  try {
    const response = await ai.models.generateContent({
      model,
      // Focus the prompt on the current location provided via toolConfig
      contents: "What is the exact street address for my current location? Use Google Maps grounding to provide only the Royal Mail style address string.",
      config: {
        tools: [{ googleMaps: {} }, { googleSearch: {} }],
        toolConfig: {
          retrievalConfig: {
            latLng: {
              latitude: lat,
              longitude: lng
            }
          }
        }
      },
    });
    return response.text?.trim() || null;
  } catch (error) {
    console.error("Gemini reverseGeocode failed:", error);
    return null;
  }
};
