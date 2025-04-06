'use client'

import { useMemo, useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  useReadContract,
  useWriteContract,
  useAccount,
  useChainId,
  useReadContracts,
  usePublicClient,
} from 'wagmi'
import type { Abi } from 'viem'
import { CONTRACTS } from '@/constants/contracts'
import rawGovernorAbi from '@/abi/CloudGovernor.json'
import sanitizeHtml from 'sanitize-html'
import { formatUnits, parseUnits, keccak256, toBytes, decodeFunctionData } from 'viem'
import { toast } from 'react-hot-toast'
import { ChevronLeft } from 'lucide-react'

export default function ProposalPage() {

  // ---------------------------
  // Initialization & Contract Setup
  // ---------------------------
  const governorAbi = rawGovernorAbi as Abi
  const router = useRouter()
  const chainId = useChainId()
  type ChainId = keyof typeof CONTRACTS.STAKING_ADDRESSES
  const governorAddress = CONTRACTS.GOVERNOR_ADDRESSES[chainId as ChainId]

  const { writeContractAsync } = useWriteContract()
  const { proposalIndex } = useParams()
  const { address } = useAccount()
  const publicClient = usePublicClient()

  // ---------------------------
  // State Variables
  // ---------------------------
  const [vote, setVote] = useState<'yes' | 'no' | 'abstain' | 'spam' | null>(null)
  const [lastSubmittedVote, setLastSubmittedVote] = useState<null | 'yes' | 'no' | 'abstain' | 'spam'>(null)
  const [isVoting, setIsVoting] = useState(false)
  const [latestBlock, setLatestBlock] = useState<{ number: bigint; timestamp: bigint } | null>(null)

  // ---------------------------
  // Types
  // ---------------------------
  type ProposalData = {
    id: bigint | undefined
    state: number | undefined
    metadata:
      | [
          string,          // proposer
          string,          // title
          string,          // description
          string[],        // targets
          bigint[],        // values
          `0x${string}`[], // calldatas
          bigint,          // timestamp
          bigint,          // block
          bigint,          // quorum
          bigint,          // totalVP
          bigint,          // depositAmount
          boolean          // depositClaimed
        ]
      | undefined
    votes?: [bigint, bigint, bigint] // [no, yes, abstain]
    totalVotes: bigint
    vetos?: bigint
    myVote?: number
    myVoteWeight?: bigint
  }

  // ---------------------------
  // Data Fetching Hooks
  // ---------------------------
  // Fetch current block
  useEffect(() => {
    async function fetchBlock() {
      if (!publicClient) return
      const block = await publicClient.getBlock()
      setLatestBlock({
        number: block.number,
        timestamp: block.timestamp,
      })
    }
    fetchBlock()
  }, [publicClient])

  // Parse Proposal Index
  const parsedIndex = useMemo(() => {
    try {
      return BigInt(Number(proposalIndex ?? '1') - 1)
    } catch {
      return 0n
    }
  }, [proposalIndex])

  // Gov Params: Read Governance Parameters
  const { data: govParams } = useReadContract({
    abi: governorAbi,
    address: governorAddress as `0x${string}`,
    functionName: 'getGovernanceParams',
    query: {},
  }) as { data: [bigint, bigint, bigint, bigint] | undefined }

  // Fetch Proposal ID
  const { data: proposalsRaw } = useReadContract({
    abi: governorAbi,
    address: governorAddress as `0x${string}`,
    functionName: 'getProposalsPaginated',
    args: [parsedIndex, 1],
  })
  const proposals = proposalsRaw as bigint[]
  const proposalId = useMemo(() => {
    if (!proposals?.[0]) return undefined
    return BigInt(proposals[0])
  }, [proposals])

  // Fetch Proposal Metadata & Votes
  const proposalCalls = useMemo(() => {
    if (!proposalId || !address) return []
    return [
      { abi: governorAbi, address: governorAddress as `0x${string}`, functionName: 'state', args: [proposalId] },
      { abi: governorAbi, address: governorAddress as `0x${string}`, functionName: 'proposalsMetadata', args: [proposalId] },
      { abi: governorAbi, address: governorAddress as `0x${string}`, functionName: 'proposalVotes', args: [proposalId] },
      { abi: governorAbi, address: governorAddress as `0x${string}`, functionName: 'votesVeto', args: [proposalId] },
      { abi: governorAbi, address: governorAddress as `0x${string}`, functionName: 'votes', args: [proposalId, address] },
      { abi: governorAbi, address: governorAddress as `0x${string}`, functionName: 'voteWeights', args: [proposalId, address] },
    ]
  }, [proposalId, address])

  const { data: proposalResults, refetch } = useReadContracts({
    contracts: proposalCalls,
    query: { enabled: !!proposalId },
  })

  const proposalData: ProposalData | undefined = useMemo(() => {
    if (!proposalResults || proposalResults.length < 6) return undefined
    const votes = proposalResults?.[2]?.result as [bigint, bigint, bigint] | undefined
    return {
      id: proposalId,
      state: proposalResults[0]?.result as number,
      metadata: proposalResults[1]?.result as ProposalData['metadata'],
      votes,
      totalVotes: (votes?.[0] || 0n) + (votes?.[1] || 0n) + (votes?.[2] || 0n) || 1n,
      vetos: proposalResults[3]?.result as bigint,
      myVote: proposalResults[4]?.result as number,
      myVoteWeight: proposalResults[5]?.result as bigint,
    }
  }, [proposalResults, proposalId])

  // Combine vote-related effects into one
  useEffect(() => {
    if (
      proposalData &&
      typeof proposalData.myVoteWeight === 'bigint' &&
      proposalData.myVoteWeight > 0n &&
      proposalData.myVote !== undefined
    ) {
      const currentVote = voteMap[proposalData.myVote as keyof typeof voteMap];
      if (currentVote) {
        setVote(currentVote);
        if (lastSubmittedVote === null) {
          setLastSubmittedVote(currentVote);
        }
      }
    }
  }, [proposalData]);

  // ---------------------------
  // Utility Functions
  // ---------------------------
  const voteOptions = { yes: 1, abstain: 2, no: 0, spam: 3 } as const
  const voteMap = { 0: 'no', 1: 'yes', 2: 'abstain', 3: 'spam' } as const

  function mapState(state: number): { label: string; color: string; bg: string } {
    const map: Record<number, { label: string; color: string; bg: string }> = {
      0: { label: 'Not started', color: 'text-yellow-500', bg: 'bg-yellow-100' },
      1: { label: 'Voting', color: 'text-purple-700', bg: 'bg-purple-100' },
      2: { label: 'Canceled', color: 'text-gray-400', bg: 'bg-gray-100' },
      3: { label: 'Defeated', color: 'text-red-500', bg: 'bg-red-100' },
      4: { label: 'Succeeded', color: 'text-emerald-600', bg: 'bg-emerald-100' },
      7: { label: 'Executed', color: 'text-blue-500', bg: 'bg-blue-100' },
    }
    return map[state] || { label: 'Unknown', color: 'text-gray-500', bg: 'bg-gray-100' }
  }

  function mapTallyState(proposalData: any, govParams: any): { label: string; color: string; bg: string } {
    if (!proposalData || !govParams) {
      return { label: 'Loading...', color: 'text-gray-400', bg: 'bg-gray-100' }
    }
    const state = Number(proposalData.state ?? 0)
    if (state === 0) return { label: 'Not Started', color: 'text-yellow-500', bg: 'bg-yellow-100' }
    if (state === 2) return { label: 'Canceled', color: 'text-gray-400', bg: 'bg-gray-100' }
    const yes = BigInt(proposalData.votes?.[1] || 0n)
    const no = BigInt(proposalData.votes?.[0] || 0n)
    const abstain = BigInt(proposalData.votes?.[2] || 0n)
    const spam = BigInt(proposalData.vetos || 0n)
    const totalVotes = yes + no + abstain
    const quorum = BigInt(proposalData.metadata?.[8] || 0n)
    const vetoThreshold = BigInt(govParams?.[3] || 0n)
    const spamPercent = totalVotes === 0n ? 0n : (spam * 10_000n) / totalVotes

    if (state === 1) {
      if (spamPercent >= vetoThreshold) return { label: 'Being Rejected as Spam', color: 'text-red-700', bg: 'bg-red-100' }
      if (totalVotes < quorum) return { label: 'Quorum Not Reached', color: 'text-gray-600', bg: 'bg-gray-200' }
      return yes > no
        ? { label: 'Passing', color: 'text-green-600', bg: 'bg-green-100' }
        : { label: 'Not Passing', color: 'text-red-600', bg: 'bg-red-100' }
    }
    if (totalVotes < quorum) return { label: 'Quorum Not Reached', color: 'text-gray-600', bg: 'bg-gray-200' }
    if (spamPercent >= vetoThreshold) return { label: 'Rejected as Spam', color: 'text-red-800', bg: 'bg-red-100' }
    return yes > no
      ? { label: 'Passed', color: 'text-green-600', bg: 'bg-green-100' }
      : { label: 'Rejected', color: 'text-red-600', bg: 'bg-red-100' }
  }

  function extendedMarkdownToHtml(md: string): string {
    // Block-level formatting
    md = md
      .replace(/^---$/gm, '<hr />')
      .replace(/^### (.*?)$/gm, '<h3>$1</h3>')
      .replace(/^## (.*?)$/gm, '<h2>$1</h2>')
      .replace(/^# (.*?)$/gm, '<h1>$1</h1>')
      .replace(/(?:^|\n)\s*> (.*?)$/gm, '\n<blockquote>$1</blockquote>')
      .replace(/^- \[ \] (.*)/gm, '<input type="checkbox" disabled /> $1')
      .replace(/^- \[x\] (.*)/gim, '<input type="checkbox" checked disabled /> $1')
    // Inline formatting
    md = md
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/_(.*?)_/g, '<em>$1</em>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-blue-500 underline" target="_blank" rel="noopener noreferrer">$1</a>')
    md = md.replace(/\n/g, '<br />')
    return md.replace(/(<\/(?:h1|h2|h3|blockquote|hr)>)<br \/>/g, '$1')
  }

  const format = (val?: number | bigint, decimals: number = 2): string => {
    if (val === undefined || val === null) return '0'
    const num = typeof val === 'bigint' ? Number(formatUnits(val, 18)) : val
    if (Number.isNaN(num)) return '0'
    const factor = 10 ** decimals
    return (Math.floor(num * factor) / factor).toLocaleString(undefined, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    })
  }

  function getVotingTimeLeft(
    state: number,
    snapshot: bigint,
    latestBlockNumber: bigint,
    votingPeriod: bigint,
    averageBlockTime = 2
  ): { label: string; content: string } {
    switch (state) {
      case 0: {
        const remainingBlocks = snapshot - latestBlockNumber
        if (remainingBlocks <= 0n) return { label: 'Voting', content: 'starts soon' }
        const secondsLeft = Number(remainingBlocks) * averageBlockTime
        const minutes = Math.floor(secondsLeft / 60)
        const hours = Math.floor(minutes / 60)
        if (hours > 0) return { label: 'Starts in', content: `${hours} hour${hours > 1 ? 's' : ''}` }
        if (minutes > 0) return { label: 'Starts in', content: `${minutes} minute${minutes > 1 ? 's' : ''}` }
        return { label: 'Starts in', content: 'less than a minute' }
      }
      case 1: {
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

  function getPercent(part: bigint | undefined, total: bigint | undefined): string {
    if (!total || total === 0n) return '0.00'
    return ((Number(part || 0n) / Number(total)) * 100).toFixed(2)
  }

  // ---------------------------
  // Cancel Proposal Logic
  // ---------------------------
  const handleCancel = async () => {
    const confirmed = confirm('Are you sure you want to cancel this proposal?')
    if (!confirmed || !proposalData?.metadata || !proposalId) return

    let toastId
    try {
      const txHash = await writeContractAsync({
        address: governorAddress,
        abi: governorAbi,
        functionName: 'cancel',
        args: [
          proposalData.metadata[3],
          proposalData.metadata[4],
          proposalData.metadata[5],
          keccak256(toBytes(proposalData.metadata[2])),
        ],
      })
      toastId = toast.loading('Cancelling proposal...')
      if (!publicClient) return
      const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash })
      if (receipt.status === 'success') {
        toast.success('Proposal cancelled!', { id: toastId })
        refetch()
      } else {
        toast.error('Cancellation failed.', { id: toastId })
      }
    } catch (err) {
      console.error('Cancel failed', err)
      toast.error('Failed to cancel proposal', { id: toastId })
    }
  }

  // ---------------------------
  // Dummy ABI for Decoding Contract Calls
  // ---------------------------
  const dummyAbi = [
    { type: 'function', name: 'doNothing', stateMutability: 'nonpayable', inputs: [], outputs: [] },
    { type: 'function', name: 'logTest', stateMutability: 'nonpayable', inputs: [{ name: 'message', type: 'string' }], outputs: [] },
    { type: 'function', name: 'updateValue', stateMutability: 'nonpayable', inputs: [{ name: 'value', type: 'uint256' }], outputs: [] },
    { type: 'function', name: 'pause', stateMutability: 'nonpayable', inputs: [], outputs: [] },
  ]

  // ---------------------------
  // Derived UI Variables
  // ---------------------------
  const isTextProposal =
    proposalData?.metadata &&
    proposalData.metadata[3]?.length === 1 &&
    proposalData.metadata[3]?.[0]?.toLowerCase() === governorAddress.toLowerCase() &&
    proposalData.metadata[4]?.[0] === 0n &&
    proposalData.metadata[5]?.[0] === '0x'

  const status          = mapState(proposalData?.state ?? -1)
  const safeDescription = sanitizeHtml(extendedMarkdownToHtml(String(proposalData?.metadata?.[2] ?? '')))
  const timeInfo        = getVotingTimeLeft(
    proposalData?.state ?? 0,
    BigInt(proposalData?.metadata?.[7] ?? 0),
    BigInt(latestBlock?.number ?? 0),
    BigInt(govParams?.[0] ?? 0)
  )
  const tallyStatus     = mapTallyState(proposalData, govParams)

  // ---------------------------
  // Render UI
  // ---------------------------
  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      {/* Header & Navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-gray-800">
          <button onClick={() => router.back()} className="text-lg hover:text-blue-600">
            <ChevronLeft className="w-5 h-5 stroke-[3] text-gray-800" />
          </button>
          <h1 className="text-2xl font-bold">Proposal details</h1>
        </div>
        {proposalData?.state === 0 && address?.toLowerCase() === proposalData?.metadata?.[0]?.toLowerCase() && (
          <button onClick={handleCancel} className="bg-red-600 hover:bg-red-700 text-white text-sm px-4 py-2 rounded font-semibold">
            Cancel Proposal
          </button>
        )}
      </div>

      {/* Proposal Header */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-2 text-sm text-gray-500">
          <span>
            #{proposalIndex} | {isTextProposal ? 'Text Proposal' : 'Execute Contract'}
          </span>
          <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${status.color} ${status.bg}`}>{status.label}</span>
        </div>
        <h1 className="text-xl font-bold text-gray-900 mb-1">
          {proposalData?.metadata?.[1] || 'Untitled proposal'}
        </h1>
        <div className="mb-5 mt-2">
          <p className="text-xs text-gray-500">
            Submitted at —{' '}
            {proposalData?.metadata?.[6]
              ? new Date(Number(proposalData.metadata[6]) * 1000).toLocaleString(undefined, {
                  dateStyle: 'long',
                  timeStyle: 'short',
                })
              : '...'}
          </p>
        </div>
        <div className="text-sm text-gray-700 leading-relaxed" dangerouslySetInnerHTML={{ __html: safeDescription }} />
        {!isTextProposal && (
          <>
            <h2 className="text-md font-semibold text-gray-800 mt-10">Contract Calls</h2>
            {proposalData?.metadata?.[3]?.map((target, i) => {
              const calldata = proposalData.metadata?.[5]?.[i] ?? '0x'
              let decoded
              try {
                decoded = decodeFunctionData({ abi: dummyAbi, data: calldata })
              } catch (e) {
                decoded = null
              }
              return (
                <div key={i} className="rounded border border-gray-200 bg-gray-50 p-4 space-y-1 text-sm text-gray-800 mt-3">
                  <div>
                    <span className="font-medium text-gray-500">Target:</span>{' '}
                    <code className="break-all text-blue-600">{target}</code>
                  </div>
                  <div>
                    <span className="font-medium text-gray-500">Decoded:</span>{' '}
                    {decoded ? (
                      <code className="text-purple-600">
                        {decoded.functionName}(
                        {Array.isArray(decoded.args)
                          ? decoded.args.map((a, idx) => (
                              <span key={idx}>
                                {idx > 0 && ', '}
                                {JSON.stringify(a)}
                              </span>
                            ))
                          : ''}
                        )
                      </code>
                    ) : (
                      <span className="text-red-500">Unable to decode</span>
                    )}
                  </div>
                </div>
              )
            })}
          </>
        )}
      </div>

      {/* Votes Section */}
      <div className="bg-white rounded-lg shadow p-6 space-y-4">
        <div className="flex items-center justify-between mb-2 text-gray-500">
          <h2 className="text-md font-semibold text-gray-800">Tally</h2>
          <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${tallyStatus.color} ${tallyStatus.bg}`}>{tallyStatus.label}</span>
        </div>
        {proposalData?.state !== 2 && (
          <>
            <div className="text-sm text-gray-600">
              Total voted:{' '}
              <span className="font-semibold text-gray-900">
                {format(proposalData?.totalVotes, 0)} CLOUD
              </span>{' '}
              (
              {format(
                (Number(formatUnits(proposalData?.totalVotes || 0n, 18)) /
                  Number(formatUnits(proposalData?.metadata?.[9] || 1n, 18))) *
                  100,
                2
              )}
              %)
            </div>
            <div className="mt-4 mb-5">
              <div className="relative h-3 bg-gray-200 rounded overflow-hidden flex">
                <div
                  className="h-full bg-green-500"
                  style={{
                    width: `${((Number(proposalData?.votes?.[1] || 0n) / Number(proposalData?.totalVotes || 1n)) * 100).toFixed(2)}%`,
                  }}
                ></div>
                <div
                  className="h-full bg-red-500"
                  style={{
                    width: `${((Number(proposalData?.votes?.[0] || 0n) / Number(proposalData?.totalVotes || 1n)) * 100).toFixed(2)}%`,
                  }}
                ></div>
                <div
                  className="h-full bg-gray-400"
                  style={{
                    width: `${((Number(proposalData?.votes?.[2] || 0n) / Number(proposalData?.totalVotes || 1n)) * 100).toFixed(2)}%`,
                  }}
                ></div>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div className="border rounded p-2 text-center text-green-700 border-green-200">
                <div className="font-semibold">Yes</div>
                <div>{getPercent(proposalData?.votes?.[1], proposalData?.totalVotes)}%</div>
              </div>
              <div className="border rounded p-2 text-center text-red-600 border-red-200">
                <div className="font-semibold">No</div>
                <div>{getPercent(proposalData?.votes?.[0], proposalData?.totalVotes)}%</div>
              </div>
              <div className="border rounded p-2 text-center text-gray-700 border-gray-200">
                <div className="font-semibold">Abstain</div>
                <div>{getPercent(proposalData?.votes?.[2], proposalData?.totalVotes)}%</div>
              </div>
            </div>
            <div className="text-xs text-red-800 font-medium mt-2 text-center">
              Spam: {format((Number(proposalData?.vetos) / Number(proposalData?.totalVotes)) * 100, 2)}%
            </div>
            <div className="text-sm text-gray-500 mt-1 text-center">
              {timeInfo.label} {timeInfo.content}
            </div>
          </>
        )}
        {proposalData?.state === 2 && (
          <p className="text-sm text-center text-gray-500">
            The proposal was cancelled before voting began.
          </p>
        )}
      </div>

      {/* Your Vote Section */}
      <div className="bg-white rounded-lg shadow p-6 space-y-6">
        <h2 className="text-md font-semibold text-gray-800">Your vote</h2>
        {proposalData?.state !== 0 && proposalData?.state !== 2 && (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <button
                onClick={() => setVote('yes')}
                className={`border rounded px-4 py-2 font-semibold ${
                  vote && vote !== 'yes' ? 'opacity-60 hover:opacity-80' : ''
                } ${vote === 'yes' ? 'bg-green-100 border-green-600 text-green-600' : 'text-green-600 border-green-300'}`}
              >
                Yes
              </button>
              <button
                onClick={() => setVote('abstain')}
                className={`border rounded px-4 py-2 font-semibold ${
                  vote && vote !== 'abstain' ? 'opacity-60 hover:opacity-80' : ''
                } ${vote === 'abstain' ? 'bg-blue-100 border-blue-600 text-blue-600' : 'text-blue-600 border-blue-300'}`}
              >
                Abstain
              </button>
              <button
                onClick={() => setVote('no')}
                className={`border rounded px-4 py-2 font-semibold ${
                  vote && vote !== 'no' ? 'opacity-60 hover:opacity-80' : ''
                } ${vote === 'no' ? 'bg-red-100 border-red-600 text-red-600' : 'text-red-600 border-red-300'}`}
              >
                No
              </button>
              <button
                onClick={() => setVote('spam')}
                className={`border rounded px-4 py-2 font-semibold ${
                  vote && vote !== 'spam' ? 'opacity-60 hover:opacity-80' : ''
                } ${vote === 'spam' ? 'bg-red-100 border-red-800 text-red-800' : 'text-red-800 border-red-400'}`}
              >
                Spam
              </button>
            </div>
            <button
              className="w-full bg-blue-600 text-white px-6 py-2 rounded font-semibold hover:bg-blue-700 disabled:opacity-50"
              disabled={
                !vote ||
                isVoting ||
                proposalData?.state !== 1 ||
                (vote === lastSubmittedVote && (proposalData?.myVoteWeight || 0n) > 0n)
              }
              onClick={async () => {
                if (!vote) return alert('Please select a vote option')
                let toastId
                try {
                  setIsVoting(true)
                  const voteValue = voteOptions[vote]
                  const txHash = await writeContractAsync({
                    address: governorAddress,
                    abi: governorAbi,
                    functionName: 'castVote',
                    args: [proposalId, voteValue],
                  })
                  toastId = toast.loading('Submitting your vote...')
                  if (!publicClient) return
                  const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash })
                  if (receipt.status === 'success') {
                    toast.success('Vote submitted!', { id: toastId })
                    refetch()
                    setLastSubmittedVote(vote)
                  } else {
                    toast.error('Vote failed', { id: toastId })
                  }
                } catch (err) {
                  console.error('Vote failed', err)
                  toast.error('Failed to submit vote', { id: toastId })
                } finally {
                  setIsVoting(false)
                }
              }}
            >
              {isVoting ? 'Voting...' : 'Vote'}
            </button>
            <p className="text-xs text-gray-500 text-center italic">
              * Spam: Counts as a NO and slashes the proposer’s deposit if the proposal is rejected.
            </p>
          </>
        )}
        {proposalData?.state === 0 && (
          <p className="text-sm text-center text-gray-500">
            Voting is not active yet for this proposal.
          </p>
        )}
        {proposalData?.state === 2 && (
          <p className="text-sm text-center text-gray-500">
            The proposal was cancelled before voting began.
          </p>
        )}
      </div>
    </div>
  )
}
