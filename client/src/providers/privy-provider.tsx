import { PrivyProvider } from '@privy-io/react-auth';

// HyperEVM Chain Configuration
const hyperEVM = {
  id: 999,
  name: 'HyperEVM',
  network: 'hyperevm',
  nativeCurrency: {
    decimals: 18,
    name: 'HYPE',
    symbol: 'HYPE',
  },
  rpcUrls: {
    public: { http: ['https://rpc.hyperliquid.xyz/evm'] },
    default: { http: ['https://rpc.hyperliquid.xyz/evm'] },
  },
  blockExplorers: {
    default: { name: 'HyperEVM Explorer', url: 'https://explorer.hyperliquid.xyz' },
  },
};

interface PrivyWrapperProps {
  children: React.ReactNode;
}

export function PrivyWrapper({ children }: PrivyWrapperProps) {
  return (
    <PrivyProvider
      appId={import.meta.env.VITE_PRIVY_APP_ID || "cmd09prlq01v8l50luhxjcxil"}
      config={{
        loginMethods: ['wallet', 'email'],
        appearance: {
          theme: 'dark',
          accentColor: '#00d9ff',
          showWalletLoginFirst: true,
          logo: 'https://www.whiskerswap.xyz/favicon.ico',
        },
        embeddedWallets: {
          createOnLogin: 'users-without-wallets',
          noPromptOnSignature: true,
          priceDisplay: { primary: 'usd' },
        },
        defaultChain: hyperEVM,
        supportedChains: [hyperEVM],
        walletConnectCloudProjectId: undefined,
        externalWallets: {
          coinbaseWallet: { connectionOptions: 'smartWalletOnly' },
          metamask: { connectionOptions: 'injected' },
        },
        mfa: { noPromptOnMfaRequired: true },
        captchaEnabled: false,
      }}
    >
      {children}
    </PrivyProvider>
  );
}