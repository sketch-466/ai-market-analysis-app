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
    // Compact summary displayed in the dashboard's result cards.
snapshot: {
  type: "object",
  properties: {
    trend: { type: "string" },
    structure: { type: "string" },
    keyObservation: { type: "string" },
    
    // A cautious scenario, not a guaranteed market prediction.
    tradeIdea: {
      type: "string",
      enum: ["Buy", "Sell", "Wait", "No clear setup"],
    },
    
    // Only provide price levels when the chart supports them.
    entry: { type: "string" },
    stopLoss: { type: "string" },
    initialTakeProfit: { type: "string" },
    finalTakeProfit: { type: "string" },
    
    // Use "Not available" if the ratio cannot be justified.
    riskRewardRatio: { type: "string" },
    
    // Describe the strength of the visible evidence.
    strength: {
      type: "string",
      enum: ["Strong", "Moderate", "Weak", "Unclear"],
    },
    
    // Do not invent a duration if the chart cannot support one.
    estimatedDuration: { type: "string" },
  },
  required: [
    "trend",
    "structure",
    "keyObservation",
    "tradeIdea",
    "entry",
    "stopLoss",
    "initialTakeProfit",
    "finalTakeProfit",
    "riskRewardRatio",
    "strength",
    "estimatedDuration",
  ],
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

Also populate the following fields for the dashboard's nine result cards:

TRADE IDEA
Choose exactly one of:
- Buy
- Sell
- Wait
- No clear setup

Treat this as an educational description of a possible scenario,
not a personalized trading recommendation.
Use Buy or Sell only when the visible chart provides meaningful
evidence for a hypothetical scenario.
Use Wait when a potentially relevant setup needs confirmation.
Use No clear setup when the chart does not support a meaningful
scenario.

ENTRY
Provide a price only when a defensible hypothetical entry level
can be identified from visible chart evidence.
Otherwise return "Not available".

STOP LOSS
Provide a hypothetical invalidation level only when the chart
supports one and the required assumptions are clear.
Otherwise return "Not available".

INITIAL TAKE PROFIT
Provide a hypothetical target only when the visible chart supports
a defensible level.
Otherwise return "Not available".

FINAL TAKE PROFIT
Provide a second hypothetical target only when the chart supports
one.
Otherwise return "Not available".

RISK/REWARD RATIO
Calculate a ratio only when the entry, stop-loss, and target values
are available, use compatible price units, and form a coherent
hypothetical scenario.
Otherwise return "Not available".
Never invent a ratio to fill the card.

STRENGTH
Choose exactly one of:
- Strong
- Moderate
- Weak
- Unclear

Describe the strength of the visible chart evidence, not the
probability of making a profit.
Strong means several clear observations support the interpretation.
Moderate means some supporting evidence exists but uncertainty
remains.
Weak means the evidence is limited.
Unclear means the chart cannot support a reliable assessment.

ESTIMATED DURATION
Provide an estimated duration only when there is sufficient
visible historical context and a clearly stated basis for the
estimate.
Otherwise return "Not available".
Never present an estimated duration as a guarantee.

PRICE CONSISTENCY
- Never invent exact prices or claim unreadable values are visible.
- Do not use entry, stop-loss, or target values merely because the
  dashboard has cards that need to be filled.
- Keep all hypothetical levels consistent with the same scenario.
- If the chart is too unclear to support these values, use
  "Not available".

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

    // Confirm that all essential report sections and dashboard card
// fields exist before sending the analysis to the frontend.
if (
  !analysis.chartIdentity ||
  !analysis.snapshot ||
  typeof analysis.snapshot.trend !== "string" ||
  typeof analysis.snapshot.structure !== "string" ||
  typeof analysis.snapshot.keyObservation !== "string" ||
  typeof analysis.snapshot.tradeIdea !== "string" ||
  typeof analysis.snapshot.entry !== "string" ||
  typeof analysis.snapshot.stopLoss !== "string" ||
  typeof analysis.snapshot.initialTakeProfit !== "string" ||
  typeof analysis.snapshot.finalTakeProfit !== "string" ||
  typeof analysis.snapshot.riskRewardRatio !== "string" ||
  typeof analysis.snapshot.strength !== "string" ||
  typeof analysis.snapshot.estimatedDuration !== "string" ||
  typeof analysis.trendAndStructure !== "string" ||
  !Array.isArray(analysis.priceZones) ||
  !Array.isArray(analysis.patternsAndObservations) ||
  !Array.isArray(analysis.limitations)
) {
  console.error("Gemini returned an incomplete analysis.");

  return NextResponse.json(
    {
      error: "The AI returned an incomplete report. Please try again.",
    },
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