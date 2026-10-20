"use client";

import { useRef, useState } from "react";
import type { ChangeEvent, ReactNode } from "react";
import {
  Activity,
  ArrowUpRight,
  BarChart3,
  Clock3,
  FileImage,
  History,
  LayoutDashboard,
  Loader2,
  Settings,
  ShieldCheck,
  Sparkles,
  Upload,
  X,
} from "lucide-react";

// Describes the instrument and timeframe visible in the uploaded chart.
type ChartIdentity = {
  selectedInstrument: string;
  detectedInstrument: string;
  instrumentMismatch: boolean;
  selectedTimeframe: string;
  detectedTimeframe: string;
  timeframeMismatch: boolean;
  identityNotes: string;
};

// The short summary displayed at the top of the report.
type MarketSnapshot = {
  trend: string;
  structure: string;
  keyObservation: string;
};

// A potential support or resistance area.
type PriceZone = {
  type: string;
  range: string;
  reason: string;
};

// An observable chart feature and its possible interpretation.
type ChartObservation = {
  observation: string;
  interpretation: string;
  confirmationNeeded: string;
};

// The complete structured response from the analysis API.
type ChartAnalysis = {
  chartIdentity: ChartIdentity;
  snapshot: MarketSnapshot;
  trendAndStructure: string;
  priceZones: PriceZone[];
  patternsAndObservations: ChartObservation[];
  limitations: string[];
};

// The instruments and timeframes available in our analysis workspace.
const instruments = [
  "EUR/USD",
  "GBP/USD",
  "USD/JPY",
  "AUD/USD",
  "NZD/USD",
  "XAU/USD",
  "BTC/USD",
];

const timeframes = [
  "1m",
  "5m",
  "15m",
  "30m",
  "1H",
  "4H",
  "1D",
  "1W",
];

// Navigation items displayed in the sidebar.
const navigation = [
  { label: "Dashboard", icon: LayoutDashboard },
  { label: "New Analysis", icon: BarChart3 },
  { label: "History", icon: History },
  { label: "Settings", icon: Settings },
];

// Information about a previous analysis.
// These are placeholders until we connect a real database.
const recentAnalyses = [
  {
    pair: "EUR/USD",
    timeframe: "4H",
    status: "Completed",
    date: "Example entry",
  },
  {
    pair: "GBP/USD",
    timeframe: "1H",
    status: "Completed",
    date: "Example entry",
  },
];

// Reusable card for displaying one piece of analysis.
function AnalysisCard({
  label,
  value,
  description,
}: {
  label: string;
  value: string;
  description?: string;
}) {
  return (
    <div className="min-w-0 rounded-xl border border-white/[0.07] bg-black/20 p-4">
      <p className="text-xs font-medium text-zinc-500">{label}</p>

      <p className="mt-2 break-words text-base font-semibold text-zinc-100">
        {value}
      </p>

      {description && (
        <p className="mt-2 break-words text-xs leading-5 text-zinc-400">
          {description}
        </p>
      )}
    </div>
  );
}

