
import { GoogleGenAI, Type } from "@google/genai";
import { LocationInfo } from "../types";

const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_API_KEY || '' });

export const getLocationFacts = async (locationName: string): Promise<{ info: LocationInfo, sources: any[] } | null> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Provide detailed immersive facts for a 360 experience of: ${locationName}. 
      Include current real-world status like weather or recent news if applicable.
      Return structured data about the location including elevation and key facts.`,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            description: { type: Type.STRING },
            elevation: { type: Type.STRING },
            location: { type: Type.STRING },
            facts: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            }
          },
          required: ["name", "description", "elevation", "location", "facts"]
        }
      }
    });

    const text = response.text;
    const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];

    if (!text) return null;
    return {
      info: JSON.parse(text) as LocationInfo,
      sources: sources
    };
  } catch (error) {
    console.error("Failed to fetch location facts:", error);
    return null;
  }
};
