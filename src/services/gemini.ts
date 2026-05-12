import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function generateResponse(
  message: string, 
  history: { role: 'user' | 'model'; parts: { text: string }[] }[],
  personality: string,
  language: 'en' | 'ar',
  currentTime: string
) {
  const model = "gemini-3-flash-preview";
  
  const systemInstruction = `
    You are "ThunderFire", an advanced AI assistant. 
    Current Language: ${language === 'en' ? 'English' : 'Arabic'}.
    Personality: ${personality}.
    Current Time: ${currentTime}.
    
    Capabilities:
    1. Chatting: Provide helpful, intelligent responses.
    2. Commands: You can recognize commands like "Open YouTube" or "Search Google". 
       - Output them as: [COMMAND: OPEN_YOUTUBE] or [COMMAND: SEARCH_GOOGLE: query].
    3. Memory: Refer to the specific user context if provided.
    
    Important: Always respond in the requested language (${language}). If Arabic, use clear and modern Arabic.
  `;

  try {
    const chat = ai.chats.create({
      model,
      config: {
        systemInstruction,
      },
      history: history.map(h => ({
        role: h.role,
        parts: h.parts
      }))
    });

    const result = await chat.sendMessage({ message });
    return result.text;
  } catch (error) {
    console.error("Gemini API Error:", error);
    return language === 'en' 
      ? "I encountered an error. Please try again." 
      : "حدث خطأ ما. يرجى المحاولة مرة أخرى.";
  }
}
