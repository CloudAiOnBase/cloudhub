'use client'

import { useEffect, useState } from 'react'

export default function DebugUserAgent() {
  const [userAgent, setUserAgent] = useState('')

  useEffect(() => {
    setUserAgent(navigator.userAgent)
  }, [])

  return (
    <div className="mt-10 text-[10px] text-gray-500 text-center w-full">
      User Agent: {userAgent}
    </div>
  )
}
