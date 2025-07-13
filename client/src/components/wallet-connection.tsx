import { Button } from "./ui/button";
import { Wallet } from "lucide-react";

interface WalletConnectionProps {
  onConnect: () => void;
  isLoading: boolean;
}

export function WalletConnection({ onConnect, isLoading }: WalletConnectionProps) {
  return (
    <div className="flex flex-col items-center justify-center space-y-4 p-8 bg-slate-800/30 rounded-lg border border-slate-700/50">
      <div className="text-center space-y-2">
        <Wallet className="w-12 h-12 mx-auto text-slate-400" />
        <h3 className="text-lg font-semibold text-white">Connect Your Wallet</h3>
        <p className="text-sm text-slate-400 max-w-md">
          Connect your wallet to start swapping tokens on HyperEVM
        </p>
      </div>
      
      <Button 
        onClick={onConnect}
        disabled={isLoading}
        className="bg-gradient-to-r from-hyper-mint to-green-400 hover:from-green-400 hover:to-hyper-mint text-black font-semibold px-8 py-3 transition-all duration-300"
      >
        {isLoading ? (
          <>
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-black mr-2" />
            Connecting...
          </>
        ) : (
          <>
            <Wallet className="w-4 h-4 mr-2" />
            Connect Wallet
          </>
        )}
      </Button>
      
      <div className="text-xs text-slate-500 text-center max-w-md space-y-2">
        <div>Supports MetaMask, OKX, Trust Wallet, and other EVM wallets</div>
        <div className="text-amber-400 bg-amber-400/10 rounded px-3 py-2 border border-amber-400/20">
          ⚠️ Install MetaMask, OKX, or Trust Wallet to connect
        </div>
      </div>
    </div>
  );
}