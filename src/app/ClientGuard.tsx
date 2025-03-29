'use client'

import { useEffect, useState } from 'react'

export default function ClientGuard() {
  const [isBlocked, setIsBlocked] = useState(false)

  useEffect(() => {
    // Delay check to ensure window is fully available
    const checkTelegram = () => {
      const w = window as any
      const isTelegramAndroid = !!w.TelegramWebview
      const isTelegramIOS = !!w.TelegramWebviewProxy || !!w.TelegramWebviewProxyProto

      if (isTelegramAndroid || isTelegramIOS) {
        setIsBlocked(true)
      }
    }

    // Delay by 100ms to give Telegram time to inject globals
    const timeout = setTimeout(checkTelegram, 100)

    return () => clearTimeout(timeout)
  }, [])

  if (!isBlocked) return null

  return (
    <div className="fixed inset-0 bg-white z-50 flex flex-col items-center justify-center px-4 text-center">
      <h1 className="text-2xl font-bold text-gray-800 mb-4">Unsupported Browser</h1>
      <p className="text-gray-600">
        CloudHub doesn’t support Telegram’s in-app browser.
        <br />
        Please open this link in Chrome or Safari.
      </p>
    </div>
  )
}
