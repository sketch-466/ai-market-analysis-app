type MarketCardProps = {
  pair : string;
  description : string;
};

function MarketCard({pair, description } : MarketCardProps) {
  return (
    <div className ="rounded-x1 border border-zinc-800 bg-zinc-900 p-5">
      <h2 className = "text-lg font-semibold text-white"> {pair}</h2>
      <p className =" mt-2 text-sm text-zinc-400">{pair}</p>
      
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
        <MarketCard 
        pair ="EUR/USD"
        description="EURO/US DOLLAR . sample data"/>
        <MarketCard
        pair ="GPB/USD"
        description ="BRITISH POUNDS/US DOLLAR . sample data"/>
        <MarketCard
        pair ="AUD/USD"
        description ="AUSTRALIAN DOLLAR/US DOLLAR . sample data"/>
      </section>
    </main>
  )
}