'use client';

import { useEffect, useState } from "react";
import { useAccount, useChainId, useReadContract } from 'wagmi';
import tokenAbi from '@/abi/CloudToken.json'; // ERC20 ABI
import stakingAbi from '@/abi/CloudStaking.json';
import { formatUnits,parseUnits } from 'viem';
import { CONTRACTS } from '@/constants/contracts';
import StakeButton from '@/components/StakeButton';
import UnstakeButton from '@/components/UnstakeButton';
import CancelUnstakeButton from '@/components/CancelUnstakeButton';
import ClaimUnstakedButton from '@/components/ClaimUnstakedButton';
import ClaimRewardsButton from '@/components/ClaimRewardsButton';

export default function StakingPage() {
  const { address: userAddress } = useAccount();
	const chainId = useChainId();
	const stakingAddress = CONTRACTS.STAKING_ADDRESSES[chainId];
	const tokenAddress = CONTRACTS.TOKEN_ADDRESSES[chainId];


  const { data: userBalance, refetch: refetchUserBalance } = useReadContract({
    abi: tokenAbi,
    address: tokenAddress,
    functionName: 'balanceOf',
    args: [userAddress],
		query: {
		  enabled: !!userAddress,
		  queryKey: ['userBalance', userAddress],
		},
  });

	const { data: stakerData, refetch: refetchStakerData } = useReadContract({
		abi: stakingAbi,
		address: stakingAddress,
		functionName: 'stakers',
		args: [userAddress],
		query: {
		  enabled: !!userAddress,
		  queryKey: ['stakerData', userAddress],
		},
	});

  const { data: availableRewards, refetch: refetchAvailableRewards } = useReadContract({
    abi: stakingAbi,
    address: stakingAddress,
    functionName: 'calculateRewards',
    args: [userAddress],
    query: { 
			enabled: !!userAddress,
			queryKey: ['availableRewards', userAddress]
		},
  });
 
	const { data: stakingParams } = useReadContract({
		abi: stakingAbi,
		address: stakingAddress,
		functionName: "getStakingParams",
		query: {
		  enabled: Boolean(userAddress),
		},
	});

  const { data: aprE2 } = useReadContract({
		abi: stakingAbi,
		address: stakingAddress,
		functionName: "getAprE2",
		query: {
		  enabled: Boolean(userAddress),
		},
	});

	const now = Date.now(); // current time in ms
	const nowSeconds = Math.floor(now / 1000);
	const [timeLeft, setTimeLeft] = useState("");

	// Staking info
	const staked = stakerData?.[0] ?? 0n;
	const lastClaim = Number(stakerData?.[1] ?? 0);
	const unstakingAmount = stakerData?.[2] ?? 0n;
	const unstakingStartTime = Number(stakerData?.[3] ?? 0) * 1000;
	const totalEarned = stakerData?.[4] ?? 0n;

	// Cooldown logic
	const cooldownDays = Number(stakingParams?.[1] ?? 0);
	const cooldownMs = cooldownDays * 24 * 60 * 60 * 1000;
	const claimableTimestamp = unstakingStartTime + cooldownMs;
	const canClaim = now >= claimableTimestamp && unstakingAmount > 0n;

	// Minimum to stake
	const minimum = parseUnits(String(stakingParams?.[0] ?? '0'), 18);
	const minimumToStake = minimum > staked ? minimum - staked : 0n;

	// % Staked
	const balance = userBalance ?? 0n;
	const total = staked + balance;
	const stakedPercent = total > 0n ? Number((staked * 10000n) / total) / 100 : 0;

	// Time since last claim
	const secondsPassed = nowSeconds - lastClaim;
	const formatTimeAgo = (seconds: number): string => {
	  const minutes = Math.floor(seconds / 60);
	  const hours = Math.floor(minutes / 60);
	  const days = Math.floor(hours / 24);

	  if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
	  if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
	  if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
	  return 'Just now';
	};

	const timePassed = formatTimeAgo(secondsPassed);

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

	useEffect(() => {
		const updateTime = () => {
		  const now = Date.now();
		  const remaining = claimableTimestamp - now;

		  if (remaining <= 0) {
		    setTimeLeft("Ready to claim");
		  } else {
		    const days = Math.floor(remaining / (1000 * 60 * 60 * 24));
		    const hours = Math.floor((remaining / (1000 * 60 * 60)) % 24);
		    const minutes = Math.floor((remaining / (1000 * 60)) % 60);
		    setTimeLeft(`${days}d ${hours}h ${minutes}m remaining`);
		  }
		};

		updateTime();
		const interval = setInterval(updateTime, 60000); // update every minute
		return () => clearInterval(interval);
	}, [claimableTimestamp]);

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
						<StakeButton
							userBalance={userBalance}
							amountUnstaking={stakerData?.[2] ?? 0n}
							minimumToStake={minimumToStake}
							cooldownDays={cooldownDays}
							refetchUserBalance={refetchUserBalance}
							refetchStakerData={refetchStakerData}
							refetchAvailableRewards={refetchAvailableRewards}
						/>
          </div>
			  </div>

        <div className="bg-white shadow rounded-lg p-4">
          <h2 className="text-sm font-medium text-gray-500">Staked</h2>
          <div className="flex items-center justify-between mt-2">
						<p className="text-2xl font-bold text-gray-900">
             {format(stakerData?.[0] ?? 0n)} CLOUD
		        </p>
						<UnstakeButton
							maxUnstakable={stakerData?.[0] ?? 0n}
							amountUnstaking={stakerData?.[2] ?? 0n}
							cooldownDays={cooldownDays}
							refetchStakerData={refetchStakerData}
							refetchAvailableRewards={refetchAvailableRewards}
						/>
					</div>
        </div>

        <div className="bg-white shadow rounded-lg p-4">
          <h2 className="text-sm font-medium text-gray-500">Unstaking</h2>
          <div className="flex items-center justify-between mt-2">
						<p className="text-2xl font-bold text-gray-900">
             {format(stakerData?.[2] ?? 0n)} CLOUD
		        </p>
						{stakerData?.[2]  && (
	            <div className="text-sm text-gray-500 mt-1">{timeLeft}</div>
						)}
						{canClaim ? (
							<ClaimUnstakedButton
								amountUnstaked={stakerData?.[2] ?? 0n}
								refetchUserBalance={refetchUserBalance}
								refetchStakerData={refetchStakerData}
								refetchAvailableRewards={refetchAvailableRewards}
							/>
						) : (
							<CancelUnstakeButton
								amountUnstaking={stakerData?.[2] ?? 0n}
								refetchStakerData={refetchStakerData}
								refetchAvailableRewards={refetchAvailableRewards}
							/>
						)}
					</div>
        </div>


				<div className="bg-white shadow rounded-lg p-4">
					<div className="flex items-center justify-between gap-2">
					  <h2 className="text-sm font-medium text-gray-500">Available Rewards</h2>
					  <span className="px-2 py-0.5 text-green-700 bg-green-50 rounded text-xs font-medium">
					    {aprE2 !== undefined && aprE2 !== null && (
							  <span>{(Number(aprE2) / 100).toFixed(2)}% APR</span>
							)}
					  </span>
				  </div>

					<div className="flex items-center justify-between mt-2">
						<p className="text-2xl font-bold text-gray-900">
							≈ {format(availableRewards)} CLOUD
						</p>
						{staked > 1n && totalEarned > 1n && lastClaim > 0 && (
						  <div className="text-sm text-gray-500 mt-1">
						    Last claimed {timePassed}
						  </div>
						)}
						<ClaimRewardsButton
							availableRewards={availableRewards}
							refetchUserBalance={refetchUserBalance}
							refetchAvailableRewards={refetchAvailableRewards}
						/>
					</div>
				</div>

      </div>

			<div className="bg-white shadow rounded-lg p-6 flex flex-col items-center justify-center">
				<div className="relative w-40 h-40">
				  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
				    <circle
				      cx="50"
				      cy="50"
				      r="45"
				      stroke="#d1d5db" // Tailwind gray-300
				      strokeWidth="10"
				      fill="none"
				    />
				    <circle
				      cx="50"
				      cy="50"
				      r="45"
				      stroke="#3b82f6" // Tailwind blue-500
				      strokeWidth="10"
				      strokeDasharray="282.6"
				      strokeDashoffset={282.6 - (282.6 * stakedPercent) / 100}
				      fill="none"
				      strokeLinecap="round"
				    />
				  </svg>

				  <div className="absolute inset-0 flex flex-col items-center justify-center text-blue-700 text-center">
				    <div className="text-sm font-medium mb-1">Staked</div>
				    <div className="text-xl font-bold">{format(staked)}</div>
						<div className="text-sm font-bold">CLOUD</div>
				    <div className="text-xs text-gray-500">{stakedPercent.toFixed(1)}%</div>
				  </div>
				</div>
			</div>

    </div>
  );
}

