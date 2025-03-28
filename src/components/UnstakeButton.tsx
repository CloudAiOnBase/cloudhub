'use client';

import { useState } from 'react';
import { ArrowDownLeftIcon } from '@heroicons/react/20/solid';
import UnstakeModal from './UnstakeModal';

export default function UnstakeButton({ maxUnstakable, amountUnstaking, cooldownDays, refetchStakerData, refetchAvailableRewards }: {
  maxUnstakable: bigint;
  amountUnstaking: bigint;
  cooldownDays: bigint;
  refetchStakerData: () => void;
  refetchAvailableRewards: () => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        disabled={!maxUnstakable || maxUnstakable === 0n}
        className={`flex items-center gap-2 font-medium py-2 px-4 rounded-full shadow-sm transition 
          ${
            !maxUnstakable || maxUnstakable === 0n
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700 text-white'
          }`}
      >
        <ArrowDownLeftIcon className="h-5 w-5" />
        <span>Unstake</span>
      </button>

			<UnstakeModal
				isOpen={open}
				onClose={() => setOpen(false)}
				maxAmount={maxUnstakable}
        amountUnstaking={amountUnstaking}
        cooldownDays={cooldownDays}
				refetchStakerData={refetchStakerData}
        refetchAvailableRewards={refetchAvailableRewards}
			/>

    </>
  );
}

