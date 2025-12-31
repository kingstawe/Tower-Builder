
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const getArchitectComment = async (score: number, status: 'WIN' | 'FAIL' | 'PROGRESS'): Promise<string> => {
  try {
    const prompt = `You are a professional architect mentor in a building game. 
    The user is stacking floors of a building. 
    Current Score: ${score}.
    Status: ${status}.
    Provide a very short, encouraging, and witty comment in Arabic (max 10 words) about their construction progress.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        systemInstruction: "You are an expert architect. Keep it brief, professional yet fun, and only in Arabic.",
        temperature: 0.8,
      },
    });

    return response.text || "واصل البناء يا بطل!";
  } catch (error) {
    console.error("Gemini error:", error);
    return "بناء رائع! استمر في الارتفاع.";
  }
};
