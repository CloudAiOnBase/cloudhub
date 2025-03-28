'use client';

import { useState } from 'react';
import { Dialog } from '@headlessui/react';
import { useWriteContract, useChainId, useAccount } from 'wagmi';
import tokenAbi from '@/abi/CloudToken.json';
import stakingAbi from '@/abi/CloudStaking.json';
import { CONTRACTS } from '@/constants/contracts';
import { formatUnits, parseUnits } from 'viem';
import { useAllowanceCheck } from '@/lib/hooks/useAllowanceCheck';




export default function StakeModal({ isOpen, onClose, maxAmount, refetchUserBalance, refetchStakerData }: {
  isOpen: boolean;
  onClose: () => void;
  maxAmount: bigint | undefined;
  refetchUserBalance: () => void;
  refetchStakerData: () => void;
}) {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const { writeContractAsync } = useWriteContract();
  const chainId = useChainId();
  const { address } = useAccount();
  const amount = input ? parseUnits(input, 18) : 0n;
	const { isEnough } = useAllowanceCheck(address, CONTRACTS.STAKE_VAULT_ADDRESSES[chainId], amount, chainId);


  const handleStake = async () => {
    if (!address || !input) return;
    try {
      setLoading(true);
      const token = CONTRACTS.TOKEN_ADDRESSES[chainId];
      const staking = CONTRACTS.STAKING_ADDRESSES[chainId];
			const stakeVault = CONTRACTS.STAKE_VAULT_ADDRESSES[chainId];

      // Approve
			if (!isEnough) {
		    await writeContractAsync({
		      abi: tokenAbi,
		      address: token,
		      functionName: 'approve',
		      args: [stakeVault, amount],
		    });
			}

      // Stake
      await writeContractAsync({
        abi: stakingAbi,
        address: staking,
        functionName: 'stake',
        args: [amount],
      });

			await refetchUserBalance();
			await refetchStakerData();

      onClose();
    } catch (err) {
      console.error('Stake failed', err);
    } finally {
      setLoading(false);
    }
  };

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
            disabled={loading || !input}
            onClick={handleStake}
            className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Staking...' : 'Confirm Stake'}
          </button>
					<p className="text-sm text-gray-500 mt-2">
						Unstaking cooldown lasts 7 days.
					</p>
        </div>
      </Dialog.Panel>
    </Dialog>
  );
}

