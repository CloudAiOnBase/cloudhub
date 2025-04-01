'use client';

import { useEffect, useState } from 'react';
import { useChainId, usePublicClient } from 'wagmi';


function useBlockTimestamp(blockNumber?: bigint) {
	const publicClient = usePublicClient()
	const [timestamp, setTimestamp] = useState<number | null>(null)

	useEffect(() => {
	  if (!blockNumber || blockNumber <= 0n) return

	  async function fetchBlock() {
	    try {
	      const block = await publicClient.getBlock({ blockNumber })
	      setTimestamp(Number(block.timestamp))
	    } catch (err) {
	      console.error(`Failed to fetch block ${blockNumber.toString()}:`, err)
	    }
	  }

	  fetchBlock()
	}, [blockNumber?.toString()])

	return timestamp
}

export function ProposalSubmittedDate({ blockNumber }: { blockNumber: bigint }) {
const timestamp = useBlockTimestamp(blockNumber)

return (
  <p className="text-xs text-gray-500">
    Submitted at —{' '}
    {timestamp
      ? new Date(timestamp * 1000).toLocaleString()
      : '...'}
  </p>
)
}