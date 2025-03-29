'use client'

import { useEffect, useState } from 'react'

export default function ClientGuard() {
  const [isTelegram, setIsTelegram] = useState(false)

  useEffect(() => {
    const tgProxyExists =
      typeof window !== 'undefined' &&
      // @ts-ignore
      (typeof window.TelegramWebviewProxy !== 'undefined' ||
       typeof window.Telegram?.WebApp !== 'undefined')

    if (tgProxyExists) {
      setIsTelegram(true)
    }
  }, [])

  if (!isTelegram) return null

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
