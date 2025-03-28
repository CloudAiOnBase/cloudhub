import { useReadContract } from 'wagmi';
import tokenAbi from '@/abi/CloudToken.json';
import { CONTRACTS } from '@/constants/contracts';

export function useAllowanceCheck(
  user: string | undefined,
  spender: string,
  amount: bigint,
  chainId: number
) {

  type ChainId = keyof typeof CONTRACTS.STAKING_ADDRESSES;
  const tokenAddress = CONTRACTS.TOKEN_ADDRESSES[chainId as ChainId];

  const { data, isLoading } = useReadContract({
    abi: tokenAbi,
    address: tokenAddress as `0x${string}`,
    functionName: 'allowance',
    args: [user as `0x${string}`, spender as `0x${string}`],
    query: {
      enabled: !!user && !!spender,
    },
  });

  const allowance = data as bigint | undefined;
  const isEnough = allowance !== undefined && allowance >= amount;

  return { allowance, isEnough, isLoading };
}

