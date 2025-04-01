'use client'

import { useParams } from 'next/navigation'
import { useReadContract, useWriteContract, useAccount, useChainId} from 'wagmi'
import { CONTRACTS } from '@/constants/contracts'
import governorAbi from '@/abi/CloudGovernor.json'
import { parseUnits } from 'viem'

export default function ProposalPage() {
  const { proposalId } = useParams()
  const { address } = useAccount()
  const parsedId = BigInt(proposalId)

  const chainId         = useChainId();
  type ChainId          = keyof typeof CONTRACTS.STAKING_ADDRESSES;
  const governorAddress = CONTRACTS.GOVERNOR_ADDRESSES[chainId as ChainId];

  const { data: metadata } = useReadContract({
    abi: governorAbi,
    address: governorAddress as `0x${string}`,
    functionName: 'proposalsMetadata',
    args: [parsedId],
  })

  const { writeContract, isPending } = useWriteContract()

  const handleVote = (support: 0 | 1 | 2) => {
    writeContract({
      abi: governorAbi,
      address: governorAddress,
      functionName: 'castVote',
      args: [parsedId, support],
    })
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">


        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-800">&lt;- Proposal details</h1>
          <button
            onClick={() => setShowModal(true)}
            className="px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 text-sm font-semibold"
          >
            Cancel
          </button>
        </div>

      {/* Proposal header */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-2 text-sm text-gray-500">
          <span>#{proposalId} | Text proposal</span>
          <span className="text-emerald-600 font-medium">Passed</span> {/* Replace with dynamic status */}
        </div>

        <h1 className="text-xl font-bold text-gray-900 mb-1">
          {metadata?.[0] || 'Untitled proposal'}
        </h1>

        <p className="text-sm text-gray-500 mb-4">
          Submitted 8 days ago {/* Replace with relative timestamp */}
        </p>

        <p className="text-gray-700 text-sm whitespace-pre-line">
          {metadata && metadata[1] ? metadata?.[1] : 'Proposal description' }
        </p>
      </div>

      {/* Votes */}
      <div className="bg-white rounded-lg shadow p-6 space-y-4">
        <h2 className="text-md font-semibold text-gray-800">Votes</h2>

        <div className="text-sm text-gray-600">
          Total voted: <span className="font-semibold text-gray-900">512,200,685,696</span> (88.56%) {/* dynamic */}
        </div>

        <div className="mt-4 mb-5">
          <div className="relative h-3 bg-gray-200 rounded overflow-hidden">
            <div
              className="absolute left-0 top-0 h-full bg-green-500"
              style={{ width: '88.56%' }} // ← dynamic %
            ></div>
          </div>
          <div className="text-xs text-gray-500 mt-1">
            Pass threshold: 578.36B
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 text-sm">
          <div className="border rounded p-2 text-center text-green-700 border-green-200">
            <div className="font-semibold">Yes</div>
            <div>5.05%</div>
          </div>
          <div className="border rounded p-2 text-center text-red-600 border-red-200">
            <div className="font-semibold">No</div>
            <div>3.99%</div>
          </div>
          <div className="border rounded p-2 text-center text-gray-700 border-gray-200">
            <div className="font-semibold">Abstain</div>
            <div>90.62%</div>
          </div>
        </div>
      

        {/* No with veto displayed separately */}
        <div className="text-xs text-yellow-600 font-medium mt-2">
          No with veto: 0.34%
        </div>

        <div className="text-xs text-gray-500 mt-1">
          Ended 12 hours ago
        </div>
      </div>




      <div className="bg-white rounded-lg shadow p-6 mt-8 space-y-6">
        <h2 className="text-md font-semibold text-gray-800">Your vote</h2>
        {/* Vote options */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <button className="border border-green-200 text-green-600 font-semibold py-2 rounded hover:bg-green-50">
            Yes
          </button>
          <button className="border border-blue-200 text-blue-600 font-semibold py-2 rounded hover:bg-blue-50">
            Abstain
          </button>
          <button className="border border-red-200 text-red-600 font-semibold py-2 rounded hover:bg-red-50">
            No
          </button>
          <button className="border border-yellow-200 text-yellow-600 font-semibold py-2 rounded leading-snug hover:bg-yellow-50">
            No (Spam) *
          </button>
        </div>

        <p className="text-xs text-gray-500 text-center italic">
          * Vote will slash the proposer’s deposit if the proposal is rejected.
        </p>

        {/* Warning message */}
        <p className="text-xs text-gray-500 text-center italic">
          ⚠️ Votes cannot be changed. If in doubt, wait before voting.
        </p>

        {/* Submit */}
        <button
          className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded font-semibold transition"
          disabled={false} // dynamically toggle based on selection
        >
          Submit
        </button>
      </div>



    </div>

  )
}
