import { NextRequest, NextResponse } from 'next/server'
import { createPublicClient, http } from 'viem'
import { base, baseSepolia } from 'viem/chains'
import { CONTRACTS } from '@/constants/contracts'
import governorAbi from '@/abi/CloudGovernor.json'
import fs from 'fs'
import path from 'path'

const CHAINS = {
  base,
  baseSepolia
}

function loadLastProposal(chainId: number): number {
  const filePath = path.resolve(process.cwd(), `data/lastProposal.${chainId}.json`)
  try {
    const raw = fs.readFileSync(filePath, 'utf-8')
    const data = JSON.parse(raw)
    return typeof data.lastIndex === 'number' ? data.lastIndex : 0
  } catch {
    return 0
  }
}

function saveLastProposal(chainId: number, data: { lastIndex: number }) {
  const filePath = path.resolve(process.cwd(), `data/lastProposal.${chainId}.json`)
  if (!fs.existsSync(path.dirname(filePath))) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true })
  }
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8')
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const chainParam = searchParams.get('chain') || 'base'

    const chain = CHAINS[chainParam as keyof typeof CHAINS]
    if (!chain) {
      return NextResponse.json({ error: `Unknown chain: ${chainParam}` }, { status: 400 })
    }

    const governorAddress = CONTRACTS.GOVERNOR_ADDRESSES[chain.id]
    if (!governorAddress) {
      return NextResponse.json({ error: `Governor address not defined for ${chain.name}` }, { status: 400 })
    }

    const client = createPublicClient({ chain, transport: http() })

    const pageSize = 10n
    let savedStart = loadLastProposal(chain.id)
    let start = BigInt(savedStart)
    let proposals: readonly bigint[] = []
    let latestProposalId: bigint | null = null

    console.log(`Fetching proposals on chain: ${chain.name}, starting from index: ${savedStart}`)

    while (true) {
      try {
          proposals = await client.readContract({
          address: governorAddress,
          abi: governorAbi,
          functionName: 'getProposalsPaginated',
          args: [start, pageSize],
        })

        if (proposals.length === 0) break

        latestProposalId = proposals[proposals.length - 1]
        start += pageSize

        if (proposals.length < Number(pageSize)) break

      } catch (err: any) {
        if (
          err.shortMessage?.includes('Start index out of bounds') ||
          err.message?.includes('Start index out of bounds')
        ) {
          break
        }
        throw err
      }
    }


    const lastIndex = latestProposalId === null ? 0 : Number(start - pageSize + BigInt(proposals.length) - 1n)
    console.log(lastIndex);

    if(lastIndex != savedStart) saveLastProposal(chain.id, { lastIndex })

    return NextResponse.json({
      lastIndex,
      chain: chain.name,
    })
  } catch (err) {
    console.error('Error in /api/proposals/latest:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
