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
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { writeContractAsync } = useWriteContract();
  const chainId = useChainId();
  const { address } = useAccount();
  const publicClient = usePublicClient();
  type ChainId = keyof typeof CONTRACTS.STAKING_ADDRESSES;

  let toastId: string;

  const handleCancelUnstake = async () => {
    if (!address) return;
    try {
      setLoading(true);
      const staking = CONTRACTS.STAKING_ADDRESSES[chainId as ChainId];

      const txHash = await writeContractAsync({
        abi: stakingAbi,
        address: staking,
        functionName: 'cancelUnstaking',
        args: [],
      });

      toastId = toast.loading('Waiting for confirmation...');

			// Wait for the transaction to be mined
      if (!publicClient) return;
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

