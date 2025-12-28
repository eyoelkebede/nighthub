import Wormhole from "@/components/Wormhole";

export default function WormholePage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 pb-24">
      <div className="w-full max-w-4xl space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-neon-blue to-neon-purple neon-text">
            THE WORMHOLE
          </h1>
          <p className="text-xs text-gray-500 uppercase tracking-[0.2em]">
            P2P Video Link • Encrypted • Monetized
          </p>
        </div>
        
        <Wormhole />
        
        <div className="text-center text-xs text-gray-600 max-w-md mx-auto">
          By entering the Wormhole, you agree to the decentralized protocol standards. 
          Ad revenue is automatically split 60/40 via smart contract.
        </div>
      </div>
    </div>
  );
}
