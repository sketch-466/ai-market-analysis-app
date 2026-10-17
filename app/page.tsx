"use client";
import {useState}from "react";

type MarketCardProps = {
  pair : string;
  description : string;
};

const markets = [
  {
    pair :"EUR/USD",
  description: "EURO/US DOLLAR . sample data"},
  { 
    pair : "GBP/USD",
    description: "BRITISH POUNDS/US DOLLAR . sample data"
  },
  {
    pair :"USD/JPY",
    description: "US DOLLAR/ JAPANESE YEN . sample data"
  },
  {
    pair: "AUD/USD",
    description: "AUSTRALIAN DOLLAR/US DOLLAR . sample data"
  },
]

function MarketCard({ pair, description }: MarketCardProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left"
      >
        <h2 className="text-lg font-semibold text-white">
          {pair}
        </h2>

        <p className="mt-2 text-sm text-zinc-400">
          {description}
        </p>

        <p className="mt-3 text-xs text-emerald-400">
          {expanded ? "Hide details ▲" : "View details ▼"}
        </p>
      </button>

      {expanded && (
        <div className="mt-4 border-t border-zinc-700 pt-4">
          <p className="text-sm text-zinc-300">
            This is a sample information panel for {pair}.
          </p>
        </div>
      )}
    </div>
  );
}


export default function Home(){
  return(
    <main className =" min-h-screen bg-zinc-950 p-6 text-white">
      <header className = "max-auto max-w-4xl">
        <p className ="text-sm font-medium text-emerald-400">MARKET ANALYSIS</p>
        <h1 className ="mt-3 text-3xl font-bold">YOUR DASHBOARD</h1>
        <p className ="mt-2 text-400">Explore your market watchlist.</p>
      </header>
      
      <section className ="mx-auto mt-8 mx-w-4xl gap-4 sm:grid-cols-2">
        {markets.map((market)=> (<MarketCard
        key={market.pair}
        pair={market.pair}
        description={market.description}/>)) }
      </section>
    </main>
  )
}

     