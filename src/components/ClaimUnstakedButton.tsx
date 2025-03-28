'use client';

import { useState } from 'react';
import { CheckCircleIcon } from '@heroicons/react/20/solid';
import { useWriteContract, useChainId, useAccount, usePublicClient } from 'wagmi';
import stakingAbi from '@/abi/CloudStaking.json';
import { CONTRACTS } from '@/constants/contracts';
import { toast } from 'react-hot-toast';

export default function ClaimUnstakedButton({
  amountUnstaked,
  refetchUserBalance,
  refetchStakerData,
  refetchAvailableRewards
}: {
  amountUnstaked: bigint;
  refetchUserBalance: () => void;
  refetchStakerData: () => void;
  refetchAvailableRewards: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const { writeContractAsync } = useWriteContract();
  const chainId = useChainId();
  const { address } = useAccount();
  const publicClient = usePublicClient();

  const isDisabled = !amountUnstaked || amountUnstaked === 0n || loading;

  const handleClaim = async () => {
    if (!address) return;
    try {
      setLoading(true);
      const staking = CONTRACTS.STAKING_ADDRESSES[chainId];

      const txHash = await writeContractAsync({
        abi: stakingAbi,
        address: staking,
        functionName: 'claimUnstakedTokens',
        args: [],
      });

      const toastId = toast.loading('Waiting for confirmation...');

      await publicClient.waitForTransactionReceipt({ hash: txHash });
			await refetchUserBalance();
      await refetchStakerData();
      await refetchAvailableRewards();

      toast.success(
        <>
          Transaction confirmed! <br />
          Rewards claimed automatically.
        </>,
        { id: toastId }
      );
      

    } catch (err) {
      console.error('Claim failed', err);
      toast.error('Claim unstaked tokens failed. Please try again.', { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleClaim}
      disabled={isDisabled}
      className={`flex items-center gap-2 font-medium py-2 px-4 rounded-full shadow-sm transition 
        ${isDisabled ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}
    >
      <CheckCircleIcon className="h-5 w-5" />
      <span>{loading ? 'Claiming...' : 'Claim'}</span>
    </button>
  );
}

