'use client';

import { useEffect, useState } from 'react';
import { useAccount, useConnect } from 'wagmi';
import Sidebar from './Sidebar';
import Topbar from './Topbar';

export default function LayoutShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { isConnected } = useAccount();
  const { connectors, connect } = useConnect();

  useEffect(() => {
    const tryReconnect = async () => {
      const metaMask = connectors.find((c) => c.id === 'metaMask');
      if (!isConnected && metaMask && metaMask.ready) {
        // Directly query the injected provider (MetaMask)
        try {
          if (typeof window !== 'undefined' && window.ethereum && window.ethereum.request) {
            const accounts = await window.ethereum.request({ method: 'eth_accounts' });
            console.log('Retrieved accounts:', accounts);
            if (accounts && accounts.length > 0) {
              // If accounts exist, trigger the connection
              connect({ connector: metaMask });
            } else {
              console.log('No authorized accounts found.');
            }
          }
        } catch (error) {
          console.error('Error during auto-reconnect:', error);
        }
      }
    };

    const handleFocus = () => {
      // Delay a bit to allow MetaMask to settle on mobile
      setTimeout(tryReconnect, 300);
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [isConnected, connectors, connect]);

  return (
    <div className="flex min-h-screen">
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 md:hidden">
          <Sidebar mobile onClose={() => setSidebarOpen(false)} />
        </div>
      )}
      <div className="hidden md:flex w-64 flex-col bg-white border-r flex-shrink-0">
        <Sidebar />
      </div>
      <div className="flex flex-col flex-1">
        <Topbar onOpenSidebar={() => setSidebarOpen(true)} />
        <main className="flex-1 overflow-y-auto p-6 bg-gray-50">{children}</main>
      </div>
    </div>
  );
}
