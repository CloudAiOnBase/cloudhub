'use client'

import { useEffect, useState } from 'react'
import { useAccount, useConnect } from 'wagmi'
import Sidebar from './Sidebar'
import Topbar from './Topbar'

export default function LayoutShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const { isConnected, address } = useAccount()
  const { connectors, connect } = useConnect()

  useEffect(() => {
    const reconnectMetaMaskIfAuthorized = async () => {
      const metaMask = connectors.find((c) => c.id === 'metaMask')

      if (!isConnected && metaMask?.ready) {
        try {
          const accounts: string[] = await (window as any).ethereum?.request?.({
            method: 'eth_accounts',
          })

          console.log('MetaMask accounts:', accounts)

          if (accounts && accounts.length > 0) {
            // Reconnect silently
            connect({ connector: metaMask })
          }
        } catch (err) {
          console.error('Error checking MetaMask accounts:', err)
        }
      }
    }

    const handleFocus = () => {
      // Delay is important for mobile (MetaMask context switch)
      setTimeout(reconnectMetaMaskIfAuthorized, 400)
    }

    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [isConnected, connectors, connect])

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
  )
}
