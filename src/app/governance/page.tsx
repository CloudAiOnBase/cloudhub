'use client';

import { useEffect, useState, useMemo } from 'react';
import { useAccount, useChainId, useReadContract, useReadContracts, usePublicClient } from 'wagmi';
import type { Abi } from 'viem'
import { CONTRACTS } from '@/constants/contracts'
import rawGovernorAbi from '@/abi/CloudGovernor.json';
import ProposalForm from '@/components/ProposalForm';
import { formatUnits,parseUnits } from 'viem';
import Link from 'next/link'


export default function GovernancePage() {
  const governorAbi = rawGovernorAbi as Abi;
  const [showModal, setShowModal]   = useState(false);
  const [lastIndex, setLastIndex]   = useState<number | null>(null);
  const [startIndex, setStartIndex] = useState<number | null>(null);
  const [propsPerPage, setPropsPerPage] = useState<number | null>(null);

  const chainId         = useChainId();
  type ChainId          = keyof typeof CONTRACTS.STAKING_ADDRESSES;
  const governorAddress = CONTRACTS.GOVERNOR_ADDRESSES[chainId as ChainId];
  const publicClient    = usePublicClient()
  const [latestBlock, setLatestBlock] = useState<{
    number: bigint
    timestamp: bigint
  } | null>(null)


  type ProposalMetadata = [
    string,              // proposer
    string,              // title
    string,              // description
    string[],            // targets
    bigint[],            // values
    `0x${string}`[],     // calldatas
    bigint,              // timestamp
    bigint,              // block
    bigint,              // quorum
    bigint,              // totalVP
    boolean              // depositClaimed
  ];


  type VotingTimeInfo = {
    label: string;
    content: string;
  };


   // current block
  useEffect(() => {
    async function fetchBlock() {
      if (!publicClient) return;
      const block = await publicClient.getBlock()
      setLatestBlock({
        number: block.number,
        timestamp: block.timestamp,
      })
    }
    fetchBlock()
  }, [publicClient])


  // Proposals count
  const {
    data: lastIndexRaw,
    refetch: refetchLastIndexRaw,
  } = useReadContract({
    abi: governorAbi,
    address: governorAddress as `0x${string}`,
    functionName: 'getProposalCount',
    query: {},
  });

  // On first load or update
  useEffect(() => {
    if (lastIndexRaw !== undefined) {
      const computedLastIndex     = Number(lastIndexRaw);
      const computedPropsPerPage  = Math.min(computedLastIndex, 10);

      setPropsPerPage(Math.min(computedLastIndex, 10));
      //console.log(propsPerPage)
      setLastIndex(computedLastIndex);
      setStartIndex(Math.max(0, computedLastIndex - computedPropsPerPage- 1));
    }
  }, [lastIndexRaw]);

  // Manual refresh
  const refreshProposalList = async () => {
    const { data } = await refetchLastIndexRaw();
    //console.log(propsPerPage)
    const computedLastIndex     = Number(data);
    const computedPropsPerPage  = Math.min(computedLastIndex, 10);

    setPropsPerPage(Math.min(computedLastIndex, 10));
    setLastIndex(computedLastIndex);
    setStartIndex(Math.max(0, computedLastIndex - computedPropsPerPage - 1));
    //console.log(computedStartIndex)
  };

  // Gov params
  const {
    data: govParams
  } = useReadContract({
    abi: governorAbi,
    address: governorAddress as `0x${string}`,
    functionName: 'getGovernanceParams',
    query: {},
  }) as {
    data: [bigint, bigint, bigint, bigint, bigint] | undefined;
  };

  // Gov proposals
  const {
    data: govProposals,
    isLoading: loadingProposals,
    error: proposalsError,
    refetch: refetchProposals,
  } = useReadContract({
    abi: governorAbi,
    address: governorAddress as `0x${string}`,
    functionName: 'getProposalsPaginated',
    args: startIndex !== null ? [startIndex, propsPerPage] : undefined,
    query: {
      enabled: startIndex !== null,
    },
  }) as {
    data: bigint[] | undefined
    isLoading: boolean
    error: unknown
    refetch: () => void
  };

if (typeof window !== 'undefined') {
  (window as any).refreshProposalList = refreshProposalList;
}

  // Gov proposal 
  const proposalCalls = govProposals?.flatMap((proposalId) => [
    {
      abi: governorAbi,
      address: governorAddress as `0x${string}`,
      functionName: 'proposalsMetadata',
      args: [proposalId],
    },
    {
      abi: governorAbi,
      address: governorAddress as `0x${string}`,
      functionName: 'state',
      args: [proposalId],
    },
    {
      abi: governorAbi,
      address: governorAddress as `0x${string}`,
      functionName: 'proposalSnapshot',
      args: [proposalId],
    },
  ]) || []

  const {
    data: proposalResults,
    //isLoading: loadingProposals,
    //error: proposalsError,
  } = useReadContracts({
    contracts: proposalCalls,
    query: {
      enabled: !!govProposals,
    },
  })

  const proposalData = govProposals?.map((proposalId: bigint, i: number) => ({
    id: proposalId,
    metadata: proposalResults?.[i * 3]?.result as ProposalMetadata,
    state: proposalResults?.[i * 3 + 1]?.result as number,
    snapshot: proposalResults?.[i * 3 + 2]?.result as bigint,
  }));
  console.log(proposalData);

  function mapState(state: number): { label: string; color: string; bg: string } {
    const map: Record<number, { label: string; color: string; bg: string }> = {
      0: { label: 'Pending',   color: 'text-yellow-500',  bg: 'bg-yellow-100' },
      1: { label: 'Voting',    color: 'text-purple-700',  bg: 'bg-purple-100' },
      2: { label: 'Canceled',  color: 'text-gray-400',    bg: 'bg-gray-100' },
      3: { label: 'Defeated',  color: 'text-red-500',     bg: 'bg-red-100' },
      4: { label: 'Succeeded', color: 'text-emerald-600', bg: 'bg-emerald-100' },
      7: { label: 'Executed',  color: 'text-blue-500',    bg: 'bg-blue-100' },
    }

    return map[state] || {
      label: 'Unknown',
      color: 'text-gray-500',
      bg: 'bg-gray-100',
    }
  }

  const format = (val?: bigint, decimals: number = 2) => {
    if (val === undefined) return '0';

    const num = Number(formatUnits(val, 18));

    if (Number.isInteger(num)) return Math.floor(num).toLocaleString();

    const factor = 10 ** decimals;
    const floored = Math.floor(num * factor) / factor;

    return floored.toLocaleString(undefined, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  };


  function getVotingTimeLeft(
    state: number,
    snapshot: bigint,
    latestBlockNumber: bigint,
    votingPeriod: bigint,
    averageBlockTime = 2
  ): VotingTimeInfo {
    switch (state) {
      case 0: { // Pending
        const remainingBlocks = snapshot - latestBlockNumber
        if (remainingBlocks <= 0n) return { label: 'Voting', content: 'starts soon' }

        const secondsLeft = Number(remainingBlocks) * averageBlockTime
        const minutes = Math.floor(secondsLeft / 60)
        const hours = Math.floor(minutes / 60)

        if (hours > 0) return { label: 'Starts in', content: `${hours} hour${hours > 1 ? 's' : ''}` }
        if (minutes > 0) return { label: 'Starts in', content: `${minutes} minute${minutes > 1 ? 's' : ''}` }
        return { label: 'Starts in', content: 'less than a minute' }
      }

      case 1: { // Active
        const endBlock = snapshot + (votingPeriod * 86400n / 2n)
        const remainingBlocks = endBlock - latestBlockNumber
        if (remainingBlocks <= 0n) return { label: 'Voting', content: 'ended' }

        const secondsLeft = Number(remainingBlocks) * averageBlockTime
        const minutes = Math.floor(secondsLeft / 60)
        const hours = Math.floor(minutes / 60)
        const days = Math.floor(hours / 24)

        if (days > 0) return { label: 'Ends in', content: `${days} day${days > 1 ? 's' : ''}` }
        if (hours > 0) return { label: 'Ends in', content: `${hours} hour${hours > 1 ? 's' : ''}` }
        if (minutes > 0) return { label: 'Ends in', content: `${minutes} minute${minutes > 1 ? 's' : ''}` }
        return { label: 'Ends in', content: 'less than a minute' }
      }

      case 2: return { label: 'Status', content: 'Canceled' }
      case 3: return { label: 'Status', content: 'Defeated' }
      case 4: return { label: 'Status', content: 'Succeeded' }
      case 7: return { label: 'Status', content: 'Executed' }
      default: return { label: 'Status', content: 'Unknown' }
    }
  }



  //console.log(govProposals);

  const reversedProposals = useMemo(() => proposalData?.slice().reverse(), [proposalData])

  return (
    <>
      {/* Modal */}
      {showModal && <ProposalForm onClose={() => setShowModal(false)} refreshProposalList={refreshProposalList} />}

      {/* Main Page Content */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-800">Governance</h1>
          <button
            onClick={() => setShowModal(true)}
            className="px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 text-sm font-semibold"
          >
            New Proposal
          </button>
        </div>

        {loadingProposals && <p className="text-gray-600">Loading proposals...</p>}
        {proposalsError ? <p className="text-gray-600">No proposals</p> : null}


        {(govProposals && latestBlock && govParams) as unknown as React.ReactNode && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {reversedProposals?.map((p, i) => {


             const status = mapState(p.state as number);

            const timeInfo = getVotingTimeLeft(
              p.state as number,
              p.snapshot as bigint,
              latestBlock?.number ?? 0n,
              govParams?.[0] ?? 0n
            );

              return (
                <div key={p.id.toString()} className="bg-white shadow rounded-lg p-4 space-y-4">
                  <div className="flex justify-between items-start">
                    <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${status.color} ${status.bg}`}>
                      {status.label}
                    </span>
                    <span className="text-xs text-gray-400 font-medium">
                      ID: {Number(startIndex) + ((proposalData?.length ?? 0) - i)}
                    </span>
                  </div>

                  <Link href={`/governance/${Number(startIndex) + ((proposalData?.length ?? 0)  - i)}`} className="block mb-3">
                    <h2 className="text-lg font-semibold text-blue-700 hover:underline">
                      {p.metadata?.[1] || 'Untitled'}
                    </h2>
                  </Link>

                  <p className="text-xs text-gray-500">
                    Submitted at —{' '}
                    {p.metadata?.[3]
                      ? new Date(Number(p.metadata[3]) * 1000).toLocaleString()
                      : '...'}
                  </p>
                  <div className="flex items-center justify-between mt-4">
                    <div className="relative w-16 h-16">
                      <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                        <circle cx="50" cy="50" r="45" stroke="#d1d5db" strokeWidth="10" fill="none" />
                        <circle
                          cx="50"
                          cy="50"
                          r="45"
                          stroke="#3b82f6"
                          strokeWidth="10"
                          strokeDasharray="282.6"
                          strokeDashoffset={0}
                          fill="none"
                          strokeLinecap="round"
                        />
                      </svg>
                    </div>
                    <div className="text-sm text-gray-600">
                      {timeInfo.label} <br />
                      <span className="font-medium text-gray-900">{timeInfo.content}</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        <div className="mt-6 flex justify-center gap-4">
          <button
            className="px-4 py-2 rounded bg-white text-gray-300 border border-gray-200 shadow-sm font-medium"
            disabled
          >
            Previous
          </button>
          <button
            className="px-4 py-2 rounded bg-white text-gray-300 border border-gray-200 shadow-sm font-medium"
            disabled
          >
            Next
          </button>
        </div>


        {/* Bottom Info Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600 text-center">
          <div>
            <span className="font-bold text-gray-900">Voting period</span><br />
            {govParams?.[0]} days
          </div>
          <div>
            <span className="font-bold text-gray-900">Deposit</span><br />
            {typeof govParams?.[1] === 'bigint' ? format(govParams[1] * 10n ** 18n) + ' CLOUD' : '...'}
          </div>
          <div>
            <span className="font-bold text-gray-900">Quorum</span><br />
            {govParams?.[2]}%
          </div>
        </div>
      </div>
    </>
  );
}
