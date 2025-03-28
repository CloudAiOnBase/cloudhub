'use client';

import { useState } from 'react';
import { XCircleIcon } from '@heroicons/react/20/solid';
import { useWriteContract, useChainId, useAccount, usePublicClient } from 'wagmi';
import stakingAbi from '@/abi/CloudStaking.json';
import { CONTRACTS } from '@/constants/contracts';
import { toast } from 'react-hot-toast';

export default function CancelUnstakeButton({ amountUnstaking, refetchStakerData,refetchAvailableRewards }: {
  amountUnstaking: bigint;
  refetchStakerData: () => void;
  refetchAvailableRewards: () => void;
}) {
  const [setOpen] = useState(false); // `open` can be used later for a modal confirmation if needed
  const [loading, setLoading] = useState(false);
  const { writeContractAsync } = useWriteContract();
  const chainId = useChainId();
  const { address } = useAccount();
  const publicClient = usePublicClient();

  const handleCancelUnstake = async () => {
    if (!address) return;
    try {
      setLoading(true);
      const staking = CONTRACTS.STAKING_ADDRESSES[chainId];

      const txHash = await writeContractAsync({
        abi: stakingAbi,
        address: staking,
        functionName: 'cancelUnstaking',
        args: [],
      });

      const toastId = toast.loading('Waiting for confirmation...');

			// Wait for the transaction to be mined
			await publicClient.waitForTransactionReceipt({ hash: txHash });

      await refetchStakerData();
      await refetchAvailableRewards();

      toast.success(
        <>
          Transaction confirmed! <br />
          Rewards claimed automatically.
        </>,
        { id: toastId }
      );
      

      setOpen(false);
    } catch (err) {
      console.error('Cancel unstake failed', err);
      toast.error('Cancel unstaking failed. Please try again.', { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={handleCancelUnstake}
        disabled={!amountUnstaking || amountUnstaking === 0n || loading}
        className={`flex items-center gap-2 font-medium py-2 px-4 rounded-full shadow-sm transition 
          ${
            !amountUnstaking || amountUnstaking === 0n || loading
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700 text-white'
          }`}
      >
        <XCircleIcon className="h-5 w-5" />
        <span>{loading ? 'Cancelling...' : 'Cancel'}</span>
      </button>
    </>
  );
}

