import { useState, useEffect } from "react";
import { ethers } from "ethers";
import { web3Service, type WalletBalance } from "../lib/web3";
import { useToast } from "../hooks/use-toast";
import { walletDetector } from "../lib/wallet-detector";

export function useWallet() {
  // Real wallet connection - no demo mode
  const [isConnected, setIsConnected] = useState(false);
  const [address, setAddress] = useState<string>("");
  const [balance, setBalance] = useState<string>("0");
  const [isLoading, setIsLoading] = useState(false);
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
  const [signer, setSigner] = useState<ethers.JsonRpcSigner | null>(null);
  const { toast } = useToast();

  // Check wallet connection on load and listen for account changes
  useEffect(() => {
    checkConnection();
    
    // Listen for account changes
    if (window.ethereum) {
      const handleAccountsChanged = async (accounts: string[]) => {
        console.log("🔄 Accounts changed:", accounts);
        if (accounts.length > 0) {
          setIsConnected(true);
          setAddress(accounts[0]);
          
          // Reinitialize provider and signer for new account
          try {
            const browserProvider = new ethers.BrowserProvider(window.ethereum);
            const walletSigner = await browserProvider.getSigner();
            setProvider(browserProvider);
            setSigner(walletSigner);
            console.log("✅ Provider and signer updated for new account");
          } catch (error) {
            console.warn("Failed to update provider/signer:", error);
          }
          
          fetchBalance(accounts[0]);
        } else {
          setIsConnected(false);
          setAddress("");
          setBalance("0");
          setProvider(null);
          setSigner(null);
        }
      };
      
      window.ethereum.on('accountsChanged', handleAccountsChanged);
      
      return () => {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
      };
    }
  }, []);

  const checkConnection = async () => {
    try {
      console.log("🔍 Simple wallet check...");
      
      if (window.ethereum) {
        try {
          const accounts = await window.ethereum.request({ method: 'eth_accounts' });
          console.log("📋 Found accounts:", accounts);
          
          if (accounts.length > 0) {
            setIsConnected(true);
            setAddress(accounts[0]);
            
            // Initialize provider and signer for swap functionality
            const browserProvider = new ethers.BrowserProvider(window.ethereum);
            const walletSigner = await browserProvider.getSigner();
            setProvider(browserProvider);
            setSigner(walletSigner);
            
            // Get balance directly
            const balance = await window.ethereum.request({
              method: 'eth_getBalance',
              params: [accounts[0], 'latest']
            });
            const balanceInEth = parseInt(balance, 16) / Math.pow(10, 18);
            setBalance(balanceInEth.toString());
            
            console.log("✅ Auto-connected:", accounts[0], "Balance:", balanceInEth, "HYPE");
            console.log("✅ Provider and signer initialized for swapping");
            return;
          }
        } catch (error) {
          console.warn("Wallet check failed:", error);
        }
      }
      
      console.log("❌ No wallet connection found");
      setIsConnected(false);
      setAddress("");
      setBalance("0");
      setProvider(null);
      setSigner(null);
    } catch (error) {
      console.error("Error checking wallet:", error);
    }
  };

  const connect = async () => {
    setIsLoading(true);
    try {
      console.log("🔗 Starting wallet connection using proven test method...");
      
      if (!window.ethereum) {
        throw new Error("No wallet detected! Please install OKX Wallet, MetaMask, or another Web3 wallet.");
      }

      console.log("🔗 Requesting account access...");
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      console.log("✅ Accounts retrieved:", accounts);

      if (accounts.length > 0) {
        const address = accounts[0];
        console.log("🏷️ Connected address:", address);

        // Initialize web3Service and local state with the connected wallet
        const browserProvider = new ethers.BrowserProvider(window.ethereum);
        const walletSigner = await browserProvider.getSigner();
        
        web3Service.provider = browserProvider;
        web3Service.signer = walletSigner;
        
        setProvider(browserProvider);
        setSigner(walletSigner);
        setAddress(address);
        setIsConnected(true);
        
        console.log("✅ Web3Service and wallet state initialized successfully");
        
        // Get balance
        const balance = await window.ethereum.request({
          method: 'eth_getBalance',
          params: [address, 'latest']
        });
        const balanceInEth = parseInt(balance, 16) / Math.pow(10, 18);
        setBalance(balanceInEth.toString());
        
        console.log("💰 Balance fetched:", balanceInEth, "HYPE");
        
        toast({
          title: "Wallet Connected Successfully",
          description: `Address: ${address.slice(0, 6)}...${address.slice(-4)}\nBalance: ${balanceInEth.toFixed(4)} HYPE`,
        });
      } else {
        throw new Error("No accounts found. Please unlock your wallet and try again.");
      }
      
    } catch (error: any) {
      console.error("❌ Wallet connection failed:", error);
      
      toast({
        title: "Connection Failed",
        description: error.message || "Failed to connect wallet",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const disconnect = async () => {
    setIsConnected(false);
    setAddress("");
    setBalance("0");
    setIsLoading(false);
    setProvider(null);
    setSigner(null);
    
    // Clear web3Service
    web3Service.provider = null;
    web3Service.signer = null;
    
    toast({
      title: "Wallet Disconnected",
      description: "Your wallet has been disconnected successfully",
    });
  };

  const fetchBalance = async (addr: string) => {
    try {
      console.log("🔍 Fetching balance for:", addr);
      
      if (window.ethereum) {
        const balance = await window.ethereum.request({
          method: 'eth_getBalance',
          params: [addr, 'latest']
        });
        const balanceInEth = parseInt(balance, 16) / Math.pow(10, 18);
        setBalance(balanceInEth.toString());
        console.log("💰 Balance fetched:", balanceInEth, "HYPE");
      }
    } catch (error: any) {
      console.error("Balance fetch error:", error);
      toast({
        title: "Failed to Fetch Balance",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const transfer = async (toAddress: string) => {
    if (!address) {
      throw new Error("Wallet not connected");
    }

    const result = await web3Service.transferBalance(toAddress);
    
    if (!result.success) {
      throw new Error(result.error || "Transfer failed");
    }
    
    return result;
  };

  return {
    isConnected,
    address,
    balance,
    isLoading,
    provider,
    signer,
    connect,
    disconnect,
    transfer,
    fetchBalance: () => address ? fetchBalance(address) : Promise.resolve(),
    // Legacy compatibility methods
    getProvider: () => provider,
    getSigner: () => signer
  };
}
