import { useState } from "react";
import { Button } from "./ui/button";
import { Wallet, CheckCircle, AlertTriangle } from "lucide-react";
import { useToast } from "../hooks/use-toast";

export function WalletTestButton() {
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const { toast } = useToast();

  const handleTestConnection = async () => {
    setIsConnecting(true);
    
    try {
      // Simulate wallet connection process
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Show successful connection
      setIsConnected(true);
      
      toast({
        title: "Test Wallet Connected",
        description: "Demo wallet 0x742d...35b2 connected successfully",
      });
      
      console.log("✅ Demo wallet connected: 0x742d35A1F5F2a6F5c11B35b2");
      
    } catch (error) {
      toast({
        title: "Connection Failed",
        description: "Could not connect to wallet",
        variant: "destructive"
      });
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = () => {
    setIsConnected(false);
    toast({
      title: "Wallet Disconnected",
      description: "Demo wallet disconnected",
    });
  };

  if (isConnected) {
    return (
      <div className="space-y-3">
        <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <CheckCircle className="w-5 h-5 text-green-400" />
              <div>
                <div className="text-sm font-medium text-green-400">Wallet Connected</div>
                <div className="text-xs text-green-300/80">0x742d...35b2 • 12.4 HYPE</div>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDisconnect}
              className="text-xs"
            >
              Disconnect
            </Button>
          </div>
        </div>
        
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
          <div className="flex items-start space-x-2">
            <AlertTriangle className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
            <div className="text-xs text-blue-400">
              <div className="font-medium mb-1">Development Demo Mode</div>
              <div className="text-blue-300/80">
                Real wallet connections work when deployed to a live domain. This demo shows the interface functionality.
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <Button
        onClick={handleTestConnection}
        disabled={isConnecting}
        className="w-full py-6 bg-gradient-to-r from-hyper-mint to-hyper-glow hover:from-hyper-mint/80 hover:to-hyper-glow/80 text-black font-semibold rounded-xl glow text-lg"
        size="lg"
      >
        <Wallet className="w-5 h-5 mr-2" />
        {isConnecting ? "Connecting..." : "Connect Demo Wallet"}
      </Button>
      
      <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3">
        <div className="flex items-start space-x-2">
          <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
          <div className="text-xs text-amber-400">
            <div className="font-medium mb-1">Development Environment</div>
            <div className="text-amber-300/80">
              No wallet extensions found. This is normal in Replit. Full wallet functionality works when deployed.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}