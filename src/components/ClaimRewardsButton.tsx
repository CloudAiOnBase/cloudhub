'use client';

import { useState } from 'react';
import { ArrowDownTrayIcon } from '@heroicons/react/20/solid';
import { useWriteContract, useChainId, useAccount, usePublicClient } from 'wagmi';
import stakingAbi from '@/abi/CloudStaking.json';
import { CONTRACTS } from '@/constants/contracts';
import { toast } from 'react-hot-toast';

export default function ClaimRewardsButton({ availableRewards, refetchUserBalance, refetchAvailableRewards }: {
  availableRewards: bigint;
  refetchUserBalance: () => void;
  refetchAvailableRewards: () => void;
}) {
  const [, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { writeContractAsync } = useWriteContract();
  const chainId = useChainId();
  const { address } = useAccount();
  const publicClient = usePublicClient();
  type ChainId = keyof typeof CONTRACTS.STAKING_ADDRESSES;
  let toastId: string;

  const handleClaimRewards = async () => {
    if (!address) return;
    try {
      setLoading(true);
      const staking = CONTRACTS.STAKING_ADDRESSES[chainId as ChainId];

      const txHash = await writeContractAsync({
        abi: stakingAbi,
        address: staking,
        functionName: 'claimRewards',
        args: [],
      });

      toastId = toast.loading('Waiting for confirmation...');

			// Wait for the transaction to be mined
      if (!publicClient) return;
			await publicClient.waitForTransactionReceipt({ hash: txHash });

      await refetchUserBalance();
      await refetchAvailableRewards();

      toast.success(
        <>
          Transaction confirmed! <br />
          Rewards claimed.
        </>,
        { id: toastId }
      );
      
      setOpen(false);
    } catch (err) {
      console.error('Claim rewards failed', err);
      toast.error('Claim rewards failed. Please try again.', { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={handleClaimRewards}
        disabled={!availableRewards || availableRewards === 0n || loading}
        className={`flex items-center gap-2 font-medium py-2 px-4 rounded-full shadow-sm transition 
          ${
            !availableRewards || availableRewards === 0n || loading
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700 text-white'
          }`}
      >
        <ArrowDownTrayIcon className="h-5 w-5" />
        <span>
          {loading ? 'Claiming ' : 'Claim '}
          <span className="hidden md:inline">rewards</span>
          {loading ? '...' : ''}
        </span>
      </button>
    </>
  );
}

