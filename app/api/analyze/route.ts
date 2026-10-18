import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";

// Use the Node.js runtime for server-side AI requests.
export const runtime = "nodejs";

// Initialize Gemini on the server using the private API key.
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

export async function POST(request: Request) {
  try {
    // Read the uploaded chart and selected market settings.
    const formData = await request.formData();

    const image = formData.get("chart");
    const instrument = formData.get("instrument");
    const timeframe = formData.get("timeframe");

    // Ensure the uploaded file is actually an image.
    if (!(image instanceof File)) {
      return NextResponse.json(
        { error: "Please upload a chart image." },
        { status: 400 }
      );
    }

    if (!image.type.startsWith("image/")) {
      return NextResponse.json(
        { error: "The uploaded file must be an image." },
        { status: 400 }
      );
    }

    // Limit uploads to 10 MB.
    if (image.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: "The image must be smaller than 10 MB." },
        { status: 400 }
      );
    }

    // Check that the server has the Gemini API key.
    if (!process.env.GEMINI_API_KEY) {
      console.error("GEMINI_API_KEY is missing.");

      return NextResponse.json(
        { error: "AI analysis is not configured yet." },
        { status: 500 }
      );
    }

    // Convert the image to Base64 so Gemini can process it.
    const imageBuffer = Buffer.from(await image.arrayBuffer());
    const base64Image = imageBuffer.toString("base64");

    // Ask Gemini to describe observable chart information.
    const prompt = `
You are an educational market-chart analysis assistant.

Analyze the uploaded chart for educational purposes.

Instrument: ${String(instrument || "Not specified")}
Timeframe: ${String(timeframe || "Not specified")}

Return your analysis using these headings:

1. Overall Trend
Describe the visible direction of price movement.

2. Chart Structure
Describe observable highs, lows, and price structure.

3. Potential Support and Resistance
Identify approximate visible areas only when the image provides enough information.
Do not invent exact prices if the chart scale is unreadable.

4. Visible Patterns
Describe recognizable patterns, if any. Say when no clear pattern is visible.

5. Uncertainty
Explain any limitations caused by image quality, missing indicators, or incomplete chart information.

Do not invent prices or indicators.
Do not claim certainty about future price movements.
Do not give personalized financial advice or instruct the user to buy or sell.
If the chart is unclear, say so explicitly.
`;

    // Send the chart and instructions to Gemini 3.8 Flash.
const response = await ai.interactions.create({
  model: "gemini-3.8-flash",
  input: [
    {
      type: "text",
      text: prompt,
    },
    {
      type: "image",
      data: base64Image,
      mime_type: image.type,
    },
  ],
});

// Return the generated analysis to the frontend.
return NextResponse.json({
  success: true,
  analysis: response.output_text || "The AI returned no analysis.",
});
  } catch (error) {
    // Log technical details privately; return a safe message to the user.
    console.error("Chart analysis failed:", error);

    return NextResponse.json(
      {
        error:
          "Chart analysis failed. Please try again in a moment.",
      },
      { status: 500 }
    );
  }
}