import { useEffect, useState } from 'react'
import { useAccount, useConnect } from 'wagmi'

function ManualReconnectPrompt() {
  const { isConnected } = useAccount()
  const { connectors, connect } = useConnect()
  const [shouldShow, setShouldShow] = useState(false)

  useEffect(() => {
    const checkAccounts = async () => {
      if (typeof window !== 'undefined' && (window as any).ethereum?.request) {
        try {
          const accounts: string[] = await (window as any).ethereum.request({
            method: 'eth_accounts',
          })

          if (accounts.length > 0 && !isConnected) {
            setShouldShow(true)
          }
        } catch (err) {
          console.error('Error fetching accounts:', err)
        }
      }
    }

    checkAccounts()
  }, [isConnected])

  const handleReconnect = () => {
    const metamask = connectors.find((c) => c.id === 'metaMask')
    if (metamask?.ready) {
      connect({ connector: metamask })
    }
  }

  if (!shouldShow) return null

  return (
    <div className="bg-yellow-100 text-yellow-800 p-3 text-center text-sm">
      <p className="mb-2">You’re approved in MetaMask, but not connected here.</p>
      <button
        onClick={handleReconnect}
        className="bg-yellow-600 text-white px-4 py-2 rounded"
      >
        Reconnect Wallet
      </button>
    </div>
  )
}
