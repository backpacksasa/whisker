import { useState, useEffect } from 'react';
import { usePrivyWallet } from './use-privy-wallet';
import { useDirectWallet } from './use-direct-wallet';

// Hybrid wallet hook that tries Privy first, then falls back to direct wallet
export function useHybridWallet() {
  const privyWallet = usePrivyWallet();
  const directWallet = useDirectWallet();
  const [activeWallet, setActiveWallet] = useState<'privy' | 'direct' | null>(null);
  const [privyAvailable, setPrivyAvailable] = useState(true);

  // Check if Privy is working by monitoring iframe load failures
  useEffect(() => {
    const checkPrivyStatus = () => {
      // Listen for Privy iframe errors
      const originalError = console.warn;
      console.warn = (...args) => {
        if (args[0]?.includes?.('Privy iframe failed')) {
          console.log('🚨 Privy iframe failed - switching to direct wallet mode');
          setPrivyAvailable(false);
          setActiveWallet('direct');
        }
        originalError.apply(console, args);
      };

      // Initial check - if Privy hasn't connected after 3 seconds, fall back
      setTimeout(() => {
        if (!privyWallet.isConnected && !privyWallet.isLoading) {
          console.log('🔄 Privy timeout - trying direct wallet');
          setPrivyAvailable(false);
          setActiveWallet('direct');
        }
      }, 3000);
    };

    checkPrivyStatus();
  }, []);

  // Determine which wallet to use
  useEffect(() => {
    if (privyWallet.isConnected) {
      setActiveWallet('privy');
    } else if (directWallet.isConnected) {
      setActiveWallet('direct');
    } else if (!privyAvailable) {
      setActiveWallet('direct');
    } else {
      setActiveWallet('privy'); // Default to Privy
    }
  }, [privyWallet.isConnected, directWallet.isConnected, privyAvailable]);

  // Return the active wallet's interface
  const getActiveWallet = () => {
    if (activeWallet === 'direct') {
      return {
        ...directWallet,
        getProvider: () => Promise.resolve(directWallet.provider),
        getSigner: () => Promise.resolve(directWallet.signer),
        fetchBalance: () => directWallet.fetchBalance(),
        walletType: 'direct' as const
      };
    } else {
      return {
        ...privyWallet,
        walletType: 'privy' as const
      };
    }
  };

  const wallet = getActiveWallet();

  const connect = async () => {
    if (activeWallet === 'direct' || !privyAvailable) {
      console.log('🔗 Using direct wallet connection');
      return await directWallet.connect();
    } else {
      console.log('🔗 Using Privy wallet connection');
      try {
        await privyWallet.connect();
        return true;
      } catch (error) {
        console.log('🚨 Privy failed, falling back to direct wallet');
        setPrivyAvailable(false);
        setActiveWallet('direct');
        return await directWallet.connect();
      }
    }
  };

  const disconnect = () => {
    if (activeWallet === 'direct') {
      directWallet.disconnect();
    } else {
      privyWallet.disconnect();
    }
  };

  return {
    ...wallet,
    connect,
    disconnect,
    activeWallet,
    privyAvailable
  };
}