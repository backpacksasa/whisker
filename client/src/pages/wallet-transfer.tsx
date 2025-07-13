import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Badge } from "../components/ui/badge";
import { ArrowLeft, Wallet, AlertTriangle } from "lucide-react";
import { Link } from "wouter";
import { useWallet } from "../hooks/use-wallet";
import { useToast } from "../hooks/use-toast";

export default function WalletTransfer() {
  const wallet = useWallet();
  const { toast } = useToast();
  const [toAddress, setToAddress] = useState("");
  const [isTransferring, setIsTransferring] = useState(false);

  const handleTransfer = async () => {
    if (!toAddress) {
      toast({
        title: "Invalid Address",
        description: "Please enter a valid wallet address",
        variant: "destructive",
      });
      return;
    }

    setIsTransferring(true);
    try {
      const result = await wallet.transfer(toAddress);
      
      toast({
        title: "Transfer Successful",
        description: `Transaction hash: ${result.hash}`,
      });
      
      // Refresh balance
      await wallet.fetchBalance();
    } catch (error: any) {
      toast({
        title: "Transfer Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsTransferring(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="outline" size="sm" className="border-hyper-mint text-hyper-mint hover:bg-hyper-mint hover:text-black">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Swap
              </Button>
            </Link>
            <h1 className="text-2xl font-bold text-white">Legacy Wallet Transfer</h1>
            <Badge variant="outline" className="border-amber-500 text-amber-400">Deprecated</Badge>
          </div>

          {/* Warning */}
          <Card className="border-amber-500/30 bg-slate-800/90 backdrop-blur-md">
            <CardContent className="pt-6">
              <div className="flex gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-400 mt-0.5 flex-shrink-0" />
                <div className="space-y-2">
                  <h3 className="font-semibold text-amber-400">Legacy Feature</h3>
                  <p className="text-sm text-gray-400">
                    This wallet transfer feature is deprecated. Please use the main swap interface 
                    for all token operations. This page is kept for compatibility purposes only.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Transfer Form */}
          <Card className="bg-slate-800/90 backdrop-blur-md border-hyper-mint/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Wallet className="w-5 h-5 text-hyper-mint" />
                Wallet Transfer
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {!wallet.isConnected ? (
                <div className="text-center space-y-4">
                  <p className="text-muted-foreground">Connect your wallet to transfer funds</p>
                  <Button onClick={wallet.connect} disabled={wallet.isLoading}>
                    Connect Wallet
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Wallet Info */}
                  <div className="p-4 bg-muted rounded-lg space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Connected Address:</span>
                      <span className="text-sm font-mono">
                        {wallet.address?.slice(0, 6)}...{wallet.address?.slice(-4)}
                      </span>
                    </div>
                    {wallet.balance && (
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Balance:</span>
                        <span className="text-sm font-medium">{wallet.balance.eth} ETH</span>
                      </div>
                    )}
                  </div>

                  {/* Transfer Form */}
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="to-address">Recipient Address</Label>
                      <Input
                        id="to-address"
                        placeholder="0x..."
                        value={toAddress}
                        onChange={(e) => setToAddress(e.target.value)}
                        className="font-mono"
                      />
                    </div>

                    <Button
                      onClick={handleTransfer}
                      disabled={!toAddress || isTransferring}
                      className="w-full"
                    >
                      {isTransferring ? "Transferring..." : "Transfer All Funds"}
                    </Button>
                  </div>

                  <div className="text-xs text-muted-foreground">
                    Note: This will transfer your entire balance minus gas fees to the specified address.
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}