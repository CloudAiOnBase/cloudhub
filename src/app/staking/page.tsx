'use client';

import { useAccount, useChainId, useReadContract } from 'wagmi';
import tokenAbi from '@/abi/CloudToken.json';
import stakingAbi from '@/abi/CloudStaking.json';
import { formatUnits } from 'viem';
import { CONTRACTS } from '@/constants/contracts';
import {
  ArrowDownTrayIcon,
  ArrowUpRightIcon,
  ArrowDownLeftIcon,
  XCircleIcon,
} from '@heroicons/react/20/solid';

export default function StakingPage() {
  const { address: userAddress } = useAccount();
	const chainId = useChainId();
	const stakingAddress = CONTRACTS.STAKING_ADDRESSES[chainId];
	const tokenAddress = CONTRACTS.TOKEN_ADDRESSES[chainId];


  const { data: userBalance } = useReadContract({
    abi: tokenAbi,
    address: tokenAddress,
    functionName: 'balanceOf',
    args: [userAddress],
    query: { enabled: !!userAddress },
  });

  const { data: stakerData } = useReadContract({
    abi: stakingAbi,
    address: stakingAddress,
    functionName: 'stakers',
    args: [userAddress],
    query: { enabled: !!userAddress },
  });

  const { data: availableRewards } = useReadContract({
    abi: stakingAbi,
    address: stakingAddress,
    functionName: 'calculateRewards',
    args: [userAddress],
    query: { enabled: !!userAddress },
  });
 
	const format = (val?: bigint) => {
		if (val === undefined) return '0';

		const num = Number(formatUnits(val, 18));
		if (num % 1 === 0) return num.toLocaleString(); // no decimals

		const fixed = num.toFixed(2);
		return Number(fixed).toLocaleString(undefined, {
		  minimumFractionDigits: 2,
		  maximumFractionDigits: 2,
		});
	};

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Staking</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-2 gap-6">

        <div className="bg-white shadow rounded-lg p-4">
          <h2 className="text-sm font-medium text-gray-500">Available to Stake</h2>
					<div className="flex items-center justify-between mt-2">
						<p className="text-2xl font-bold text-gray-900">
             {format(userBalance)} CLOUD
		        </p>
						<button
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
          </div>
			  </div>

        <div className="bg-white shadow rounded-lg p-4">
          <h2 className="text-sm font-medium text-gray-500">Staked</h2>
          <div className="flex items-center justify-between mt-2">
						<p className="text-2xl font-bold text-gray-900">
             {format(stakerData?.[0] ?? 0n)} CLOUD
		        </p>
						<button
						disabled={!(stakerData?.[0] ?? 0n) || (stakerData?.[0] ?? 0n) === 0n}
						className={`flex items-center gap-2 font-medium py-2 px-4 rounded-full shadow-sm transition 
							${
								!(stakerData?.[0] ?? 0n) || (stakerData?.[0] ?? 0n) === 0n
									? 'bg-gray-300 text-gray-500 cursor-not-allowed'
									: 'bg-blue-600 hover:bg-blue-700 text-white'
							}`}
						>
						<ArrowDownLeftIcon className="h-5 w-5" />
							<span>Unstake</span>
						</button>
					</div>
        </div>

        <div className="bg-white shadow rounded-lg p-4">
          <h2 className="text-sm font-medium text-gray-500">Unstaking</h2>
          <div className="flex items-center justify-between mt-2">
						<p className="text-2xl font-bold text-gray-900">
             {format(stakerData?.[2] ?? 0n)} CLOUD
		        </p>
						<button
						disabled={!(stakerData?.[2] ?? 0n) || (stakerData?.[2] ?? 0n) === 0n}
						className={`flex items-center gap-2 font-medium py-2 px-4 rounded-full shadow-sm transition 
							${
								!(stakerData?.[2] ?? 0n) || (stakerData?.[2] ?? 0n) === 0n
									? 'bg-gray-300 text-gray-500 cursor-not-allowed'
									: 'bg-blue-600 hover:bg-blue-700 text-white'
							}`}
						>
						<XCircleIcon className="h-5 w-5" />
							<span>Cancel</span>
						</button>
					</div>
        </div>


				<div className="bg-white shadow rounded-lg p-4">
					<h2 className="text-sm font-medium text-gray-500">Available Rewards</h2>
					<div className="flex items-center justify-between mt-2">
						<p className="text-2xl font-bold text-gray-900">
							≈ {format(availableRewards)} CLOUD
						</p>
						<button
							disabled={!availableRewards || availableRewards === 0n}
							className={`flex items-center gap-2 font-medium py-2 px-4 rounded-full shadow-sm transition 
								${
									!availableRewards || availableRewards === 0n
										? 'bg-gray-300 text-gray-500 cursor-not-allowed'
										: 'bg-blue-600 hover:bg-blue-700 text-white'
								}`}
						>
							<ArrowDownTrayIcon className="h-5 w-5" />
							<span>Claim <span className="hidden md:inline">rewards</span></span>
						</button>
					</div>
				</div>

      </div>

			<div className="bg-white shadow rounded-lg p-6 flex flex-col items-center justify-center">
				<div className="w-40 h-40 rounded-full border-8 border-blue-500 flex flex-col items-center justify-center text-blue-700 text-center">
					<div className="text-sm font-medium mb-1">Delegated</div>
					<div className="text-xl font-bold">
						{format(stakerData?.[0] ?? 0n)}
					</div>
				</div>
			</div>

    </div>
  );
}

