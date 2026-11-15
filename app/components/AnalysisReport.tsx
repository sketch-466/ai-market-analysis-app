"use client";

import { useState } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Check,
  ChevronDown,
  Clock3,
  Copy,
  Crosshair,
  DollarSign,
  Flag,
  Gauge,
  Lightbulb,
  Minus,
  Scale,
  ShieldCheck,
  Target,
  Timer,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types (self-contained copies of the API response shapes)
// ---------------------------------------------------------------------------

type ChartIdentity = {
  selectedInstrument: string;
  detectedInstrument: string;
  instrumentMismatch: boolean;
  selectedTimeframe: string;
  detectedTimeframe: string;
  timeframeMismatch: boolean;
  identityNotes: string;
};

type MarketSnapshot = {
  trend: string;
  structure: string;
  keyObservation: string;
  tradeIdea: "Buy" | "Sell" | "Wait" | "No clear setup";
  entry: string;
  stopLoss: string;
  initialTakeProfit: string;
  finalTakeProfit: string;
  riskRewardRatio: string;
  strength: "Strong" | "Moderate" | "Weak" | "Unclear";
  estimatedDuration: string;
};

type PriceZone = {
  type: string;
  range: string;
  reason: string;
};

type ChartObservation = {
  observation: string;
  interpretation: string;
  confirmationNeeded: string;
};

type ChartAnalysis = {
  chartIdentity: ChartIdentity;
  snapshot: MarketSnapshot;
  trendAndStructure: string;
  priceZones: PriceZone[];
  patternsAndObservations: ChartObservation[];
  limitations: string[];
};

type Verification = {
  verdict: "verified" | "issues_found";
  checks: Array<{ check: string; passed: boolean; detail: string }>;
  issues: string[];
  correctedLevels: {
    entry: string;
    stopLoss: string;
    initialTakeProfit: string;
    finalTakeProfit: string;
    riskRewardRatio: string;
  } | null;
};

type AnalysisReportProps = {
  analysis: ChartAnalysis;
  verification?: Verification | null;
  pair: string;
  timeframe: string;
};

// ---------------------------------------------------------------------------
// Position-management tips, shown one at a time in the yellow banner.
// ---------------------------------------------------------------------------

const tradingTips = [
  "Always close 50% of your overall position at the initial take profit level. This counts as a win.",
  "Never move your stop loss further from entry. Moving it to breakeven after initial TP is fine.",
  "If price reaches your entry and momentum stalls, consider exiting early instead of hoping.",
  "Risk a fixed small percentage per trade. Survival matters more than any single conviction.",
];

// Map the selected timeframe to a trading-style label for the BIAS chip,
// mirroring FxLens's Scalp / Intraday / Swing chips.
function timeframeToBias(timeframe: string) {
  const scalping = ["1m", "5m", "15m"];
  const intraday = ["30m", "1H", "4H"];

  if (scalping.includes(timeframe)) return "Scalp";
  if (intraday.includes(timeframe)) return "Intraday";
  return "Swing";
}

// ---------------------------------------------------------------------------
// Small building blocks
// ---------------------------------------------------------------------------

function MetaChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-[96px] flex-1 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
        {label}
      </p>
      <p className="mt-1 truncate text-sm font-bold text-slate-900">{value}</p>
    </div>
  );
}

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    if (!value || value === "Not available") return;

    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard unavailable (e.g. insecure context): do nothing.
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      aria-label={`Copy ${value}`}
      className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
    >
      {copied ? (
        <Check size={15} className="text-emerald-500" />
      ) : (
        <Copy size={15} />
      )}
    </button>
  );
}

type SnapshotCardProps = {
  label: string;
  value: string;
  icon: React.ReactNode;
  tint: string;
  large?: boolean;
};

