'use client';

import { ConnectButton } from '@rainbow-me/rainbowkit';

export default function HomePage() {
  return (
    <main className="min-h-screen p-6">
      <h1 className="text-2xl font-bold">CloudHub MVP ☁️</h1>
      <p className="mt-2 text-gray-600">Stake, vote, govern.</p>

      <div className="mt-6">
        <ConnectButton />
      </div>
    </main>
  );
}