export default function Home() {
  // Keep track of the selected instrument and timeframe.
  const [instrument, setInstrument] = useState("EUR/USD");
  const [timeframe, setTimeframe] = useState("4H");

  // Store the selected chart image and its temporary preview URL.
  // Store the selected chart image and its temporary preview URL.
const [chartFile, setChartFile] = useState<File | null>(null);
const [previewUrl, setPreviewUrl] = useState<string | null>(null);

// Track whether Gemini is currently analyzing the chart.
const [isAnalyzing, setIsAnalyzing] = useState(false);

// Store the structured analysis returned by our API.
const [analysis, setAnalysis] = useState<ChartAnalysis | null>(null);

// Store a user-friendly error if analysis fails.
const [analysisError, setAnalysisError] = useState<string | null>(null);


  // Reference the hidden file input so our custom upload button can open it.
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Accept an image selected by the user.
  function handleImageSelect(
    event: ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0];

    // Do nothing if the user cancels the file picker.
    if (!file) return;

    // Only accept image files.
    if (!file.type.startsWith("image/")) {
      alert("Please select a valid image file.");
      event.target.value = "";
      return;
    }

    // Prevent excessively large uploads on mobile connections.
    if (file.size > 10 * 1024 * 1024) {
      alert("Please select an image smaller than 10 MB.");
      event.target.value = "";
      return;
    }

    // Release the previous preview URL to avoid wasting memory.
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    // Save the image and generate a local preview.
    setChartFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  }

  // Remove the selected image and clear the file picker.
  function removeImage() {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    setChartFile(null);
    setPreviewUrl(null);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  // Send the selected chart to our server-side Gemini endpoint.
// Send the chart to Gemini and validate the structured response.
async function handleAnalyze() {
  if (!chartFile) {
    setAnalysisError("Please upload a chart image first.");
    setAnalysis(null);
    return;
  }
  
  setAnalysis(null);
  setAnalysisError(null);
  setIsAnalyzing(true);
  
  try {
    // Send the image and selected settings to our API.
    const formData = new FormData();
    
    formData.append("chart", chartFile);
    formData.append("instrument", instrument);
    formData.append("timeframe", timeframe);
    
    const response = await fetch("/api/analyze", {
      method: "POST",
      body: formData,
    });
    
    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(
        result.error || "Unable to analyze this chart. Please try again."
      );
    }
    
    // Make sure the API returned all the main report sections.
    const report = result.analysis;
    
    if (
      !report ||
      !report.chartIdentity ||
      !report.snapshot ||
      typeof report.trendAndStructure !== "string" ||
      !Array.isArray(report.priceZones) ||
      !Array.isArray(report.patternsAndObservations) ||
      !Array.isArray(report.limitations)
    ) {
      throw new Error(
        "The AI returned an incomplete report. Please try again."
      );
    }
    
    setAnalysis(report as ChartAnalysis);
  } catch (error) {
    console.error("Chart analysis request failed:", error);
    
    setAnalysisError(
      error instanceof Error ?
      error.message :
      "Something went wrong. Please try again."
    );
  } finally {
    setIsAnalyzing(false);
  }
}

  return (
    <main className="min-h-screen bg-[#080B0A] text-zinc-100">
      <div className="flex min-h-screen">
        {/* Sidebar: primary application navigation */}
        <aside className="hidden w-64 shrink-0 border-r border-white/[0.06] bg-[#0B0F0D] p-5 lg:flex lg:flex-col">
          <div className="flex items-center gap-3 px-2 py-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-400 text-black">
              <Activity size={22} />
            </div>

            <div>
              <h1 className="text-lg font-bold tracking-tight">
                FX<span className="text-emerald-400">Lens</span>
              </h1>
              <p className="text-xs text-zinc-500">
                AI Analysis Workspace
              </p>
            </div>
          </div>

          <div className="mt-10">
            <p className="mb-3 px-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-600">
              Workspace
            </p>

            <nav className="space-y-1">
              {navigation.map((item, index) => {
                const Icon = item.icon;
                const active = index === 0;

                return (
                  <button
                    key={item.label}
                    type="button"
                    className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm transition ${
                      active
                        ? "border border-emerald-400/10 bg-emerald-400/10 text-emerald-300"
                        : "text-zinc-500 hover:bg-white/[0.04] hover:text-zinc-200"
                    }`}
                  >
                    <Icon size={18} />
                    {item.label}
                  </button>
                );
              })}
            </nav>
          </div>

          <div className="mt-auto rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
            <div className="mb-3 flex items-center gap-2 text-emerald-300">
              <ShieldCheck size={17} />
              <span className="text-xs font-semibold">
                Analysis transparency
              </span>
            </div>

            <p className="text-xs leading-5 text-zinc-500">
              AI observations are estimates, not guarantees. Always verify
              information against reliable sources.
            </p>
          </div>
        </aside>

        {/* Main workspace */}
        <div className="min-w-0 flex-1">
          {/* Top bar */}
          <header className="flex h-[72px] items-center justify-between border-b border-white/[0.06] px-5 sm:px-8">
            <div>
              <p className="text-xs text-zinc-500">
                Workspace / Dashboard
              </p>
              <p className="mt-1 text-sm font-medium text-zinc-200">
                Market intelligence
              </p>
            </div>

            <div className="flex items-center gap-3">
              <StatusBadge>Workspace ready</StatusBadge>

              <div className="hidden h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] sm:flex">
                <Settings size={16} className="text-zinc-400" />
              </div>
            </div>
          </header>

          <div className="mx-auto max-w-7xl p-5 sm:p-8">
            {/* Dashboard introduction */}
            <section className="mb-8 flex flex-col justify-between gap-5 md:flex-row md:items-end">
              <div>
                <div className="mb-3 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.18em] text-emerald-400">
                  <Sparkles size={14} />
                  AI-powered workspace
                </div>

                <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                  Understand the chart.
                  <br />
                  <span className="text-zinc-500">
                    Explore the bigger picture.
                  </span>
                </h2>

                <p className="mt-4 max-w-xl text-sm leading-6 text-zinc-400">
                  Upload a market chart to begin an AI-assisted analysis
                  of visible price action, potential patterns, and market
                  structure.
                </p>
              </div>

              <div className="flex items-center gap-2 text-xs text-zinc-500">
                <ShieldCheck size={15} />
                <span>Educational analysis · No guaranteed predictions</span>
              </div>
            </section>

            {/* Summary cards */}
            <section className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              <div className="rounded-2xl border border-white/[0.07] bg-[#0D1210] p-5">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-zinc-400">
                    Analysis workspace
                  </span>
                  <div className="rounded-lg bg-emerald-400/10 p-2 text-emerald-400">
                    <BarChart3 size={18} />
                  </div>
                </div>

                <p className="mt-5 text-2xl font-semibold">Ready</p>
                <p className="mt-2 text-xs text-zinc-500">
                  Upload a chart to get started
                </p>
              </div>

              <div className="rounded-2xl border border-white/[0.07] bg-[#0D1210] p-5">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-zinc-400">
                    Saved analyses
                  </span>
                  <div className="rounded-lg bg-blue-400/10 p-2 text-blue-300">
                    <History size={18} />
                  </div>
                </div>

                <p className="mt-5 text-2xl font-semibold">0</p>
                <p className="mt-2 text-xs text-zinc-500">
                  Your saved reports will appear here
                </p>
              </div>

              <div className="rounded-2xl border border-white/[0.07] bg-[#0D1210] p-5 sm:col-span-2 xl:col-span-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-zinc-400">
                    Analysis engine
                  </span>
                  <div className="rounded-lg bg-purple-400/10 p-2 text-purple-300">
                    <Sparkles size={18} />
                  </div>
                </div>

                <p className="mt-5 text-2xl font-semibold">
                  <span className="text-amber-300">connected</span>
                </p>
                <p className="mt-2 text-xs text-zinc-500">
                  Gemini analysis endpoint configured
                </p>
              </div>
            </section>

            {/* Main analysis workspace */}
            <section
              id="new-analysis"
              className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(300px,0.8fr)]"
            >
              {/* Chart upload panel */}
              <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0D1210]">
                <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-4 sm:px-6">
                  <div>
                    <h3 className="font-semibold">New analysis</h3>
                    <p className="mt-1 text-xs text-zinc-500">
                      Upload a chart screenshot
                    </p>
                  </div>

                  <span className="rounded-lg border border-white/[0.08] px-2.5 py-1 text-[10px] text-zinc-500">
                    IMAGE INPUT
                  </span>
                </div>

                <div className="p-5 sm:p-6">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageSelect}
                    className="hidden"
                  />

                  {previewUrl ? (
                    /* Display the selected chart before analysis */
                    <div className="relative overflow-hidden rounded-xl border border-emerald-400/20 bg-black">
                      <img
                        src={previewUrl}
                        alt="Selected chart preview"
                        className="max-h-[420px] w-full object-contain"
                      />

                      <button
                        type="button"
                        onClick={removeImage}
                        aria-label="Remove selected chart"
                        className="absolute right-3 top-3 rounded-lg border border-white/10 bg-black/80 p-2 text-white hover:bg-black"
                      >
                        <X size={17} />
                      </button>

                      <div className="border-t border-white/[0.08] bg-[#101512] p-3">
                        <p className="truncate text-sm text-zinc-200">
                          {chartFile?.name}
                        </p>
                        <p className="mt-1 text-xs text-zinc-500">
                          {chartFile
                            ? `${(chartFile.size / 1024 / 1024).toFixed(2)} MB`
                            : ""}
                        </p>
                      </div>
                    </div>
                  ) : (
                    /* Upload area shown before a chart is selected */
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="group flex min-h-[280px] w-full flex-col items-center justify-center rounded-xl border border-dashed border-zinc-700 bg-black/20 px-5 py-10 text-center transition hover:border-emerald-400/50 hover:bg-emerald-400/[0.03] sm:min-h-[340px]"
                    >
                      <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-emerald-400/20 bg-emerald-400/[0.07] text-emerald-400 transition group-hover:scale-105">
                        <Upload size={27} />
                      </div>

                      <p className="font-medium text-zinc-200">
                        Drop your chart into the workspace
                      </p>

                      <p className="mt-2 max-w-xs text-sm leading-6 text-zinc-500">
                        Or tap below to select an image from your device.
                      </p>

                      <span className="mt-6 inline-flex items-center gap-2 rounded-xl bg-emerald-400 px-5 py-3 text-sm font-semibold text-black transition group-hover:bg-emerald-300">
                        <FileImage size={17} />
                        Choose chart image
                      </span>

                      <p className="mt-4 text-[11px] text-zinc-600">
                        Images only · Maximum size 10 MB
                      </p>
                    </button>
                  )}

                  {/* Analysis controls */}
                  <div className="mt-6 grid gap-4 sm:grid-cols-2">
                    <div>
                      <label
                        htmlFor="instrument"
                        className="mb-2 block text-xs font-medium text-zinc-400"
                      >
                        Instrument
                      </label>

                      <select
                        id="instrument"
                        value={instrument}
                        onChange={(event) => setInstrument(event.target.value)}
                        className="w-full rounded-xl border border-white/[0.09] bg-[#080B0A] px-4 py-3 text-sm text-zinc-200 outline-none focus:border-emerald-400/60"
                      >
                        {instruments.map((item) => (
                          <option key={item} value={item}>
                            {item}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label
                        htmlFor="timeframe"
                        className="mb-2 block text-xs font-medium text-zinc-400"
                      >
                        Chart timeframe
                      </label>

                      <select
                        id="timeframe"
                        value={timeframe}
                        onChange={(event) => setTimeframe(event.target.value)}
                        className="w-full rounded-xl border border-white/[0.09] bg-[#080B0A] px-4 py-3 text-sm text-zinc-200 outline-none focus:border-emerald-400/60"
                      >
                        {timeframes.map((item) => (
                          <option key={item} value={item}>
                            {item}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleAnalyze}
                    disabled={isAnalyzing}
                    className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-400 px-5 py-4 text-sm font-semibold text-black transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isAnalyzing ? (
                      <Loader2 size={18} className="animate-spin" />
                    ) : (
                      <Sparkles size={18} />
                    )}

                    {isAnalyzing ? "Analyzing chart..." : "Analyze chart"}
                    {!isAnalyzing && <ArrowUpRight size={17} />}
                  </button>

                  <p className="mt-3 text-center text-[11px] leading-5 text-zinc-600">
                    AI-generated observations may be inaccurate and should
                    be independently verified.
                  </p>
                </div>
              </div>

              {/* Results panel: shows loading, errors, or structured analysis. */}
<div className="min-w-0 rounded-2xl border border-white/[0.08] bg-[#0D1210]">
  {/* Report header */}
  <div className="border-b border-white/[0.06] px-5 py-4">
    <div className="flex items-center gap-2">
      <Sparkles size={17} className="text-emerald-400" />

      <h3 className="font-semibold">Analysis report</h3>
    </div>

    <p className="mt-1 text-xs text-zinc-500">
      Structured observations from your uploaded chart.
    </p>
  </div>

  <div className="min-w-0 p-5 sm:p-6">
    {isAnalyzing ? (
      // Loading state.
      <div className="flex min-h-[290px] flex-col items-center justify-center text-center">
        <Loader2 size={32} className="animate-spin text-emerald-400" />

        <h4 className="mt-5 font-medium text-zinc-200">
          Analyzing your chart
        </h4>

        <p className="mt-2 max-w-xs text-sm leading-6 text-zinc-500">
          Examining visible price action, chart structure, and potential
          price zones.
        </p>
      </div>
    ) : analysisError ? (
      // Error state.
      <div className="flex min-h-[290px] flex-col items-center justify-center text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-red-400/20 bg-red-400/10 text-red-300">
          <X size={24} />
        </div>

        <h4 className="mt-5 font-medium text-zinc-200">
          Analysis unsuccessful
        </h4>

        <p
          role="alert"
          className="mt-2 max-w-sm text-sm leading-6 text-red-300"
        >
          {analysisError}
        </p>

        <button
          type="button"
          onClick={handleAnalyze}
          disabled={!chartFile}
          className="mt-5 rounded-xl border border-white/10 px-4 py-2.5 text-sm text-zinc-200 transition hover:bg-white/[0.05] disabled:opacity-40"
        >
          Try again
        </button>
      </div>
    ) : analysis ? (
      // Structured analysis report.
      <div className="space-y-6">
        {/* Instrument and timeframe mismatch warning. */}
        {(analysis.chartIdentity.instrumentMismatch ||
          analysis.chartIdentity.timeframeMismatch) && (
          <div
            role="alert"
            className="rounded-xl border border-amber-400/20 bg-amber-400/[0.06] p-4"
          >
            <div className="flex items-start gap-3">
              <ShieldCheck
                size={19}
                className="mt-0.5 shrink-0 text-amber-300"
              />

              <div className="min-w-0">
                <h4 className="font-semibold text-amber-200">
                  Chart settings mismatch
                </h4>

                <p className="mt-2 text-sm leading-6 text-zinc-300">
                  The visible chart information may differ from your
                  selected settings.
                </p>

                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-lg bg-black/20 p-3">
                    <p className="text-xs text-zinc-500">
                      Selected instrument
                    </p>

                    <p className="mt-1 break-words text-sm font-medium text-zinc-200">
                      {analysis.chartIdentity.selectedInstrument}
                    </p>

                    <p className="mt-2 text-xs text-zinc-500">
                      Visible instrument
                    </p>

                    <p className="mt-1 break-words text-sm font-medium text-zinc-200">
                      {analysis.chartIdentity.detectedInstrument}
                    </p>
                  </div>

                  <div className="rounded-lg bg-black/20 p-3">
                    <p className="text-xs text-zinc-500">
                      Selected timeframe
                    </p>

                    <p className="mt-1 text-sm font-medium text-zinc-200">
                      {analysis.chartIdentity.selectedTimeframe}
                    </p>

                    <p className="mt-2 text-xs text-zinc-500">
                      Visible timeframe
                    </p>

                    <p className="mt-1 text-sm font-medium text-zinc-200">
                      {analysis.chartIdentity.detectedTimeframe}
                    </p>
                  </div>
                </div>

                {analysis.chartIdentity.identityNotes &&
                  analysis.chartIdentity.identityNotes !== "None" && (
                    <p className="mt-3 text-xs leading-5 text-amber-100/80">
                      {analysis.chartIdentity.identityNotes}
                    </p>
                  )}
              </div>
            </div>
          </div>
        )}

        {/* Market snapshot cards. */}
        <section>
          <div className="mb-3 flex items-center justify-between gap-3">
            <h4 className="font-semibold text-zinc-100">
              Market snapshot
            </h4>

            <span className="text-[10px] uppercase tracking-wider text-zinc-500">
              Overview
            </span>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <AnalysisCard
              label="Visible trend"
              value={analysis.snapshot.trend}
            />

            <AnalysisCard
              label="Market structure"
              value={analysis.snapshot.structure}
            />

            <div className="sm:col-span-2">
              <AnalysisCard
                label="Key observation"
                value={analysis.snapshot.keyObservation}
              />
            </div>
          </div>
        </section>

        {/* Detailed explanation of price movement. */}
        <section>
          <h4 className="mb-3 font-semibold text-zinc-100">
            Trend and structure
          </h4>

          <div className="rounded-xl border border-white/[0.07] bg-black/20 p-4">
            <p className="whitespace-pre-wrap break-words text-sm leading-6 text-zinc-300">
              {analysis.trendAndStructure}
            </p>
          </div>
        </section>

        {/* Potential support and resistance zones. */}
        <section>
          <h4 className="mb-3 font-semibold text-zinc-100">
            Key price zones
          </h4>

          {analysis.priceZones.length > 0 ? (
            <div className="space-y-3">
              {analysis.priceZones.map((zone, index) => (
                <div
                  key={`${zone.type}-${zone.range}-${index}`}
                  className="rounded-xl border border-white/[0.07] bg-black/20 p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span
                      className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${
                        zone.type.toLowerCase() === "support"
                          ? "bg-emerald-400/10 text-emerald-300"
                          : zone.type.toLowerCase() === "resistance"
                            ? "bg-rose-400/10 text-rose-300"
                            : "bg-zinc-400/10 text-zinc-300"
                      }`}
                    >
                      {zone.type}
                    </span>

                    <span className="break-words text-sm font-semibold text-zinc-100">
                      {zone.range}
                    </span>
                  </div>

                  <p className="mt-3 break-words text-sm leading-6 text-zinc-400">
                    {zone.reason}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="rounded-xl border border-white/[0.07] p-4 text-sm text-zinc-500">
              No reliable price zones could be identified from this image.
            </p>
          )}
        </section>

        {/* Observations and possible interpretations. */}
        <section>
          <h4 className="mb-3 font-semibold text-zinc-100">
            Patterns and observations
          </h4>

          {analysis.patternsAndObservations.length > 0 ? (
            <div className="space-y-3">
              {analysis.patternsAndObservations.map((item, index) => (
                <div
                  key={`${item.observation}-${index}`}
                  className="rounded-xl border border-white/[0.07] bg-black/20 p-4"
                >
                  <p className="text-xs font-semibold uppercase tracking-wider text-emerald-300">
                    Observed
                  </p>

                  <p className="mt-2 break-words text-sm leading-6 text-zinc-200">
                    {item.observation}
                  </p>

                  <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                    Possible interpretation
                  </p>

                  <p className="mt-2 break-words text-sm leading-6 text-zinc-300">
                    {item.interpretation}
                  </p>

                  {item.confirmationNeeded &&
                    item.confirmationNeeded !== "None" && (
                      <>
                        <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-amber-300">
                          Uncertainty
                        </p>

                        <p className="mt-2 break-words text-sm leading-6 text-zinc-400">
                          {item.confirmationNeeded}
                        </p>
                      </>
                    )}
                </div>
              ))}
            </div>
          ) : (
            <p className="rounded-xl border border-white/[0.07] p-4 text-sm text-zinc-500">
              No clear patterns or notable observations were identified.
            </p>
          )}
        </section>

        {/* Limitations and transparency. */}
        <section>
          <h4 className="mb-3 font-semibold text-zinc-100">
            Limitations
          </h4>

          <div className="rounded-xl border border-amber-400/10 bg-amber-400/[0.04] p-4">
            {analysis.limitations.length > 0 ? (
              <ul className="space-y-2">
                {analysis.limitations.map((limitation, index) => (
                  <li
                    key={`${limitation}-${index}`}
                    className="flex items-start gap-2 text-sm leading-6 text-zinc-400"
                  >
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-300" />
                    <span className="break-words">{limitation}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm leading-6 text-zinc-400">
                No additional limitations were reported. The screenshot
                may still omit relevant market context.
              </p>
            )}
          </div>
        </section>

        {/* Persistent educational disclaimer. */}
        <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-4">
          <div className="flex items-start gap-2">
            <ShieldCheck
              size={16}
              className="mt-0.5 shrink-0 text-emerald-300"
            />

            <p className="text-xs leading-5 text-zinc-400">
              This report describes visible chart information and possible
              interpretations. AI can misread screenshots, and the report
              cannot guarantee future price movements.
            </p>
          </div>
        </div>
      </div>
    ) : (
      // Empty state before the first analysis.
      <div className="flex min-h-[290px] flex-col items-center justify-center text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/[0.07] bg-white/[0.03] text-zinc-600">
          <BarChart3 size={25} />
        </div>

        <h4 className="mt-5 font-medium text-zinc-300">
          Your report starts here
        </h4>

        <p className="mt-2 max-w-xs text-sm leading-6 text-zinc-500">
          Upload a chart and start an analysis. Your structured report
          will appear here when processing is complete.
        </p>

        <div className="mt-6 flex items-center gap-2 rounded-lg border border-white/[0.06] px-3 py-2 text-xs text-zinc-500">
          <Clock3 size={14} />
          Awaiting chart submission
        </div>
      </div>
    )}
  </div>
</div>
            </section>

            {/* Recent analyses: sample entries until persistence is implemented */}
            <section className="mt-8 rounded-2xl border border-white/[0.08] bg-[#0D1210]">
              <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-4 sm:px-6">
                <div>
                  <h3 className="font-semibold">Recent analyses</h3>
                  <p className="mt-1 text-xs text-zinc-500">
                    Your analysis history will be available here.
                  </p>
                </div>

                <button
                  type="button"
                  className="flex items-center gap-2 text-xs text-zinc-400 transition hover:text-emerald-300"
                >
                  View history
                  <ArrowUpRight size={14} />
                </button>
              </div>

              <div className="divide-y divide-white/[0.05]">
                {recentAnalyses.map((item) => (
                  <div
                    key={`${item.pair}-${item.timeframe}`}
                    className="flex items-center justify-between gap-4 px-5 py-4 sm:px-6"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/[0.04] text-zinc-400">
                        <FileImage size={18} />
                      </div>

                      <div className="min-w-0">
                        <p className="text-sm font-medium">{item.pair}</p>
                        <p className="mt-1 text-xs text-zinc-500">
                          {item.timeframe} timeframe · {item.date}
                        </p>
                      </div>
                    </div>

                    <span className="shrink-0 rounded-full bg-emerald-400/10 px-3 py-1 text-[10px] text-emerald-300">
                      {item.status}
                    </span>
                  </div>
                ))}
              </div>

              <div className="border-t border-white/[0.05] px-5 py-3 sm:px-6">
                <p className="text-[11px] text-zinc-600">
                  Example entries only. Real history will be connected to
                  persistent storage later.
                </p>
              </div>
            </section>

            {/* Footer */}
            <footer className="flex flex-col gap-2 py-8 text-[11px] text-zinc-600 sm:flex-row sm:items-center sm:justify-between">
              <p>AI-assisted market analysis workspace</p>
              <p>Observations are informational, not guarantees.</p>
            </footer>
          </div>
        </div>
      </div>
    </main>
  );
}