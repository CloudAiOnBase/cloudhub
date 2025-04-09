'use client';

import { useEffect, useState, useMemo } from 'react';
import {
  useAccount,
  useChainId,
  useReadContract,
  useReadContracts,
  usePublicClient,
} from 'wagmi';
import type { Abi } from 'viem';
import { CONTRACTS } from '@/constants/contracts';
import rawGovernorAbi from '@/abi/CloudGovernor.json';
import ProposalForm from '@/components/ProposalForm';
import { formatUnits, parseUnits } from 'viem';
import Link from 'next/link';

import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import clsx from 'clsx';

export default function GovernancePage() {
  // ==========================
  // Constants & State Variables
  // ==========================
  const governorAbi = rawGovernorAbi as Abi;
  const [showModal, setShowModal] = useState(false);
  const [lastIndex, setLastIndex] = useState<number | null>(null);
  const [startIndex, setStartIndex] = useState<number | null>(null);
  const [propsPerPage, setPropsPerPage] = useState<number | null>(null);
  const [latestBlock, setLatestBlock] = useState<{
    number: bigint;
    timestamp: bigint;
  } | null>(null);

  const chainId = useChainId();
  type ChainId = keyof typeof CONTRACTS.STAKING_ADDRESSES;
  const governorAddress = CONTRACTS.GOVERNOR_ADDRESSES[chainId as ChainId];
  const publicClient = usePublicClient();

  // ==========================
  // Type Definitions
  // ==========================
  type ProposalMetadata = [
    string,            // proposer
    string,            // title
    string,            // description
    string[],          // targets
    bigint[],          // values
    `0x${string}`[],   // calldatas
    bigint,            // timestamp
    bigint,            // block
    bigint,            // quorum
    bigint,            // totalVP
    boolean            // depositClaimed
  ];

  type VotingTimeInfo = {
    label: string;
    content: string;
  };

  // ==========================
  // Fetch Current Block
  // ==========================
  useEffect(() => {
    async function fetchBlock() {
      if (!publicClient) return;
      const block = await publicClient.getBlock();
      setLatestBlock({
        number: block.number,
        timestamp: block.timestamp,
      });
    }
    fetchBlock();
  }, [publicClient]);

  // ==========================
  // Fetch Proposals Count
  // ==========================
  const {
    data: lastIndexRaw,
    refetch: refetchLastIndexRaw,
  } = useReadContract({
    abi: governorAbi,
    address: governorAddress as `0x${string}`,
    functionName: 'getProposalCount',
    query: {},
  });

  useEffect(() => {
    if (lastIndexRaw !== undefined) {
      const computedLastIndex = Number(lastIndexRaw);
      const computedPropsPerPage = Math.min(computedLastIndex, 10);
      setPropsPerPage(computedPropsPerPage);
      setLastIndex(computedLastIndex);
      setStartIndex(Math.max(0, computedLastIndex - computedPropsPerPage - 1));
    }
  }, [lastIndexRaw]);

  // ==========================
  // Manual Refresh of Proposals List
  // ==========================
  const refreshProposalList = async () => {
    const { data } = await refetchLastIndexRaw();
    const computedLastIndex = Number(data);
    const computedPropsPerPage = Math.min(computedLastIndex, 10);
    setPropsPerPage(computedPropsPerPage);
    setLastIndex(computedLastIndex);
    setStartIndex(Math.max(0, computedLastIndex - computedPropsPerPage - 1));
  };

  if (typeof window !== 'undefined') {
    (window as any).refreshProposalList = refreshProposalList;
  }

  // ==========================
  // Fetch Governance Parameters
  // ==========================
  const { data: govParams } = useReadContract({
    abi: governorAbi,
    address: governorAddress as `0x${string}`,
    functionName: 'getGovernanceParams',
    query: {},
  }) as {
    data: [bigint, bigint, bigint, bigint, bigint] | undefined;
  };

  // ==========================
  // Fetch Governance Proposals (Paginated)
  // ==========================
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
    query: { enabled: startIndex !== null },
  }) as {
    data: bigint[] | undefined;
    isLoading: boolean;
    error: unknown;
    refetch: () => void;
  };

  // ==========================
  // Fetch Proposal Details
  // ==========================
  const proposalCalls =
    govProposals?.flatMap((proposalId) => [
      { abi: governorAbi, address: governorAddress as `0x${string}`, functionName: 'proposalsMetadata', args: [proposalId],},
      { abi: governorAbi, address: governorAddress as `0x${string}`, functionName: 'state',             args: [proposalId],},
      { abi: governorAbi, address: governorAddress as `0x${string}`, functionName: 'proposalVotes',     args: [proposalId],},
      { abi: governorAbi, address: governorAddress as `0x${string}`, functionName: 'proposalDeadline',  args: [proposalId],},
    ]) || [];

  const { data: proposalResults } = useReadContracts({
    contracts: proposalCalls,
    query: { enabled: !!govProposals },
  });

  const proposalData = govProposals?.map((proposalId: bigint, i: number) => ({
    id: proposalId,
    metadata: proposalResults?.[i * 4]?.result as ProposalMetadata,
    state:    proposalResults?.[i * 4 + 1]?.result as number,
    votes:    proposalResults?.[i * 4 + 2]?.result as [bigint, bigint, bigint] | undefined,
    deadline: proposalResults?.[i * 4 + 3]?.result as bigint,
  }));

  // ==========================
  // Helper Functions
  // ==========================
  function mapState(state: number): { label: string; color: string; bg: string } {
    const stateMap: Record<number, { label: string; color: string; bg: string }> = {
      0: { label: 'Pending', color: 'text-yellow-500', bg: 'bg-yellow-100' },
      1: { label: 'Voting', color: 'text-purple-700', bg: 'bg-purple-100' },
      2: { label: 'Canceled', color: 'text-gray-400', bg: 'bg-gray-100' },
      3: { label: 'Defeated', color: 'text-red-500', bg: 'bg-red-100' },
      4: { label: 'Succeeded', color: 'text-emerald-600', bg: 'bg-emerald-100' },
      7: { label: 'Executed', color: 'text-blue-500', bg: 'bg-blue-100' },
    };
    return stateMap[state] || { label: 'Unknown', color: 'text-gray-500', bg: 'bg-gray-100' };
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
    votingDeadline: bigint,
    averageBlockTime = 2
  ): VotingTimeInfo {
    switch (state) {
      case 0: {
        // Pending
        const remainingBlocks = snapshot - latestBlockNumber;
        if (remainingBlocks <= 0n)
          return { label: 'Voting', content: 'starts soon' };
        const secondsLeft = Number(remainingBlocks) * averageBlockTime;
        const minutes = Math.floor(secondsLeft / 60);
        const hours = Math.floor(minutes / 60);
        if (hours > 0)
          return { label: 'Starts in', content: `${hours} hour${hours > 1 ? 's' : ''}` };
        if (minutes > 0)
          return { label: 'Starts in', content: `${minutes} minute${minutes > 1 ? 's' : ''}` };
        return { label: 'Starts in', content: 'less than a minute' };
      }
      case 1: {
        // Active
        const endBlock = votingDeadline;
        const remainingBlocks = endBlock - latestBlockNumber;
        if (remainingBlocks <= 0n)
          return { label: 'Voting', content: 'ended' };
        const secondsLeft = Number(remainingBlocks) * averageBlockTime;
        const minutes = Math.floor(secondsLeft / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);
        if (days > 0)
          return { label: 'Ends in', content: `${days} day${days > 1 ? 's' : ''}` };
        if (hours > 0)
          return { label: 'Ends in', content: `${hours} hour${hours > 1 ? 's' : ''}` };
        if (minutes > 0)
          return { label: 'Ends in', content: `${minutes} minute${minutes > 1 ? 's' : ''}` };
        return { label: 'Ends in', content: 'less than a minute' };
      }
      case 2:
        return { label: 'Status', content: 'Canceled' };
      case 3:
        return { label: 'Status', content: 'Defeated' };
      case 4:
        return { label: 'Status', content: 'Succeeded' };
      case 7:
        return { label: 'Status', content: 'Executed' };
      default:
        return { label: 'Status', content: 'Unknown' };
    }
  }


  // ==========================
  // Memoize Reversed Proposals
  // ==========================
  const reversedProposals = useMemo(() => proposalData?.slice().reverse(), [proposalData]);

  // ==========================
  // Render Component
  // ==========================
  return (
    <>
      {/* Modal */}
      {showModal && (
        <ProposalForm onClose={() => setShowModal(false)} refreshProposalList={refreshProposalList} />
      )}

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

        {(govProposals && latestBlock && govParams) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {reversedProposals?.map((p, i) => {
              const status = mapState(p.state as number);
              const timeInfo = getVotingTimeLeft(
                p.state as number,
                p.metadata?.[7] ?? 0n,
                latestBlock?.number ?? 0n,
                p.deadline ?? 0n
              );


             const formatVotes = (v: bigint | undefined) => Number(v || 0n) / 1e18;

              // Order: [no, yes, abstain]
              const yes = formatVotes(p.votes?.[1]);
              const no = formatVotes(p.votes?.[0]);
              const abstain = formatVotes(p.votes?.[2]);
              const total = yes + no + abstain;
              // Use safeTotal to avoid division by zero
              const safeTotal = total || 1;

              // Calculate percentages for each vote
              const yesPct = (yes / safeTotal) * 100;
              const noPct = (no / safeTotal) * 100;
              const abstainPct = 100 - (yesPct + noPct);

              const COLORS = {
                for: '#4ade80',      // green
                against: '#f87171',  // red
                abstain: '#d1d5db',  // gray
              };

              const data = [
                { name: 'For', value: yesPct, color: COLORS.for },
                { name: 'Against', value: noPct, color: COLORS.against },
                { name: 'Abstain', value: abstainPct, color: COLORS.abstain },
              ];

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

                  <Link
                    href={`/governance/${Number(startIndex) + ((proposalData?.length ?? 0) - i)}`}
                    className="block mb-3"
                  >
                    <h2 className="text-lg font-semibold text-blue-700 hover:underline">
                      {p.metadata?.[1] || 'Untitled'}
                    </h2>
                  </Link>

                  <p className="text-xs text-gray-500">
                    Submitted at —{' '}
                    {p.metadata?.[6]
                      ? new Date(Number(p.metadata[6]) * 1000).toLocaleString(undefined, {
                        dateStyle: 'long',
                        timeStyle: 'short',
                      })  : '...'}
                  </p>
                  <div className="flex items-center justify-between mt-4">

                  <div className="w-26 h-26 relative">
                    <div
                      className={clsx(
                        'w-full h-full rounded-full transition-shadow duration-500',
                      )}
                    >
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={data}
                            cx="50%"
                            cy="50%"
                            innerRadius={32}
                            outerRadius={50}
                            dataKey="value"
                            stroke="none"
                            isAnimationActive={true}
                            animationDuration={600}
                            animationEasing="ease-in-out"
                            paddingAngle={0.5}
                          >
                            {data.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                        </PieChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-sm font-semibold text-gray-500">
                      {yesPct}%
                    </div>
                  </div>

                    <div className="text-sm text-gray-600">
                      {timeInfo.label} <br />
                      <span className="font-medium text-gray-900">{timeInfo.content}</span>
                    </div>
                  </div>
                </div>
              );
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
            <span className="font-bold text-gray-900">Voting period</span>
            <br />
            {govParams?.[0]} days
          </div>
          <div>
            <span className="font-bold text-gray-900">Deposit</span>
            <br />
            {typeof govParams?.[1] === 'bigint'
              ? format(govParams[1] * 10n ** 18n) + ' CLOUD'
              : '...'}
          </div>
          <div>
            <span className="font-bold text-gray-900">Quorum</span>
            <br />
            {govParams?.[2]}%
          </div>
        </div>
      </div>
    </>
  );
}
