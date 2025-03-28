'use client';

import { WagmiConfig, createConfig, http } from 'wagmi';
import { base, baseSepolia } from 'wagmi/chains';
import { RainbowKitProvider, getDefaultWallets } from '@rainbow-me/rainbowkit';
import '@rainbow-me/rainbowkit/styles.css';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient();

const { connectors } = getDefaultWallets({
  appName: 'CloudHub',
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID!,
  chains: [base, baseSepolia],
});

const config = createConfig({
  autoConnect: true,
  connectors,
  publicClient: http(),
  chains: [base, baseSepolia],
  logger: {
    warn: null,
    error: null,
    info: null,
  },
});

export function WalletProvider({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <WagmiConfig config={config}>
        <RainbowKitProvider>
          {children}
        </RainbowKitProvider>
      </WagmiConfig>
    </QueryClientProvider>
  );
}
