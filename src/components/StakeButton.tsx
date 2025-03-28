'use client';

import { useState } from 'react';
import { ArrowUpRightIcon } from '@heroicons/react/20/solid';
import StakeModal from './StakeModal';

export default function StakeButton({ userBalance, refetchUserBalance, refetchStakerData }: {
  userBalance: bigint;
  refetchUserBalance: () => void;
  refetchStakerData: () => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        disabled={!userBalance || userBalance === 0n}
        className={`flex items-center gap-2 font-medium py-2 px-4 rounded-full shadow-sm transition 
          ${
            !userBalance || userBalance === 0n
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700 text-white'
          }`}
      >
        <ArrowUpRightIcon className="h-5 w-5" />
        <span>Stake</span>
      </button>

			<StakeModal
				isOpen={open}
				onClose={() => setOpen(false)}
				maxAmount={userBalance}
				refetchUserBalance={refetchUserBalance}
				refetchStakerData={refetchStakerData}
			/>

    </>
  );
}

