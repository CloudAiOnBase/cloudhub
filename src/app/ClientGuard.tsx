'use client'

import { useEffect, useState } from 'react'

export default function ClientGuard() {
  const [isTelegramBrowser, setIsTelegramBrowser] = useState(false)

  useEffect(() => {
    if (/telegram/i.test(navigator.userAgent)) {
      setIsTelegramBrowser(true)
    }
  }, [])

  if (!isTelegramBrowser) return null

  return (
    <div className="fixed inset-0 bg-white z-50 flex flex-col items-center justify-center px-4 text-center">
      <h1 className="text-2xl font-bold text-gray-800 mb-4">Unsupported Browser</h1>
      <p className="text-gray-600">
        CloudHub doesn't support Telegram’s in-app browser.
        <br />
        Please open this link in your default browser (like Chrome or Safari).
      </p>
    </div>
  )
}
