'use client';

import { useEffect, useState } from 'react';
import { useChainId, useChains } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { Bars3Icon } from '@heroicons/react/24/outline';


type TopbarProps = {
  onOpenSidebar: () => void;
};

export default function Topbar({ onOpenSidebar }: TopbarProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const chainId = useChainId();
  const chains = useChains();
  const chain = chains.find((c) => c.id === chainId);

  return (
    
	<header className="flex items-center justify-between px-6 py-4 bg-white border-b">
			<button className="md:hidden" onClick={onOpenSidebar}>
        <Bars3Icon className="h-6 w-6 text-gray-700" />
      </button>

		<div className="flex items-center gap-4 ml-auto">
			{mounted && chain?.testnet && (
			  <span className="text-sm px-2 py-1 bg-yellow-100 text-yellow-700 rounded">Testnet</span>
			)}
		  <ConnectButton />
		</div>
	</header>
  );
}

