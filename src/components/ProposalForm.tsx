'use client';

import { useState } from 'react';
import {
  useWriteContract,
  useChainId,
  useAccount,
  usePublicClient,
  useReadContract,
} from 'wagmi';
import { formatUnits, parseUnits, encodeFunctionData, Abi, isAddress} from 'viem';
import tokenAbi from '@/abi/CloudToken.json';
import governorAbi from '@/abi/CloudGovernor.json';
import { CONTRACTS } from '@/constants/contracts';
import { fetchAbi } from '@/lib/fetchAbi';
import { useAllowanceCheck } from '@/lib/hooks/useAllowanceCheck';
import { toast } from 'react-hot-toast';


type Call = {
  target: string;
  abi: Abi | null;
  fnName: string;
  fnInputs: { name: string; type: string }[];
  args: string[];
};

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
  const [calls, setCalls] = useState<Call[]>([{
    target: '',
    abi: null,
    fnName: '',
    fnInputs: [],
    args: []
  }]);
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

  // ==========================
  // Load ABI for Execute proposal
  // ==========================

  // EIP-1967 implementation slot:
  // keccak256("eip1967.proxy.implementation") − 1
  const IMPLEMENTATION_SLOT =
    '0x360894A13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc';

  const handleLoadAbi = async (idx: number, address: string) => {
    try {
      // 1) fetch whatever ABI Etherscan has for the proxy
      let abi = await fetchAbi(address, chainId);

      // 2) if that ABI has no functions (or only proxy methods),
      //    treat it as a proxy and fetch the implementation
      const hasAppFns = abi.some((item) => item.type === 'function');
      if (!hasAppFns) {
        // read the implementation address from storage

        if (!publicClient) {
          throw new Error('No public client available');
        }

        const raw = await publicClient.getStorageAt({
          address: address as `0x${string}`,
          slot: IMPLEMENTATION_SLOT,
        });

        if (raw === undefined) {
         throw new Error('Failed to read implementation slot');
        }

        // last 20 bytes = implementation address
        const impl = `0x${raw.slice(-40)}`;
        // now re-fetch its real ABI
        abi = await fetchAbi(impl, chainId);
      }

      // 3) update your calls state
      const updated = [...calls];
      updated[idx].target    = address;
      updated[idx].abi       = abi;
      updated[idx].fnName    = '';
      updated[idx].fnInputs  = [];
      updated[idx].args      = [];
      setCalls(updated);
    } catch (err: any) {
      console.error(err);
      toast.error(`Unable to load ABI: ${err.message}`);
    }
  };

  // ------------------------------
  // Handle Form Submission
  // ------------------------------

  const handleSubmit = async () => {

    if (!publicClient) {
      toast.error('Unable to submit: no blockchain client available');
      return;
    }

    if (!title || !description) {
      return alert('Title and description are required');
    }
    if (type === 'execute' && calls.some((c) => !c.target || !c.fnName)) {
      return alert('Each call must have target and function');
    }

    // ← single declarations, up here:
    let targets: string[] = [];
    let values: bigint[] = [];
    let calldatas: `0x${string}`[] = [];

    // ------------------------------
    // Build Execute Calls Data
    // ------------------------------
    if (type === 'execute') {
      for (const call of calls) {
        // double-check just in case:
        if (!call.target || !call.fnName) {
          return alert('Each call must have target and function');
        }

        const parsedArgs = call.args.map((arg) => {
          const s = arg.trim();
          // if the user literally typed [..] or {..}, JSON.parse it
          if (s.startsWith('[') || s.startsWith('{')) {
            try {
              return JSON.parse(s);
            } catch (e) {
              throw new Error(`Invalid JSON for argument "${arg}"`);
            }
          }
          // otherwise just hand the raw string (Viem will convert "123" -> 123, "0x…" -> address)
          return arg;
        });

        const calldata = encodeFunctionData({
          abi: call.abi!,
          functionName: call.fnName,
          args: parsedArgs,
        });

        targets.push(call.target);
        values.push(0n);
        calldatas.push(calldata);
      }
    }

    try {
      setLoading(true);

      // Approve deposit if needed
      if (!isEnough) {
        const tx1 = await writeContractAsync({
          abi: tokenAbi,
          address: token as `0x${string}`,
          functionName: 'approve',
          args: [governorAddress, deposit],
        });
        toast.loading('Approving deposit...');
        await publicClient.waitForTransactionReceipt({ hash: tx1 });
        toast.dismiss();
      }

      // Submit proposal
      const tx2 = await writeContractAsync({
        address: governorAddress,
        abi: governorAbi,
        functionName: 'proposeWithMetadata',
        args:
          type === 'text'
            ? [[governorAddress], [0], ['0x'], title, description]
            : [targets, values, calldatas, title, description],
      });
      const toastId = toast.loading('Waiting for confirmation...');
      const receipt = await publicClient.waitForTransactionReceipt({ hash: tx2 });

      if (receipt.status === 'success') {
        toast.success('Proposal submitted!', { id: toastId });
        onClose();

        await publicClient.getBlock(); // trigger block sync
        await new Promise((r) => setTimeout(r, 1000)); //  slight delay
        await refreshProposalList();
      } else {
        toast.error('Submission failed', { id: toastId });
      }
    } catch (err) {
      console.error(err);
      toast.error('Submission error. Please retry.');
    } finally {
      setLoading(false);
    }
  };


  // ------------------------------
  // Render Form UI
  // ------------------------------
  return (

    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center">
      <div className="relative max-h-[95vh] w-full max-w-2xl overflow-y-auto bg-white rounded-lg p-6 space-y-5">
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
            <option value="execute">Execute Contract</option>
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

        {/* Execute Calls (Conditional) */}
        {type === 'execute' && (
          <>
            {calls.map((call, i) => (
              <div key={i} className="border border-gray-300 rounded p-4 bg-gray-50 mb-2">

                {/* Contract Address */}
                <label className="text-sm font-medium text-gray-700">
                  Contract Address
                </label>
                <input
                  className="w-full mt-1 border bg-white rounded px-3 py-2 text-sm text-gray-900 placeholder-gray-400 border-gray-200 focus:outline-none focus:ring-blue-400 focus:border-blue-400"
                  value={call.target}
                  placeholder="0x..."
                  onChange={e => {
                    const addr = e.target.value;
                    const updated = [...calls];
                    updated[i].target = addr;

                    // is it a 0x-prefixed 40-hex chars address?
                    const valid = isAddress(addr) 
                      // OR: /^0x[a-fA-F0-9]{40}$/.test(addr)
                    ;
                    
                    if (valid) {
                      // load the ABI for this slot
                      handleLoadAbi(i, addr);
                    } else {
                      // clear everything so fn‐selector + args hide
                      updated[i].abi      = null;
                      updated[i].fnName   = '';
                      updated[i].fnInputs = [];
                      updated[i].args     = [];
                    }

                    setCalls(updated);
                  }}
                />

                {/* Function selector (once ABI is loaded) */}
                {call.abi && (
                  <>
                    <label className="mt-4 block text-sm font-medium text-gray-700">
                      Function
                    </label>
                    <select
                      className="w-full mt-1 border bg-white rounded px-3 py-2 text-sm text-gray-900 placeholder-gray-400 border-gray-200 focus:outline-none focus:ring-blue-400 focus:border-blue-400"
                      value={call.fnName}
                      onChange={e => {
                        const fnName = e.target.value;
                        const fnDef = call.abi!.find(
                          f => f.type === 'function' && f.name === fnName
                        );
                        const inputs = fnDef && 'inputs' in fnDef
                          ? fnDef.inputs.map(inp => ({ name: inp.name || '', type: inp.type }))
                          : [];

                        const updated = [...calls];
                        updated[i].fnName    = fnName;
                        updated[i].fnInputs  = inputs;
                        updated[i].args      = inputs.map(() => '');
                        setCalls(updated);
                      }}
                    >
                      <option value="">-- select --</option>
                      {call.abi
                        .filter(f => f.type === 'function')
                        .map((f, idx) => (
                          <option key={idx} value={f.name}>
                            {f.name}
                          </option>
                        ))}
                    </select>
                  </>
                )}

                {/* Argument inputs */}
                {call.fnInputs.length > 0 && (
                  <div className="mt-2 space-y-2 ">
                    {call.fnInputs.map((input, idx) => (
                      <div key={idx}>
                        <label className="text-sm text-gray-700">
                          {input.name || `arg${idx}`} ({input.type})
                        </label>
                        <input
                          className="w-full mt-1 border bg-white rounded px-3 py-2 text-sm text-gray-900 placeholder-gray-400 border-gray-200 focus:outline-none focus:ring-blue-400 focus:border-blue-400"
                          value={call.args[idx]}
                          onChange={e => {
                            const updated = [...calls];
                            updated[i].args[idx] = e.target.value;
                            setCalls(updated);
                          }}
                        />
                      </div>
                    ))}
                  </div>
                )}

                {/* Remove / Add buttons */}
                <div className="flex justify-between mt-3">
                  {calls.length > 1 && (
                    <button
                      className="text-red-600 hover:underline"
                      onClick={() => {
                        const updated = [...calls];
                        updated.splice(i, 1);
                        setCalls(updated);
                      }}
                    >
                      Remove Call
                    </button>
                  )}
                  {i === calls.length - 1 && (
                    <button
                      className="text-blue-600 hover:underline"
                      onClick={() =>
                        setCalls([
                          ...calls,
                          { target: '', abi: null, fnName: '', fnInputs: [], args: [] },
                        ])
                      }
                    >
                      + Add Call
                    </button>
                  )}
                </div>

              </div>
            ))}

          </>
        )}

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
