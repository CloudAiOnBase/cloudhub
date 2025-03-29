'use client';

import { useState, useEffect } from 'react';
import { Dialog } from '@headlessui/react';
import { useWriteContract, useChainId, useAccount, usePublicClient } from 'wagmi';
import tokenAbi from '@/abi/CloudToken.json';
import stakingAbi from '@/abi/CloudStaking.json';
import { CONTRACTS } from '@/constants/contracts';
import { formatUnits, parseUnits } from 'viem';
import { useAllowanceCheck } from '@/lib/hooks/useAllowanceCheck';
import { toast } from 'react-hot-toast';

export default function StakeModal({ isOpen, onClose, maxAmount, amountUnstaking, minimumToStake, cooldownDays, refetchUserBalance, refetchStakerData, refetchAvailableRewards }: {
  isOpen: boolean;
  onClose: () => void;
  maxAmount: bigint | undefined;
  amountUnstaking: bigint;
  minimumToStake: bigint;
  cooldownDays: bigint;
  refetchUserBalance: () => void;
  refetchStakerData: () => void;
  refetchAvailableRewards: () => void;
}) {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const { writeContractAsync } = useWriteContract();
  const chainId = useChainId();
  type ChainId = keyof typeof CONTRACTS.STAKING_ADDRESSES;
  const stakeVaultAddress = CONTRACTS.STAKE_VAULT_ADDRESSES[chainId as ChainId];
 

  const { address } = useAccount();
  const amount = input ? parseUnits(input, 18) : 0n;
	const { isEnough } = useAllowanceCheck(address, stakeVaultAddress, amount, chainId);
  const publicClient = usePublicClient();
  const isBelowMinimum = amount < minimumToStake;

  let toastId2: string;

  const handleStake = async () => {
    if (!address || !input) return;
    try {
      setLoading(true);
      const token = CONTRACTS.TOKEN_ADDRESSES[chainId as ChainId];
      const staking = CONTRACTS.STAKING_ADDRESSES[chainId as ChainId];
      const stakeVault = CONTRACTS.STAKE_VAULT_ADDRESSES[chainId as ChainId];

      // Approve
			if (!isEnough) {
		    const txHash1 = await writeContractAsync({
		      abi: tokenAbi,
		      address: token as `0x${string}`,
		      functionName: 'approve',
		      args: [stakeVault, amount],
		    });

        toast.loading('Processing transaction 1 of 2...');

        if (!publicClient) return;
        await publicClient.waitForTransactionReceipt({ hash: txHash1 });

        toast.dismiss(); // no arguments = close all
			}

      // Stake
      const txHash2 = await writeContractAsync({
        abi: stakingAbi,
        address: staking as `0x${string}`,
        functionName: 'stake',
        args: [amount],
      });

      toastId2 = toast.loading('Waiting for confirmation...');

			// Wait for the transaction to be mined
      if (!publicClient) return;
			await publicClient.waitForTransactionReceipt({ hash: txHash2 });

			await refetchUserBalance();
			await refetchStakerData();
      await refetchAvailableRewards();

      toast.success(
        <>
          Transaction confirmed! <br />
          Rewards claimed automatically.
        </>,
        { id: toastId2 }
      );

      onClose();
    } catch (err) {
      console.error('Stake failed', err);
      toast.error('Staking failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

	useEffect(() => {
		if (isOpen) {
		  setInput('');
		}
	}, [isOpen]);

  return (
    <Dialog open={isOpen} onClose={onClose} className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/40" />
      <Dialog.Panel className="z-10 bg-white rounded-xl shadow-xl w-full max-w-md p-6">
        <Dialog.Title className="text-lg font-semibold mb-4 text-gray-800">Stake</Dialog.Title>
				<div className="space-y-4">
        	<div className="flex items-center gap-2">
						<input
							type="number"
							min="0"
							max={maxAmount ? Number(formatUnits(maxAmount, 18)) : undefined}
							placeholder="Enter amount"
							value={input}
							onChange={(e) => setInput(e.target.value)}
							className="flex-1 w-full border rounded px-4 py-2 text-gray-800 placeholder:text-gray-400"
						/>
						 <span className="text-sm text-gray-600 font-medium">CLOUD</span>
					</div>
          <button
            disabled={loading || !input || isBelowMinimum}
            onClick={handleStake}
            className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Staking...' : 'Confirm Stake'}
          </button>
          {amountUnstaking > 0n && (
            <p className="text-sm text-red-600 font-medium flex items-center gap-1">
              ⚠️ Staking will cancel any ongoing unstaking process.
            </p>
          )}
          {input && isBelowMinimum && (
            <p className="text-sm text-gray-500 mt-2">
              Minimum {Math.ceil(Number(formatUnits(minimumToStake, 18)))} CLOUD.
            </p>
          )}
          <p className="text-sm text-gray-500 mt-2">
            Once staked, your CLOUD tokens will be subject to a {cooldownDays}-day cooldown when you unstake.
          </p>
        </div>
      </Dialog.Panel>
    </Dialog>
  );
}

