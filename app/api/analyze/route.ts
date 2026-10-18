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
  
    // Instructions that control the quality, accuracy, and structure
    // of the AI's educational chart analysis.
    
    const prompt = `
You are an educational market chart analyst. Analyze the uploaded
chart carefully and provide a concise, evidence-based explanation
of the visible price action.

CHART CONTEXT
- Instrument: ${String(instrument || "Not specified")}
- Timeframe: ${String(timeframe || "Not specified")}

ANALYSIS RULES
1. Base your analysis only on information that is visible in the image.
2. Never invent prices, dates, indicators, or chart features.
3. If a price level, date, or chart detail is unreadable, say so.
4. Distinguish direct observations from possible interpretations.
5. Use approximate price zones rather than false precision.
6. Do not force patterns onto the chart. If none is clear, say so.
7. Do not describe a pattern as confirmed when the image does not
   provide sufficient evidence.
8. Do not assume that a reversal, breakout, or liquidity sweep
   guarantees a particular future movement.
9. Avoid repeating the same observation across multiple sections.
10. Keep the report useful and concise. Prefer short paragraphs
    and clear bullet points.
11. Do not give personalized financial advice or tell the user
    to buy, sell, enter, or exit a position.
12. If the image is too unclear to analyze reliably, explain why
    instead of guessing.

USE THESE EXACT HEADINGS

### 1. Market Snapshot
Summarize the visible overall trend, current market structure,
and most important observation in no more than 3 bullet points.

### 2. Trend and Structure
Describe the visible sequence of highs and lows, the prevailing
direction, and any recent structural change.
Clearly distinguish the broader trend from the most recent
price movement.

### 3. Key Price Zones
Identify potential support and resistance zones only when
supported by visible evidence.
For each zone, state:
- Approximate price range, if readable.
- Whether it is potential support or resistance.
- The visible reason it may be significant.

If reliable price levels cannot be read, describe the relevant
areas visually instead of inventing numbers.

### 4. Patterns and Observations
Describe any clearly visible chart patterns or notable movements.
For each interpretation, explain the observation supporting it.
Label uncertain interpretations as possibilities, not facts.
If no clear pattern is visible, state that explicitly.

### 5. Limitations
Briefly mention the most important limitations of this image,
such as image quality, missing indicators, obscured candles,
or unavailable higher-timeframe context.
Do not list limitations that are irrelevant to this chart.

FINAL QUALITY CHECK
Before responding, verify that:
- Every stated price level is supported by the image.
- Observations are separated from interpretations.
- Uncertain conclusions are expressed cautiously.
- The report is concise and contains no repetitive filler.

This is educational chart analysis, not a prediction of
guaranteed future prices.
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