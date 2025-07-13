import { useState, useEffect } from 'react';
import { directWalletConnect, type DirectWalletState } from '../lib/direct-wallet-connect';

export function useDirectWallet() {
  const [state, setState] = useState<DirectWalletState>(directWalletConnect.getState());
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Subscribe to wallet state changes
    const unsubscribe = directWalletConnect.subscribe(setState);

    // Check for existing connection on mount with delay for wallet injection
    const checkWithDelay = async () => {
      console.log('🔍 Starting wallet connection check...');
      
      // Try immediate check
      const immediate = await directWalletConnect.checkConnection();
      if (immediate) return;
      
      // If no immediate connection, wait for wallet injection
      setTimeout(async () => {
        console.log('🔍 Retrying wallet check after delay...');
        await directWalletConnect.checkConnection();
      }, 1000);
    };
    
    checkWithDelay();

    return unsubscribe;
  }, []);

  const connect = async () => {
    setIsLoading(true);
    try {
      const success = await directWalletConnect.connect();
      if (!success) {
        console.log('❌ Wallet connection failed');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const disconnect = () => {
    directWalletConnect.disconnect();
  };

  return {
    ...state,
    isLoading,
    connect,
    disconnect
  };
}