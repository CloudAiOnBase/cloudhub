// app/page.tsx
import { redirect } from 'next/navigation';

export default function Home() {
  redirect('/staking');
}



/*


'use client';

export default function DashboardPage() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
      <div className="bg-white shadow rounded-lg p-4">
        <h2 className="text-sm font-medium text-gray-500">Token Price</h2>
        <p className="text-2xl font-bold text-gray-900 mt-2">$0.1234</p>
      </div>

      <div className="bg-white shadow rounded-lg p-4">
        <h2 className="text-sm font-medium text-gray-500">Staking APR</h2>
        <p className="text-2xl font-bold text-gray-900 mt-2">8.00%</p>
      </div>

      <div className="bg-white shadow rounded-lg p-4">
        <h2 className="text-sm font-medium text-gray-500">Total Staked</h2>
        <p className="text-2xl font-bold text-gray-900 mt-2">12,345,678 $CLOUD</p>
      </div>

      <div className="bg-white shadow rounded-lg p-4">
        <h2 className="text-sm font-medium text-gray-500">Community Pool</h2>
        <p className="text-2xl font-bold text-gray-900 mt-2">4,567,890 $CLOUD</p>
      </div>

      <div className="bg-white shadow rounded-lg p-4">
        <h2 className="text-sm font-medium text-gray-500">Tax Rate</h2>
        <p className="text-2xl font-bold text-gray-900 mt-2">0.35%</p>
      </div>

      <div className="bg-white shadow rounded-lg p-4">
        <h2 className="text-sm font-medium text-gray-500">Issuance</h2>
        <p className="text-2xl font-bold text-gray-900 mt-2">100M $CLOUD</p>
      </div>
    </div>
  );
}


*/
