'use client';

import { useState } from 'react';
import {
  useWriteContract,
  useChainId,
  useAccount,
  usePublicClient,
  useReadContract,
} from 'wagmi';
import { formatUnits, parseUnits, encodeFunctionData } from 'viem';
import tokenAbi from '@/abi/CloudToken.json';
import governorAbi from '@/abi/CloudGovernor.json';
import { CONTRACTS } from '@/constants/contracts';
import { useAllowanceCheck } from '@/lib/hooks/useAllowanceCheck';
import { toast } from 'react-hot-toast';

export default function ProposalForm({
  onClose,
  refreshProposalList,
}: {
  onClose: () => void;
  refreshProposalList: () => Promise<void>;
}) {
  // ------------------------------
  // Component State
  // ------------------------------
  const [type, setType] = useState<'text' | 'execute'>('text');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [calls, setCalls] = useState([{ target: '', fnName: '', args: '' }]);
  const [loading, setLoading] = useState(false);

  // ------------------------------
  // Blockchain & Contract Setup
  // ------------------------------
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const chainId = useChainId();
  type ChainId = keyof typeof CONTRACTS.STAKING_ADDRESSES;
  const token = CONTRACTS.TOKEN_ADDRESSES[chainId as ChainId];
  const governorAddress = CONTRACTS.GOVERNOR_ADDRESSES[chainId as ChainId];
  const { writeContractAsync } = useWriteContract();
  const deposit = parseUnits('10000', 18);
  const { isEnough } = useAllowanceCheck(address, governorAddress, deposit, chainId);

  // ------------------------------
  // Gov Params
  // ------------------------------
  const { data: govParams } = useReadContract({
    abi: governorAbi,
    address: governorAddress as `0x${string}`,
    functionName: 'getGovernanceParams',
    query: {},
  }) as { data: [bigint, bigint, bigint, bigint, bigint] | undefined };

  // ------------------------------
  // Helper Functions
  // ------------------------------
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

  // ------------------------------
  // Dummy ABI for Execute Calls
  // ------------------------------
  const dummyAbi = [
    {
      type: 'function',
      name: 'doNothing',
      stateMutability: 'nonpayable',
      inputs: [],
      outputs: [],
    },
    {
      type: 'function',
      name: 'logTest',
      stateMutability: 'nonpayable',
      inputs: [{ name: 'message', type: 'string' }],
      outputs: [],
    },
    {
      type: 'function',
      name: 'updateValue',
      stateMutability: 'nonpayable',
      inputs: [{ name: 'value', type: 'uint256' }],
      outputs: [],
    },
    {
      type: 'function',
      name: 'pause',
      stateMutability: 'nonpayable',
      inputs: [],
      outputs: [],
    },
  ];

  // ------------------------------
  // Handle Form Submission
  // ------------------------------
  let toastId2: string;
  const handleSubmit = async () => {
    if (!title || !description) {
      return alert('Title and description are required');
    }
    if (type === 'execute' && calls.some((c) => !c.target || !c.fnName)) {
      return alert('Each call must have target and function');
    }

    let targets: string[] = [];
    let values: bigint[] = [];
    let calldatas: `0x${string}`[] = [];

    // ------------------------------
    // Build Execute Calls Data
    // ------------------------------
    if (type === 'execute') {
      try {
        for (const call of calls) {
          const parsedArgs = call.args ? JSON.parse(call.args) : [];
          const calldata = encodeFunctionData({
            abi: dummyAbi, // Insert your target contract ABI here dynamically or statically
            functionName: call.fnName,
            args: parsedArgs,
          });
          targets.push(call.target);
          values.push(0n);
          calldatas.push(calldata);
        }
      } catch (err) {
        console.error(err);
        return alert('Invalid function arguments. Use valid JSON.');
      }
    }

    try {
      setLoading(true);

      // ------------------------------
      // Approve Deposit (if needed)
      // ------------------------------
      if (!isEnough) {
        const txHash1 = await writeContractAsync({
          abi: tokenAbi,
          address: token as `0x${string}`,
          functionName: 'approve',
          args: [governorAddress, deposit],
        });

        toast.loading('Processing transaction 1 of 2...');
        if (!publicClient) return;
        await publicClient.waitForTransactionReceipt({ hash: txHash1 });
        toast.dismiss();
      }

      // ------------------------------
      // Submit Proposal
      // ------------------------------
      const txHash2 = await writeContractAsync({
        address: governorAddress,
        abi: governorAbi,
        functionName: 'proposeWithMetadata',
        args:
          type === 'text'
            ? [[governorAddress], [0], ['0x'], title, description]
            : [targets, values, calldatas, title, description],
      });

      toastId2 = toast.loading('Waiting for confirmation...');
      if (!publicClient) return;
      const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash2 });

      if (receipt.status === 'success') {
        toast.success(
          <>
            Transaction confirmed! <br />
            Proposal submitted.
          </>,
          { id: toastId2 }
        );
        onClose();
        await refreshProposalList();
      } else {
        toast.error('Submission failed', { id: toastId2 });
      }
    } catch (err) {
      console.error('Submission failed', err);
      toast.error('Submission failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ------------------------------
  // Render Form UI
  // ------------------------------
  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl space-y-5 overflow-y-auto max-l-[95vh]">
        <h2 className="text-xl font-bold text-gray-900">New Proposal</h2>

        {/* Proposal Type */}
        <div>
          <label className="text-sm font-medium text-gray-700">Proposal Type</label>
          <select
            className="w-full mt-1 border rounded px-3 py-2 text-sm text-gray-900 placeholder-gray-400 border-gray-200 focus:outline-none focus:ring-blue-400 focus:border-blue-400"
            value={type}
            onChange={(e) => setType(e.target.value as 'text' | 'execute')}
          >
            <option value="text">Text Proposal</option>
            <option value="execute" disabled>
              Execute Contract (coming soon)
            </option>
          </select>
        </div>

        {/* Title */}
        <div>
          <label className="text-sm font-medium text-gray-700">Title</label>
          <input
            className="w-full mt-1 border rounded px-3 py-2 text-sm text-gray-900 placeholder-gray-400 border-gray-200 focus:outline-none focus:ring-blue-400 focus:border-blue-400"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Proposal Title"
            maxLength={100}
          />
        </div>

        {/* Description */}
        <div>
          <label className="text-sm font-medium text-gray-700">Description</label>
          <textarea
            className="w-full mt-1 border rounded px-3 py-2 text-sm text-gray-900 placeholder-gray-400 h-50 border-gray-200 focus:outline-none focus:ring-blue-400 focus:border-blue-400"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Detailed explanation..."
            maxLength={2000}
          />
          <p className="text-xs text-gray-500 mt-1">
            Supports <span className="font-medium">Markdown</span> formatting.
          </p>
        </div>

        {/* Deposit Info */}
        <div>
          <label className="text-sm font-medium text-gray-700">Deposit</label>
          <input
            type="text"
            disabled
            value={
              govParams
                ? format(BigInt(govParams?.[1]) * 10n ** 18n) + ' CLOUD'
                : 'loading ...'
            }
            className="w-full mt-1 border rounded px-3 py-2 text-sm placeholder-gray-400 border-gray-200 text-gray-500 bg-gray-100 cursor-not-allowed"
          />
          <p className="text-xs text-gray-500 mt-1">
            This deposit is returned after voting ends, unless the proposal is vetoed.
          </p>
        </div>

        {/* Execute Calls (Conditional) */}
        {type === 'execute' && (
          <>
            {calls.map((call, i) => (
              <div
                key={i}
                className="border border-gray-300 rounded p-4 bg-gray-50 mb-2"
              >
                <div className="mb-2">
                  <label className="text-sm font-medium text-gray-700">
                    Contract Address
                  </label>
                  <input
                    className="w-full mt-1 border bg-white rounded px-3 py-2 text-sm text-gray-900 placeholder-gray-400 border-gray-200 focus:outline-none focus:ring-blue-400 focus:border-blue-400"
                    value={call.target}
                    onChange={(e) => {
                      const updated = [...calls];
                      updated[i].target = e.target.value;
                      setCalls(updated);
                    }}
                    placeholder="0x..."
                  />
                </div>

                <div className="mb-2">
                  <label className="text-sm font-medium text-gray-700">
                    Function Name
                  </label>
                  <input
                    className="w-full mt-1 border bg-white rounded px-3 py-2 text-sm text-gray-900 placeholder-gray-400 border-gray-200 focus:outline-none focus:ring-blue-400 focus:border-blue-400"
                    value={call.fnName}
                    onChange={(e) => {
                      const updated = [...calls];
                      updated[i].fnName = e.target.value;
                      setCalls(updated);
                    }}
                    placeholder="transferOwnership"
                  />
                </div>

                <div className="mb-2">
                  <label className="text-sm font-medium text-gray-700">
                    Function Args (JSON)
                  </label>
                  <input
                    className="w-full mt-1 border bg-white rounded px-3 py-2 text-sm text-gray-900 placeholder-gray-400 border-gray-200 focus:outline-none focus:ring-blue-400 focus:border-blue-400"
                    value={call.args}
                    onChange={(e) => {
                      const updated = [...calls];
                      updated[i].args = e.target.value;
                      setCalls(updated);
                    }}
                    placeholder='["0x123..."]'
                  />
                </div>

                {calls.length > 1 && (
                  <button
                    className="text-sm text-red-600 hover:underline mt-1"
                    onClick={() => {
                      const updated = [...calls];
                      updated.splice(i, 1);
                      setCalls(updated);
                    }}
                  >
                    Remove This Call
                  </button>
                )}
              </div>
            ))}

            <button
              className="text-sm text-blue-600 hover:underline"
              onClick={() =>
                setCalls([...calls, { target: '', fnName: '', args: '' }])
              }
            >
              + Add Another Call
            </button>
          </>
        )}

        {/* Form Actions */}
        <div className="flex justify-end space-x-3 pt-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 bg-gray-100 rounded hover:bg-gray-200"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Submitting...' : 'Submit'}
          </button>
        </div>
      </div>
    </div>
  );
}
