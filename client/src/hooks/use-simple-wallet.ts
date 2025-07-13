import { useState, useEffect } from 'react';
import { ethers } from 'ethers';

declare global {
  interface Window {
    ethereum?: any;
    okxwallet?: any;
    trustwallet?: any;
  }
}

export function useSimpleWallet() {
  const [isConnected, setIsConnected] = useState(false);
  const [address, setAddress] = useState('');
  const [balance, setBalance] = useState('0.0');
  const [isLoading, setIsLoading] = useState(false);
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
  const [signer, setSigner] = useState<ethers.JsonRpcSigner | null>(null);

  // Check for existing connection on load
  useEffect(() => {
    checkConnection();
  }, []);

  const checkConnection = async () => {
    try {
      if (window.ethereum && window.ethereum.selectedAddress) {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        const address = await signer.getAddress();
        const balance = await provider.getBalance(address);
        
        setProvider(provider);
        setSigner(signer);
        setAddress(address);
        setBalance(ethers.formatEther(balance));
        setIsConnected(true);
        
        console.log('✅ Wallet already connected:', address);
      }
    } catch (error) {
      console.log('No existing wallet connection');
    }
  };

  const connect = async () => {
    setIsLoading(true);
    
    try {
      // Check if we're in a browser that supports wallet injection
      if (typeof window === 'undefined') {
        throw new Error('Window object not available');
      }

      // Wait a bit for wallet providers to inject
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Try different wallet providers
      let ethereum = window.ethereum;
      
      if (!ethereum) {
        // Try OKX Wallet
        if (window.okxwallet) {
          ethereum = window.okxwallet;
          console.log('🦊 Using OKX Wallet');
        }
        // Try Trust Wallet
        else if (window.trustwallet) {
          ethereum = window.trustwallet;
          console.log('🛡️ Using Trust Wallet');
        }
        else {
          console.log('No wallet providers detected, using embedded wallet fallback');
          return false;
        }
      } else {
        console.log('🦊 Using MetaMask');
      }

      // Request account access
      await ethereum.request({ method: 'eth_requestAccounts' });
      
      // Create provider and signer
      const provider = new ethers.BrowserProvider(ethereum);
      const signer = await provider.getSigner();
      const address = await signer.getAddress();
      
      // Switch to HyperEVM network
      try {
        await ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: '0x3e7' }], // 999 in hex
        });
      } catch (switchError: any) {
        // Add network if it doesn't exist
        if (switchError.code === 4902) {
          await ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: '0x3e7',
              chainName: 'HyperEVM',
              nativeCurrency: {
                name: 'HYPE',
                symbol: 'HYPE',
                decimals: 18
              },
              rpcUrls: ['https://rpc.hyperliquid.xyz/evm'],
              blockExplorerUrls: ['https://explorer.hyperliquid.xyz']
            }]
          });
        }
      }

      // Get balance
      const balance = await provider.getBalance(address);
      
      setProvider(provider);
      setSigner(signer);
      setAddress(address);
      setBalance(ethers.formatEther(balance));
      setIsConnected(true);
      
      console.log('✅ Wallet connected successfully:', address);
      return true;
      
    } catch (error: any) {
      console.error('❌ Wallet connection failed:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const disconnect = () => {
    setProvider(null);
    setSigner(null);
    setAddress('');
    setBalance('0.0');
    setIsConnected(false);
    console.log('🔌 Wallet disconnected');
  };

  const fetchBalance = async () => {
    if (!provider || !address) return;
    
    try {
      const balance = await provider.getBalance(address);
      setBalance(ethers.formatEther(balance));
    } catch (error) {
      console.error('Error fetching balance:', error);
    }
  };

  const getProvider = async () => provider;
  const getSigner = async () => signer;

  return {
    isConnected,
    address,
    balance,
    isLoading,
    provider,
    signer,
    connect,
    disconnect,
    fetchBalance,
    getProvider,
    getSigner
  };
}