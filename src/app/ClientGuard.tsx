'use client'

import { useEffect, useState } from 'react'

export default function ClientGuard() {
  const [isInAppBrowser, setIsInAppBrowser] = useState(false)

  useEffect(() => {
    const ua = navigator.userAgent.toLowerCase()

    const isAndroidWebView = /android/i.test(ua) && !/wv/.test(ua) && !/samsungbrowser/i.test(ua) && !/chrome\/[.0-9]+ mobile safari\/[.0-9]+/i.test(ua)

    // Optional: detect Telegram specifically if they ever add UA hints
    const isTelegram = ua.includes('telegram')

    if (isTelegram || isAndroidWebView) {
      setIsInAppBrowser(true)
    }
  }, [])

  if (!isInAppBrowser) return null

  return (
    <div className="fixed inset-0 bg-white z-50 flex flex-col items-center justify-center px-4 text-center">
      <h1 className="text-2xl font-bold text-gray-800 mb-4">Unsupported Browser</h1>
      <p className="text-gray-600">
        CloudHub doesn't support in-app browsers like Telegram’s.
        <br />
        Please open this link in your default browser (e.g., Chrome or Safari).
      </p>
    </div>
  )
}
