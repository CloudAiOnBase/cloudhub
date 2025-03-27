'use client';

import { WagmiConfig, createConfig, http } from 'wagmi';
import { base, baseSepolia } from 'wagmi/chains';
import { chains } from './chains';
import { RainbowKitProvider, getDefaultConfig } from '@rainbow-me/rainbowkit';
import '@rainbow-me/rainbowkit/styles.css';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient();

const config = getDefaultConfig({
  appName: 'CloudHub',
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID!,
  chains,
  transports: {
    [base.id]: http(),
    [baseSepolia.id]: http(),
  },
});


type Props = {
  children: React.ReactNode;
};

export function WalletProvider({ children }: Props) {
  return (
    <QueryClientProvider client={queryClient}>
      <WagmiConfig config={config}>
				<RainbowKitProvider chains={chains}>
					{children}
				</RainbowKitProvider>
      </WagmiConfig>
    </QueryClientProvider>
  );
}
