import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export interface TOUData {
  code111: number;
  code010: number;
  code020: number;
  code030: number;
  code015_handwritten: number;
  code015_printed: number;
  code016_handwritten: number;
  code016_printed: number;
  code017_handwritten: number;
  code017_printed: number;
  code118_handwritten: number;
  code118_printed: number;
  code050: number;
  code060: number;
  code070: number;
  code280: number;
  customer_name?: string;
  customer_id?: string;
  pea_meter_id?: string;
  billing_month?: number;
  billing_year?: number;
}

export async function analyzeMeterImage(base64Image: string): Promise<TOUData> {
  const model = "gemini-3-flash-preview";
  
  const prompt = `
    Extract TOU meter reading data from this image. 
    Look for the following codes and their corresponding values (kWh or kW).
    Some values might be handwritten next to printed labels.
    
    Codes to extract:
    - 111: Total Energy (kWh)
    - 010: On-Peak Energy (kWh)
    - 020: Off-Peak Energy (kWh)
    - 030: Holiday Energy (kWh)
    - 015: Look for both handwritten and printed values.
    - 016: Look for both handwritten and printed values.
    - 017: Look for both handwritten and printed values.
    - 118: Look for both handwritten and printed values.
    - 050: Value for code 050
    - 060: Value for code 060
    - 070: Value for code 070
    - 280: Value for code 280
    
    Also try to extract:
    - Customer Name (ชื่อผู้ใช้ไฟฟ้า)
    - Customer ID (หมายเลขผู้ใช้ไฟฟ้า)
    - PEA Meter ID (หมายเลขมิเตอร์)
    - Billing Month (รอบเดือน) as a number (1-12)
    - Billing Year (ปี) as a number (e.g., 2567 or 2024)
    
    Return the data in the specified JSON format. If a value is not found, use 0.
  `;

  const response = await ai.models.generateContent({
    model,
    contents: [
      {
        parts: [
          { text: prompt },
          {
            inlineData: {
              mimeType: "image/jpeg",
              data: base64Image,
            },
          },
        ],
      },
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          code111: { type: Type.NUMBER },
          code010: { type: Type.NUMBER },
          code020: { type: Type.NUMBER },
          code030: { type: Type.NUMBER },
          code015_handwritten: { type: Type.NUMBER },
          code015_printed: { type: Type.NUMBER },
          code016_handwritten: { type: Type.NUMBER },
          code016_printed: { type: Type.NUMBER },
          code017_handwritten: { type: Type.NUMBER },
          code017_printed: { type: Type.NUMBER },
          code118_handwritten: { type: Type.NUMBER },
          code118_printed: { type: Type.NUMBER },
          code050: { type: Type.NUMBER },
          code060: { type: Type.NUMBER },
          code070: { type: Type.NUMBER },
          code280: { type: Type.NUMBER },
          customer_name: { type: Type.STRING },
          customer_id: { type: Type.STRING },
          pea_meter_id: { type: Type.STRING },
          billing_month: { type: Type.NUMBER },
          billing_year: { type: Type.NUMBER },
        },
        required: ["code111", "code010", "code020", "code030"],
      },
    },
  });

  return JSON.parse(response.text || "{}");
}
