import { useState, useEffect } from 'react';
import { usePrivyWallet } from './use-privy-wallet';
import { useSimpleWallet } from './use-simple-wallet';

// Unified wallet hook that tries Privy first, falls back to browser wallets
export function useUnifiedWallet() {
  const privyWallet = usePrivyWallet();
  const simpleWallet = useSimpleWallet();
  const [walletType, setWalletType] = useState<'privy' | 'browser' | 'none'>('none');
  
  // Auto-detect which wallet is available and working
  useEffect(() => {
    if (privyWallet.isConnected) {
      setWalletType('privy');
    } else if (simpleWallet.isConnected) {
      setWalletType('browser');
    } else {
      setWalletType('none');
    }
  }, [privyWallet.isConnected, simpleWallet.isConnected]);
  
  const connect = async () => {
    console.log('🔗 Unified wallet connect - trying Privy first...');
    
    try {
      // Try Privy first (better for mobile)
      await privyWallet.connect();
      if (privyWallet.isConnected) {
        console.log('✅ Privy wallet connected');
        setWalletType('privy');
        return;
      }
    } catch (error) {
      console.log('Privy failed, trying browser wallet...');
    }
    
    try {
      // Fallback to browser wallet (MetaMask, OKX, etc.)
      await simpleWallet.connect();
      if (simpleWallet.isConnected) {
        console.log('✅ Browser wallet connected');
        setWalletType('browser');
        return;
      }
    } catch (error) {
      console.log('Browser wallet also failed');
    }
    
    console.log('❌ No wallet connection available');
  };
  
  const disconnect = async () => {
    if (walletType === 'privy') {
      await privyWallet.disconnect();
    } else if (walletType === 'browser') {
      await simpleWallet.disconnect();
    }
    setWalletType('none');
  };
  
  // Return the active wallet interface
  const activeWallet = walletType === 'privy' ? privyWallet : simpleWallet;
  
  return {
    ...activeWallet,
    connect,
    disconnect,
    walletType,
    isLoading: privyWallet.isLoading || simpleWallet.isLoading,
  };
}