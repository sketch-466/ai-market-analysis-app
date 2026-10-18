import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";

// Use Node.js for server-side AI requests.
export const runtime = "nodejs";

// Initialize Gemini using the private server-side API key.
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

// Define the structure we expect Gemini to return.
const analysisSchema = {
  type: "object",
  properties: {
    chartIdentity: {
      type: "object",
      properties: {
        selectedInstrument: { type: "string" },
        detectedInstrument: { type: "string" },
        instrumentMismatch: { type: "boolean" },
        selectedTimeframe: { type: "string" },
        detectedTimeframe: { type: "string" },
        timeframeMismatch: { type: "boolean" },
        identityNotes: { type: "string" },
      },
      required: [
        "selectedInstrument",
        "detectedInstrument",
        "instrumentMismatch",
        "selectedTimeframe",
        "detectedTimeframe",
        "timeframeMismatch",
        "identityNotes",
      ],
    },
    snapshot: {
      type: "object",
      properties: {
        trend: { type: "string" },
        structure: { type: "string" },
        keyObservation: { type: "string" },
      },
      required: ["trend", "structure", "keyObservation"],
    },
    trendAndStructure: { type: "string" },
    priceZones: {
      type: "array",
      items: {
        type: "object",
        properties: {
          type: { type: "string" },
          range: { type: "string" },
          reason: { type: "string" },
        },
        required: ["type", "range", "reason"],
      },
    },
    patternsAndObservations: {
      type: "array",
      items: {
        type: "object",
        properties: {
          observation: { type: "string" },
          interpretation: { type: "string" },
          confirmationNeeded: { type: "string" },
        },
        required: [
          "observation",
          "interpretation",
          "confirmationNeeded",
        ],
      },
    },
    limitations: {
      type: "array",
      items: { type: "string" },
    },
  },
  required: [
    "chartIdentity",
    "snapshot",
    "trendAndStructure",
    "priceZones",
    "patternsAndObservations",
    "limitations",
  ],
};

// Normalize a value received from the form.
function getFormValue(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

export async function POST(request: Request) {
  try {
    // Read the uploaded image and the user's selected settings.
    const formData = await request.formData();

    const image = formData.get("chart");
    const instrument = getFormValue(formData.get("instrument"));
    const timeframe = getFormValue(formData.get("timeframe"));

    // Make sure a chart image was uploaded.
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

    // Prevent unnecessarily large uploads.
    if (image.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: "The image must be smaller than 10 MB." },
        { status: 400 }
      );
    }

    // Verify the API key before making an AI request.
    if (!process.env.GEMINI_API_KEY) {
      console.error("GEMINI_API_KEY is missing.");

      return NextResponse.json(
        { error: "AI analysis is not configured yet." },
        { status: 500 }
      );
    }

    // Convert the uploaded image to Base64.
    const imageBuffer = Buffer.from(await image.arrayBuffer());
    const base64Image = imageBuffer.toString("base64");

    // Tell Gemini exactly what to analyze and how to structure it.
    const prompt = `
You are an educational market chart analysis assistant.

Analyze the uploaded chart using only the information actually
visible in the image.

USER-SELECTED SETTINGS
Instrument: ${instrument || "Not specified"}
Timeframe: ${timeframe || "Not specified"}

CHART IDENTITY
1. Identify the instrument only if its symbol or identity is
   reasonably readable in the screenshot.
2. Identify the timeframe only if it is reasonably readable.
3. If either cannot be identified, return "Unclear".
4. Compare the visible identity with the user-selected settings.
5. Mark a mismatch true only when there is clear evidence of
   a genuine conflict.
6. Do not invent a mismatch when the chart identity is unclear.
7. Explain any genuine discrepancy briefly in identityNotes.

MARKET SNAPSHOT
Summarize the visible trend, current structure, and most important
observation in short, clear language.

TREND AND STRUCTURE
Describe the visible highs, lows, direction, and recent changes.
Distinguish the broader visible movement from the latest movement.

PRICE ZONES
Identify potential support and resistance only where the chart
provides visible evidence.
Include approximate readable price ranges and explain why each
area may matter.
If price labels are unreadable, do not invent prices.
The type must be "Support", "Resistance", or "Unclear".

PATTERNS AND OBSERVATIONS
Separate the visible observation from its possible interpretation.
Explain what additional evidence would help confirm an uncertain
interpretation.
Do not force patterns onto the chart.
A wick alone does not prove buyer or seller intent.
A sharp reversal alone does not prove a liquidity sweep,
bear trap, or blow-off top.

LIMITATIONS
List only relevant limitations, such as unclear labels, an open
candle, missing indicators, or limited historical context.

ACCURACY RULES
- Never invent prices, dates, candles, indicators, or chart details.
- Do not treat an uncertain interpretation as a confirmed fact.
- Be concise and avoid repeating the same information.
- Do not predict guaranteed future movements.
- Do not give personalized financial advice or trading instructions.
- If the chart is unclear, acknowledge the uncertainty.

Return the requested structured data only.
Do not return Markdown, code fences, or additional commentary.
`;

    // Ask Gemini for structured JSON rather than a Markdown essay.
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
      response_format: {
        type: "text",
        mime_type: "application/json",
        schema: analysisSchema,
      },
    });

    // Read the AI-generated JSON text.
    const output = response.output_text;

    if (!output) {
      return NextResponse.json(
        { error: "The AI returned an empty analysis. Please try again." },
        { status: 502 }
      );
    }

    // Parse the result instead of trusting arbitrary AI-generated text.
    let analysis;

    try {
      analysis = JSON.parse(output);
    } catch {
      console.error("Gemini returned invalid JSON.");

      return NextResponse.json(
        { error: "The AI returned an invalid report. Please try again." },
        { status: 502 }
      );
    }

    // Confirm the essential report sections exist.
    if (
      !analysis.chartIdentity ||
      !analysis.snapshot ||
      typeof analysis.trendAndStructure !== "string" ||
      !Array.isArray(analysis.priceZones) ||
      !Array.isArray(analysis.patternsAndObservations) ||
      !Array.isArray(analysis.limitations)
    ) {
      console.error("Gemini returned an incomplete analysis.");

      return NextResponse.json(
        { error: "The AI returned an incomplete report. Please try again." },
        { status: 502 }
      );
    }

    // Return structured analysis for the frontend to display.
    return NextResponse.json({
      success: true,
      analysis,
    });
  } catch (error) {
    // Keep technical details in server logs, not in the UI.
    console.error("Chart analysis failed:", error);

    return NextResponse.json(
      {
        error: "Chart analysis failed. Please try again in a moment.",
      },
      { status: 500 }
    );
  }
}