function SnapshotCard({ label, value, icon, tint, large }: SnapshotCardProps) {
  return (
    <div
      className={`relative rounded-2xl border p-4 shadow-sm ${tint} ${
        large ? "col-span-2" : ""
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="text-slate-500">{icon}</span>
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-600">
            {label}
          </p>
        </div>

        <CopyButton value={value} />
      </div>

      <p
        className={`mt-2 break-words font-extrabold tracking-tight text-slate-900 ${
          large ? "text-3xl" : "text-xl"
        }`}
      >
        {value || "Not available"}
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Collapsible detail sections (light-styled to match the new report)
// ---------------------------------------------------------------------------

function DetailSection({
  id,
  title,
  subtitle,
  count,
  expanded,
  onToggle,
  children,
}: {
  id: string;
  title: string;
  subtitle: string;
  count?: number;
  expanded: boolean;
  onToggle: (id: string) => void;
  children: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <button
        type="button"
        onClick={() => onToggle(id)}
        aria-expanded={expanded}
        className="flex w-full items-center justify-between gap-3 p-4 text-left transition hover:bg-slate-50"
      >
        <div>
          <h4 className="font-semibold text-slate-900">{title}</h4>
          <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>
        </div>

        <div className="flex items-center gap-2">
          {typeof count === "number" && (
            <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-xs text-slate-500">
              {count}
            </span>
          )}
          <ChevronDown
            size={17}
            className={`shrink-0 text-slate-400 transition-transform ${
              expanded ? "rotate-180" : ""
            }`}
          />
        </div>
      </button>

      {expanded && (
        <div className="border-t border-slate-100 p-4">{children}</div>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Main report component
// ---------------------------------------------------------------------------

export default function AnalysisReport({
  analysis,
  verification = null,
  pair,
  timeframe,
}: AnalysisReportProps) {
  const [expandedCards, setExpandedCards] = useState<string[]>([]);

  function toggleCard(cardId: string) {
    setExpandedCards((current) =>
      current.includes(cardId)
        ? current.filter((id) => id !== cardId)
        : [...current, cardId]
    );
  }

  const snapshot = analysis.snapshot;
  const identity = analysis.chartIdentity;
  const now = new Date();

  const detectedPair =
    identity.detectedInstrument &&
    identity.detectedInstrument !== "Unclear"
      ? identity.detectedInstrument
      : pair;

  const trendLower = snapshot.trend.toLowerCase();
  const isBullish = trendLower.includes("bullish");
  const isBearish = trendLower.includes("bearish");

  const TrendIcon = isBullish
    ? TrendingUp
    : isBearish
      ? TrendingDown
      : Minus;

  const ideaLower = snapshot.tradeIdea.toLowerCase();
  const IdeaIcon =
    ideaLower === "buy"
      ? ArrowUpRight
      : ideaLower === "sell"
        ? ArrowDownRight
        : Clock3;

  // Pick one tip per calendar day so the banner is stable within a day.
  const tip = tradingTips[now.getDate() % tradingTips.length];

  const showMismatch =
    identity.instrumentMismatch || identity.timeframeMismatch;

  return (
    <div className="min-w-0 rounded-2xl border border-slate-200 bg-[#F6F8FA] text-slate-900 shadow-sm">
      <div className="min-w-0 p-4 sm:p-5">
        {/* Meta chips: pair / bias / time / date */}
        <div className="flex flex-wrap gap-2">
          <MetaChip label="Pair" value={detectedPair} />
          <MetaChip label="Bias" value={timeframeToBias(timeframe)} />
          <MetaChip
            label="Time"
            value={now.toLocaleTimeString([], {
              hour: "numeric",
              minute: "2-digit",
            })}
          />
          <MetaChip
            label="Date"
            value={now.toLocaleDateString([], {
              weekday: "short",
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          />
        </div>

        {/* Verification badge (subtle, next to the chips) */}
        {verification && (
          <div className="mt-3 flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold ${
                verification.verdict === "verified"
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-amber-100 text-amber-700"
              }`}
            >
              <ShieldCheck size={13} />
              {verification.verdict === "verified"
                ? "Verified"
                : "Needs review"}
            </span>

            {verification.verdict === "issues_found" &&
              verification.issues.length > 0 && (
                <span className="text-xs text-amber-700">
                  {verification.issues[0]}
                </span>
              )}
          </div>
        )}

        {/* Yellow position-management tip */}
        <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <AlertTriangle size={16} className="mt-0.5 shrink-0 text-amber-500" />
          <p className="text-sm leading-6 text-amber-900">{tip}</p>
        </div>

        {/* Chart settings mismatch warning */}
        {showMismatch && (
          <div className="mt-3 flex items-start gap-2.5 rounded-xl border border-amber-300 bg-amber-100 px-4 py-3">
            <AlertTriangle size={16} className="mt-0.5 shrink-0 text-amber-600" />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-amber-900">
                Chart settings mismatch
              </p>
              <p className="mt-1 text-xs leading-5 text-amber-800">
                Selected {identity.selectedInstrument} · {identity.selectedTimeframe};
                visible {identity.detectedInstrument} · {identity.detectedTimeframe}.
                {identity.identityNotes && identity.identityNotes !== "None" &&
                  ` ${identity.identityNotes}`}
              </p>
            </div>
          </div>
        )}

        {/* Snapshot header */}
        <h4 className="mt-6 text-center text-xs font-bold uppercase tracking-[0.3em] text-slate-500">
          Snapshot
        </h4>

        {/* Snapshot card grid — mirrors the FxLens layout */}
        <div className="mt-4 grid grid-cols-2 gap-3">
          <SnapshotCard
            label="Trend"
            value={snapshot.trend}
            icon={<TrendIcon size={16} />}
            tint="bg-emerald-50 border-emerald-200"
          />

          <SnapshotCard
            label="Trade Idea"
            value={snapshot.tradeIdea}
            icon={<IdeaIcon size={16} />}
            tint="bg-sky-50 border-sky-200"
          />

          <SnapshotCard
            label="Entry"
            value={snapshot.entry}
            icon={<Crosshair size={16} />}
            tint="bg-orange-50 border-orange-200"
            large
          />

          <SnapshotCard
            label="SL"
            value={snapshot.stopLoss}
            icon={<ShieldCheck size={16} />}
            tint="bg-rose-50 border-rose-200"
          />

          <SnapshotCard
            label="Initial TP"
            value={snapshot.initialTakeProfit}
            icon={<DollarSign size={16} />}
            tint="bg-blue-50 border-blue-200"
          />

          <SnapshotCard
            label="Final TP"
            value={snapshot.finalTakeProfit}
            icon={<Flag size={16} />}
            tint="bg-violet-50 border-violet-200"
          />

          <SnapshotCard
            label="RR Ratio"
            value={snapshot.riskRewardRatio}
            icon={<Scale size={16} />}
            tint="bg-amber-50 border-amber-200"
          />

          <SnapshotCard
            label="Strength"
            value={snapshot.strength}
            icon={<Gauge size={16} />}
            tint="bg-teal-50 border-teal-200"
          />

          <SnapshotCard
            label="Estimate"
            value={snapshot.estimatedDuration}
            icon={<Timer size={16} />}
            tint="bg-slate-100 border-slate-200"
          />
        </div>

        {/* Detail sections below the snapshot */}
        <div className="mt-4 space-y-3">
          <DetailSection
            id="trend-details"
            title="Trend and structure details"
            subtitle="The AI's explanation of visible price movement"
            expanded={expandedCards.includes("trend-details")}
            onToggle={toggleCard}
          >
            <p className="whitespace-pre-wrap break-words text-sm leading-6 text-slate-700">
              {analysis.trendAndStructure}
            </p>
          </DetailSection>

          <DetailSection
            id="price-zones"
            title="Key price zones"
            subtitle="Potential support and resistance areas"
            count={analysis.priceZones.length}
            expanded={expandedCards.includes("price-zones")}
            onToggle={toggleCard}
          >
            {analysis.priceZones.length > 0 ? (
              <div className="space-y-2.5">
                {analysis.priceZones.map((zone, index) => (
                  <div
                    key={`${zone.type}-${zone.range}-${index}`}
                    className="rounded-xl border border-slate-200 bg-slate-50 p-3.5"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${
                          zone.type.toLowerCase() === "support"
                            ? "bg-emerald-100 text-emerald-700"
                            : zone.type.toLowerCase() === "resistance"
                              ? "bg-rose-100 text-rose-700"
                              : "bg-slate-200 text-slate-600"
                        }`}
                      >
                        {zone.type}
                      </span>
                      <span className="break-words text-sm font-semibold text-slate-900">
                        {zone.range}
                      </span>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      {zone.reason}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm leading-6 text-slate-500">
                No reliable price zones could be identified from this image.
              </p>
            )}
          </DetailSection>

          <DetailSection
            id="patterns"
            title="Patterns and observations"
            subtitle="Visible chart features and possible interpretations"
            count={analysis.patternsAndObservations.length}
            expanded={expandedCards.includes("patterns")}
            onToggle={toggleCard}
          >
            {analysis.patternsAndObservations.length > 0 ? (
              <div className="space-y-2.5">
                {analysis.patternsAndObservations.map((item, index) => (
                  <div
                    key={`${item.observation}-${index}`}
                    className="rounded-xl border border-slate-200 bg-slate-50 p-3.5"
                  >
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-600">
                      Observed
                    </p>
                    <p className="mt-1.5 text-sm leading-6 text-slate-800">
                      {item.observation}
                    </p>

                    <p className="mt-3 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                      Possible interpretation
                    </p>
                    <p className="mt-1.5 text-sm leading-6 text-slate-700">
                      {item.interpretation}
                    </p>

                    {item.confirmationNeeded && item.confirmationNeeded !== "None" && (
                      <>
                        <p className="mt-3 text-[10px] font-semibold uppercase tracking-wider text-amber-600">
                          Uncertainty
                        </p>
                        <p className="mt-1.5 text-sm leading-6 text-slate-600">
                          {item.confirmationNeeded}
                        </p>
                      </>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm leading-6 text-slate-500">
                No clear patterns or notable observations were identified.
              </p>
            )}
          </DetailSection>

          <DetailSection
            id="limitations"
            title="Limitations"
            subtitle="Important uncertainties and analysis constraints"
            count={analysis.limitations.length}
            expanded={expandedCards.includes("limitations")}
            onToggle={toggleCard}
          >
            {analysis.limitations.length > 0 ? (
              <ul className="space-y-2">
                {analysis.limitations.map((limitation, index) => (
                  <li
                    key={`${limitation}-${index}`}
                    className="flex items-start gap-2 text-sm leading-6 text-slate-600"
                  >
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />
                    <span className="break-words">{limitation}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm leading-6 text-slate-500">
                No additional limitations were reported. The screenshot may
                still omit relevant market context.
              </p>
            )}
          </DetailSection>

          {/* Verification issues detail (only when the audit flagged problems) */}
          {verification &&
            verification.verdict === "issues_found" &&
            verification.issues.length > 0 && (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                <h4 className="font-semibold text-amber-900">
                  Verification notes
                </h4>
                <ul className="mt-2 space-y-1.5">
                  {verification.issues.map((issue, index) => (
                    <li
                      key={`${issue}-${index}`}
                      className="text-sm leading-6 text-amber-800"
                    >
                      {issue}
                    </li>
                  ))}
                </ul>
                {verification.correctedLevels && (
                  <p className="mt-3 text-xs font-medium text-amber-800">
                    Corrected R:R: {verification.correctedLevels.riskRewardRatio}
                  </p>
                )}
              </div>
            )}

          {/* Disclaimer */}
          <div className="flex items-start gap-2 rounded-2xl border border-slate-200 bg-white p-4">
            <ShieldCheck size={15} className="mt-0.5 shrink-0 text-emerald-600" />
            <p className="text-xs leading-5 text-slate-500">
              This report describes visible chart information and possible
              interpretations. AI can misread screenshots, and the report
              cannot guarantee future price movements.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
