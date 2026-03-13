import { GoogleGenAI } from "@google/genai";

let aiInstance: GoogleGenAI | null = null;

export function getGeminiAI() {
  if (!aiInstance) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not defined. Please set it in the environment.");
    }
    aiInstance = new GoogleGenAI({ apiKey });
  }
  return aiInstance;
}

export async function askTaxAssistant(question: string) {
  const ai = getGeminiAI();
  const model = "gemini-3-flash-preview";
  
  const response = await ai.models.generateContent({
    model,
    contents: question,
    config: {
      systemInstruction: "Jesteś ekspertem podatkowym w firmie 'Spokojne Podatki'. Twoim celem jest pomaganie użytkownikom w zrozumieniu zawiłości podatkowych w Polsce (VAT, PIT, CIT, JDG). Odpowiadaj profesjonalnie, ale przystępnie. Jeśli nie jesteś czegoś pewien, zasugeruj kontakt z naszymi doradcami lub zapisanie się na szkolenie.",
    },
  });

  return response.text;
}
