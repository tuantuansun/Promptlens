import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function generatePromptFromImage(
  base64Image: string, 
  mimeType: string,
  options: {
    selectedStyles: string[];
    complexity: number;
    backgroundDetail: number;
    subjectDetail: number;
    focusMode: 'General' | 'UI/UX';
  }
) {
  const model = "gemini-3.1-pro-preview";
  
  const stylesString = options.selectedStyles.join(", ");
  const isUIMode = options.focusMode === 'UI/UX';

  const systemInstruction = `
    You are a Visual Intelligence System. Your task is to perform a deep structural analysis of an image and generate a professional prompt.

    ${isUIMode ? `
    SPECIAL FOCUS: UI/UX DESIGN ANALYSIS
    The user wants to recreate the UI/UX design elements from this image. 
    Focus exclusively on:
    - UI Components: Buttons, inputs, cards, navigation bars, icons.
    - Component Relationships: Identify parent-child structures (e.g., "a card containing a button and a text label").
    - Visual Hierarchy: Describe what elements draw the most attention and how the eye flows through the design.
    - Design System: Typography (serif/sans), color palette (hex codes if possible), spacing, border radius, shadows.
    - Layout: Grid structure, alignment, hierarchy, responsive patterns.
    - Visual Style: Skeuomorphic, flat, glassmorphism, brutalist, neomorphism, etc.
    ` : `
    GENERAL VISUAL ANALYSIS
    Focus on the overall subject, environment, lighting, and artistic composition.
    `}

    INSTRUCTIONS:
    1. ANALYZE: Identify the key elements based on the ${options.focusMode} focus.
    2. TRANSFORM: Apply the requested styles: ${stylesString}.
    3. SCALE: Use detail levels (Complexity: ${options.complexity}, Background: ${options.backgroundDetail}, Subject: ${options.subjectDetail}) to determine the depth of the final prompt.
    4. SAFETY: Strictly avoid generating any inappropriate, explicit, or suggestive content.
    
    Return a JSON object with:
    - "analysis": A brief summary of what you see (subject/components, environment/layout, lighting/style, composition/hierarchy).
    - "prompt": The final optimized prompt for an image generator (like Midjourney or DALL-E) to recreate this ${options.focusMode === 'UI/UX' ? 'UI design' : 'visual'}.
  `;

  const response = await ai.models.generateContent({
    model,
    contents: [
      {
        role: "user",
        parts: [
          {
            inlineData: {
              data: base64Image,
              mimeType: mimeType || "image/jpeg",
            },
          },
          {
            text: `Analyze this image and generate a prompt in JSON format.`,
          },
        ],
      }
    ],
    config: {
      systemInstruction,
      temperature: 0.2,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          analysis: {
            type: Type.OBJECT,
            properties: {
              subject: { type: Type.STRING },
              environment: { type: Type.STRING },
              lighting: { type: Type.STRING },
              composition: { type: Type.STRING }
            },
            required: ["subject", "environment", "lighting", "composition"]
          },
          prompt: { type: Type.STRING }
        },
        required: ["analysis", "prompt"]
      }
    },
  });

  try {
    return JSON.parse(response.text);
  } catch (e) {
    console.error("Failed to parse AI response:", response.text);
    return {
      analysis: { subject: "Unknown", environment: "Unknown", lighting: "Unknown", composition: "Unknown" },
      prompt: response.text
    };
  }
}
