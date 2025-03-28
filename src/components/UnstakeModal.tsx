'use client';

import { useState, useEffect } from 'react';
import { Dialog } from '@headlessui/react';
import { useWriteContract, useChainId, useAccount, usePublicClient } from 'wagmi';
import stakingAbi from '@/abi/CloudStaking.json';
import { CONTRACTS } from '@/constants/contracts';
import { formatUnits, parseUnits } from 'viem';
import { toast } from 'react-hot-toast';

export default function UnstakeModal({ isOpen, onClose, maxAmount, amountUnstaking, cooldownDays, refetchStakerData, refetchAvailableRewards }: {
  isOpen: boolean;
  onClose: () => void;
  maxAmount: bigint | undefined;
  amountUnstaking: bigint;
  cooldownDays: bigint;
  refetchStakerData: () => void;
  refetchAvailableRewards: () => void;
}) {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const { writeContractAsync } = useWriteContract();
  const chainId = useChainId();
  const { address } = useAccount();
  const amount = input ? parseUnits(input, 18) : 0n;
  const publicClient = usePublicClient();
	
  const handleUnstake = async () => {
    if (!address || !input) return;
    try {
      setLoading(true);
      const staking = CONTRACTS.STAKING_ADDRESSES[chainId];

      // Unstake
      const txHash = await writeContractAsync({
        abi: stakingAbi,
        address: staking,
        functionName: 'initiateUnstake',
        args: [amount],
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
      

      onClose();
    } catch (err) {
      console.error('Unstake failed', err);
      toast.error('Unstaking failed. Please try again.', { id: toastId });
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
        <Dialog.Title className="text-lg font-semibold mb-4 text-gray-800">Unstake</Dialog.Title>
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
            disabled={loading || !input}
            onClick={handleUnstake}
            className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Unstaking...' : 'Confirm Unstake'}
          </button>
          {amountUnstaking > 0n && (
            <p className="text-sm text-red-600 font-medium flex items-center gap-1">
              ⚠️ Unstaking will cancel any ongoing unstaking process.
            </p>
          )}
          <p className="text-sm text-gray-500 mt-2">
            After unstaking, your tokens will enter a {cooldownDays}-day cooldown. You’ll be able to claim them once the cooldown ends.
          </p>
        </div>
      </Dialog.Panel>
    </Dialog>
  );
}

